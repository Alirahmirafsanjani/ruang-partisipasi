import {
  buildCertificateLetterNumber,
  getCertificatePrefix,
  getEventId,
  type Participant,
} from './_shared/config';
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
import {
  parseSubmitIdentity,
  requireRegisteredParticipant,
  validateAnswers,
} from './_shared/validation';

function safePathPart(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '-');
}

export default handleErrors(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return methodNotAllowed();

  if (isMissingSupabaseConfig()) {
    console.error('[submit-feedback] Supabase environment variables are missing.');
    return errorResponse('Layanan belum siap. Silakan hubungi penyelenggara.', 503, 'SERVICE_UNAVAILABLE');
  }

  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Format JSON tidak valid.',
      400,
      'INVALID_INPUT',
    );
  }

  let nim: string;
  let fullName: string;
  let answers: Record<string, string | number>;
  try {
    const identity = parseSubmitIdentity(body);
    nim = identity.nim;
    fullName = identity.fullName;
    answers = validateAnswers(body);
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Data yang dikirim tidak valid.',
      400,
      'INVALID_INPUT',
    );
  }

  let participant: Participant;
  try {
    // NIM divalidasi ke sheet/config; nama sudah divalidasi dari input peserta.
    participant = await requireRegisteredParticipant(nim, fullName);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('NIM tidak ditemukan')) {
      return errorResponse(message, 400, 'INVALID_INPUT');
    }
    console.error('[submit-feedback] Participant source failed:', error);
    return errorResponse('Layanan sedang terganggu. Silakan coba lagi.', 503, 'PARTICIPANT_SOURCE_ERROR');
  }

  const eventId = getEventId();

  try {
    const supabase = getSupabaseAdmin();

    const { data: existing, error: lookupError } = await supabase
      .from('feedback_submissions')
      .select('id')
      .eq('event_id', eventId)
      .eq('nim', nim)
      .maybeSingle();

    if (lookupError) {
      console.error('[submit-feedback] Duplicate check failed:', lookupError);
      return errorResponse('Layanan sedang terganggu. Silakan coba lagi.', 503, 'DATABASE_ERROR');
    }
    if (existing) {
      return errorResponse(
        'Feedback untuk NIM ini sudah pernah dikirim. Pengiriman ulang tidak diperbolehkan.',
        409,
        'ALREADY_SUBMITTED',
      );
    }

    // Nomor dibuat oleh database (RPC) dengan row lock, aman untuk request bersamaan.
    const { data: certificateNumber, error: rpcError } = await supabase.rpc(
      'allocate_certificate_number',
      { p_event_id: eventId, p_prefix: getCertificatePrefix() },
    );
    if (rpcError || typeof certificateNumber !== 'string') {
      console.error('[submit-feedback] Certificate number allocation failed:', rpcError);
      return errorResponse('Layanan sedang terganggu. Silakan coba lagi.', 503, 'NUMBER_ALLOCATION_ERROR');
    }

    // Nomor surat yang tercetak di template: 038.001/B/SERT/HIMSI/UAA/XI/2026
    const letterNumber = buildCertificateLetterNumber(certificateNumber);

    const { data: submission, error: insertError } = await supabase
      .from('feedback_submissions')
      .insert({
        event_id: eventId,
        nim,
        full_name: participant.fullName,
        answers,
        certificate_number: certificateNumber,
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return errorResponse(
          'Feedback untuk NIM ini sudah pernah dikirim. Pengiriman ulang tidak diperbolehkan.',
          409,
          'ALREADY_SUBMITTED',
        );
      }
      console.error('[submit-feedback] Insert failed:', insertError);
      return errorResponse('Layanan sedang terganggu. Silakan coba lagi.', 503, 'DATABASE_ERROR');
    }

    // Feedback sudah tersimpan. Kegagalan PDF berikutnya TIDAK menghapus feedback.
    let certificateUrl: string | null = null;
    try {
      const pdfBytes = await generateCertificatePdf({
        letterNumber,
        fullName: participant.fullName,
      });

      const storagePath = `${safePathPart(eventId)}/${safePathPart(letterNumber)}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from(CERTIFICATE_BUCKET)
        .upload(storagePath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: false,
        });
      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from('feedback_submissions')
        .update({
          certificate_path: storagePath,
          certificate_generated_at: new Date().toISOString(),
        })
        .eq('id', submission.id);
      if (updateError) throw updateError;

      const { data: signed, error: signError } = await supabase.storage
        .from(CERTIFICATE_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, {
          download: certificateFileName(letterNumber),
        });
      if (signError || !signed?.signedUrl) throw signError ?? new Error('Signed URL tidak tersedia.');

      certificateUrl = signed.signedUrl;
    } catch (certificateError) {
      console.error(
        `[submit-feedback] Certificate generation failed for submission ${submission.id}. ` +
          'Feedback remains saved. Run recover-certificate to repair.',
        certificateError,
      );
    }

    return jsonResponse({
      success: true,
      participant: { nim: participant.nim, fullName: participant.fullName },
      feedback: { submitted: true, submittedAt: new Date().toISOString() },
      certificate: {
        number: certificateNumber,
        letterNumber,
        ready: certificateUrl !== null,
        url: certificateUrl,
        expiresInSeconds: certificateUrl ? SIGNED_URL_TTL_SECONDS : null,
      },
    });
  } catch (error) {
    console.error('[submit-feedback] Unexpected error:', error);
    return errorResponse('Layanan sedang terganggu. Silakan coba lagi.', 503, 'SERVICE_UNAVAILABLE');
  }
});
