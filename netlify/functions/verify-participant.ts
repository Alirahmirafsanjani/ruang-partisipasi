import { EVENT, buildCertificateLetterNumber, getEventId } from './_shared/config';
import { certificateFileName, generateCertificatePdf } from './_shared/certificate';
import { isRegisteredNim } from './_shared/participants';
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
import { parseVerifyBody } from './_shared/validation';

function safePathPart(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '-');
}

export default handleErrors(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return methodNotAllowed();

  let nim: string;
  let fullName: string;
  try {
    const identity = parseVerifyBody(await readJson(request));
    nim = identity.nim;
    fullName = identity.fullName;
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Data verifikasi tidak valid.',
      400,
      'INVALID_INPUT',
    );
  }

  try {
    const registered = await isRegisteredNim(nim);
    if (!registered) {
      return errorResponse(
        'NIM tidak ditemukan dalam daftar peserta kegiatan ini.',
        404,
        'PARTICIPANT_NOT_FOUND',
      );
    }
  } catch (error) {
    console.error('[verify-participant] Participant source failed:', error);
    return errorResponse('Layanan sedang terganggu. Silakan coba lagi.', 503, 'PARTICIPANT_SOURCE_ERROR');
  }

  const participant = { nim, fullName };

  if (isMissingSupabaseConfig()) {
    console.error('[verify-participant] Supabase environment variables are missing.');
    return errorResponse('Layanan belum siap. Silakan hubungi penyelenggara.', 503, 'SERVICE_UNAVAILABLE');
  }

  try {
    const supabase = getSupabaseAdmin();
    const eventId = getEventId();
    const { data: existing, error } = await supabase
      .from('feedback_submissions')
      .select('id, nim, full_name, certificate_number, certificate_path, certificate_generated_at, submitted_at')
      .eq('event_id', eventId)
      .eq('nim', nim)
      .maybeSingle();

    if (error) {
      console.error('[verify-participant] Database lookup failed:', error);
      return errorResponse('Layanan sedang terganggu. Silakan coba lagi.', 503, 'DATABASE_ERROR');
    }

    if (existing) {
      const letterNumber = buildCertificateLetterNumber(existing.certificate_number);
      const storagePath =
        existing.certificate_path || `${safePathPart(eventId)}/${safePathPart(letterNumber)}.pdf`;

      let certificateUrl: string | null = null;
      try {
        // Selalu regenerate agar template terbaru terpakai saat peserta unduh ulang.
        const pdfBytes = await generateCertificatePdf({
          letterNumber,
          fullName: existing.full_name,
        });
        const { error: uploadError } = await supabase.storage
          .from(CERTIFICATE_BUCKET)
          .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });
        if (uploadError) throw uploadError;
        const { error: updateError } = await supabase
          .from('feedback_submissions')
          .update({
            certificate_path: storagePath,
            certificate_generated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (updateError) throw updateError;

        const { data: signed, error: signError } = await supabase.storage
          .from(CERTIFICATE_BUCKET)
          .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, {
            download: certificateFileName(letterNumber),
          });
        if (signError || !signed?.signedUrl) throw signError ?? new Error('Signed URL tidak tersedia.');
        certificateUrl = signed.signedUrl;
      } catch (certError) {
        console.error('[verify-participant] Failed to prepare existing certificate:', certError);
      }

      return jsonResponse({
        verified: true,
        alreadySubmitted: true,
        participant: { nim: existing.nim, fullName: existing.full_name },
        event: {
          title: EVENT.title,
          dateLabel: EVENT.dateLabel,
          organizer: EVENT.organizer,
        },
        feedback: {
          submitted: true,
          submittedAt: existing.submitted_at,
        },
        certificate: {
          number: existing.certificate_number,
          letterNumber,
          ready: certificateUrl !== null,
          url: certificateUrl,
          expiresInSeconds: certificateUrl ? SIGNED_URL_TTL_SECONDS : null,
        },
      });
    }

    return jsonResponse({
      verified: true,
      alreadySubmitted: false,
      participant: { nim: participant.nim, fullName: participant.fullName },
      event: {
        title: EVENT.title,
        dateLabel: EVENT.dateLabel,
        organizer: EVENT.organizer,
      },
    });
  } catch (error) {
    console.error('[verify-participant] Unexpected error:', error);
    return errorResponse('Layanan sedang terganggu. Silakan coba lagi.', 503, 'SERVICE_UNAVAILABLE');
  }
});
