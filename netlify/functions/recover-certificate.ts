import { timingSafeEqual } from 'node:crypto';
import { buildCertificateLetterNumber, getEventId } from './_shared/config';
import {
  certificateFileName,
  generateCertificatePdf,
} from './_shared/certificate';
import {
  errorResponse,
  handleErrors,
  jsonResponse,
  methodNotAllowed,
  readJson,
} from './_shared/http';
import {
  CERTIFICATE_BUCKET,
  SIGNED_URL_TTL_SECONDS,
  getSupabaseAdmin,
  isMissingSupabaseConfig,
} from './_shared/supabase';
import { parseRecoveryBody } from './_shared/validation';

/**
 * FUNGSI PEMULIHAN UNTUK OPERATOR (bukan untuk peserta).
 * Dipakai bila feedback tersimpan tetapi pembuatan/unggah PDF gagal.
 * Butuh header x-recovery-token yang sama dengan CERTIFICATE_RECOVERY_TOKEN.
 */
function isAuthorized(provided: string | null): boolean {
  const expected = process.env.CERTIFICATE_RECOVERY_TOKEN?.trim();
  if (!expected || !provided) return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

function safePathPart(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '-');
}

export default handleErrors(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return methodNotAllowed();

  if (!isAuthorized(request.headers.get('x-recovery-token'))) {
    return errorResponse('Akses pemulihan tidak diizinkan.', 401, 'UNAUTHORIZED');
  }
  if (isMissingSupabaseConfig()) {
    return errorResponse('Layanan belum siap. Silakan hubungi penyelenggara.', 503, 'SERVICE_UNAVAILABLE');
  }

  let payload: { nim: string; certificateNumber: string };
  try {
    payload = parseRecoveryBody(await readJson(request));
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Data tidak valid.', 400, 'INVALID_INPUT');
  }

  const eventId = getEventId();

  try {
    const supabase = getSupabaseAdmin();
    const { data: submission, error: lookupError } = await supabase
      .from('feedback_submissions')
      .select('id, nim, full_name, certificate_number, certificate_path, certificate_generated_at')
      .eq('event_id', eventId)
      .eq('nim', payload.nim)
      .eq('certificate_number', payload.certificateNumber)
      .maybeSingle();

    if (lookupError) {
      console.error('[recover-certificate] Lookup failed:', lookupError);
      return errorResponse('Layanan sedang terganggu. Silakan coba lagi.', 503, 'DATABASE_ERROR');
    }
    if (!submission) {
      return errorResponse('Data submission tidak ditemukan.', 404, 'SUBMISSION_NOT_FOUND');
    }

    const letterNumber = buildCertificateLetterNumber(submission.certificate_number);
    const storagePath =
      submission.certificate_path ||
      `${safePathPart(eventId)}/${safePathPart(letterNumber)}.pdf`;

    if (!submission.certificate_path || !submission.certificate_generated_at) {
      const pdfBytes = await generateCertificatePdf({
        letterNumber,
        fullName: submission.full_name,
      });

      const { error: uploadError } = await supabase.storage
        .from(CERTIFICATE_BUCKET)
        .upload(storagePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        });
      if (uploadError) {
        console.error('[recover-certificate] Upload failed:', uploadError);
        return errorResponse('Gagal mengunggah sertifikat. Silakan coba lagi.', 503, 'UPLOAD_ERROR');
      }

      const { error: updateError } = await supabase
        .from('feedback_submissions')
        .update({
          certificate_path: storagePath,
          certificate_generated_at: new Date().toISOString(),
        })
        .eq('id', submission.id);
      if (updateError) {
        console.error('[recover-certificate] Update failed:', updateError);
        return errorResponse('Layanan sedang terganggu. Silakan coba lagi.', 503, 'DATABASE_ERROR');
      }
      console.info(`[recover-certificate] Certificate repaired for ${submission.certificate_number}`);
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(CERTIFICATE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, {
        download: certificateFileName(letterNumber),
      });
    if (signError || !signed?.signedUrl) {
      console.error('[recover-certificate] Signed URL failed:', signError);
      return errorResponse('Layanan sedang terganggu. Silakan coba lagi.', 503, 'SIGNED_URL_ERROR');
    }

    return jsonResponse({
      recovered: true,
      certificate: {
        number: submission.certificate_number,
        letterNumber,
        url: signed.signedUrl,
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
      },
    });
  } catch (error) {
    console.error('[recover-certificate] Unexpected error:', error);
    return errorResponse('Layanan sedang terganggu. Silakan coba lagi.', 503, 'SERVICE_UNAVAILABLE');
  }
});
