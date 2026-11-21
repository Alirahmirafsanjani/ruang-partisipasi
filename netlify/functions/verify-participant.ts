import { EVENT, getEventId } from './_shared/config';
import { isRegisteredNim } from './_shared/participants';
import {
  errorResponse,
  handleErrors,
  jsonResponse,
  methodNotAllowed,
  readJson,
} from './_shared/http';
import { getSupabaseAdmin, isMissingSupabaseConfig } from './_shared/supabase';
import { parseVerifyBody } from './_shared/validation';

export default handleErrors(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') return methodNotAllowed();

  let nim: string;
  let fullName: string;
  try {
    const identity = parseVerifyBody(await readJson(request));
    nim = identity.nim;
    fullName = identity.fullName;
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Data verifikasi tidak valid.', 400, 'INVALID_INPUT');
  }

  try {
    const registered = await isRegisteredNim(nim);
    if (!registered) {
      // Pesan yang sama untuk semua NIM yang tidak terdaftar (tidak membocorkan daftar).
      return errorResponse('NIM tidak ditemukan dalam daftar peserta kegiatan ini.', 404, 'PARTICIPANT_NOT_FOUND');
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
    const { data: existing, error } = await supabase
      .from('feedback_submissions')
      .select('id')
      .eq('event_id', getEventId())
      .eq('nim', nim)
      .maybeSingle();

    if (error) {
      console.error('[verify-participant] Database lookup failed:', error);
      return errorResponse('Layanan sedang terganggu. Silakan coba lagi.', 503, 'DATABASE_ERROR');
    }

    if (existing) {
      return errorResponse(
        'Feedback untuk NIM ini sudah pernah dikirim. Pengiriman ulang tidak diperbolehkan.',
        409,
        'ALREADY_SUBMITTED',
      );
    }

    return jsonResponse({
      verified: true,
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
