/**
 * SUMBER TUNGGAL DATA KEGIATAN
 * ------------------------------------------------------------------
 * File ini hanya berjalan di Netlify Functions. Seluruh daftar peserta
 * TIDAK PERNAH dikirim ke browser.
 *
 * NIM peserta dibaca dari Google Sheets private bila variabel GOOGLE_* diisi
 * (lihat _shared/participants.ts). PARTICIPANT_NIMS di bawah dipakai sebagai
 * fallback lokal saat Google Sheets belum dikonfigurasi. Nama lengkap tidak
 * disimpan di sini -- peserta mengetiknya sendiri saat verifikasi. Pertanyaan
 * tetap diedit di file ini lalu deploy ulang.
 */

export type QuestionType = 'rating' | 'text';

export interface FeedbackQuestion {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  /** Bantuan singkat di bawah label (opsional). */
  hint?: string;
  /** Placeholder untuk pertanyaan teks (opsional). */
  placeholder?: string;
  /** Batas karakter untuk pertanyaan teks. Default: 1000. */
  maxLength?: number;
}

export interface Participant {
  /** Selalu gunakan string agar nol di depan tidak hilang. */
  nim: string;
  fullName: string;
}

export interface EventIdentity {
  eventId: string;
  title: string;
  subtitle: string;
  /** Tanggal dalam format siap tampil, cocok untuk sertifikat. */
  dateLabel: string;
  organizer: string;
  location: string;
  theme: string;
}

export const EVENT: EventIdentity = {
  eventId: 'ruang-partisipasi-2026',
  title: 'Bakti Sosial HIMSI UAA',
  subtitle:
    'Berbagi dengan hati, menginspirasi dengan peduli. Mari bersama menebar kebaikan dan kepedulian melalui kegiatan bakti sosial.',
  dateLabel: '21 November 2026',
  organizer: 'HIMSI Universitas Alma Ata',
  location: 'LKSA Panti Asuhan Muhammadiyah Wates',
  theme: 'Berbagi dengan Hati, Menginspirasi dengan Peduli',
};

/**
 * CONTOH / PLACEHOLDER — BUKAN DATA PESERTA NYATA.
 * Hanya NIM yang disimpan. Ganti sebelum deployment produksi bila tidak
 * memakai Google Sheets.
 */
export const PARTICIPANT_NIMS: string[] = [
  '20230001',
  '20230002',
  '20230003',
];

/**
 * Pertanyaan feedback. Frontend mengambil daftar ini dari endpoint
 * get-event-config, jadi tampilan dan validasi backend selalu konsisten.
 */
export const QUESTIONS: FeedbackQuestion[] = [
  {
    id: 'overall_rating',
    label: 'Seberapa puas kamu dengan kegiatan ini?',
    type: 'rating',
    required: true,
    hint: '1 = perlu banyak perbaikan, 5 = sangat baik',
  },
  {
    id: 'favorite_part',
    label: 'Bagian mana dari kegiatan yang paling berkesan bagimu?',
    type: 'text',
    required: true,
    placeholder: 'Ceritakan pengalamanmu secara singkat...',
    maxLength: 1000,
  },
  {
    id: 'suggestion',
    label: 'Apa saranmu untuk kegiatan berikutnya?',
    type: 'text',
    required: false,
    placeholder: 'Opsional — setiap gagasan sangat kami hargai',
    maxLength: 1000,
  },
  {
    id: 'would_join_again',
    label: 'Seberapa besar kamu ingin mengikuti kegiatan serupa?',
    type: 'rating',
    required: false,
    hint: 'Opsional',
  },
];

/** EVENT_ID dari environment menang bila diisi, tetapi harus sama dengan EVENT.eventId. */
export function getEventId(): string {
  const fromEnv = process.env.EVENT_ID?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : EVENT.eventId;
}

export function getCertificatePrefix(): string {
  const fromEnv = process.env.CERTIFICATE_PREFIX?.trim().toUpperCase();
  return fromEnv && fromEnv.length > 0 ? fromEnv : 'SI';
}

/**
 * Format nomor surat yang dicetak di template.png, tepat di atas
 * kalimat "Diberikan Kepada:". Bagian urutan (001, 002, ...) diambil
 * dari counter database melalui certificate_number.
 */
export const CERTIFICATE_LETTER_FORMAT = {
  prefix: '038.',
  suffix: '/B/SERT/HIMSI/UAA/XI/2026',
};

export function buildCertificateLetterNumber(certificateNumber: string): string {
  const match = certificateNumber.match(/-(\d+)$/);
  const sequence = match?.[1] ?? '0001';
  return `${CERTIFICATE_LETTER_FORMAT.prefix}${sequence}${CERTIFICATE_LETTER_FORMAT.suffix}`;
}

/** Hanya data aman yang boleh dikirim ke browser. */
export function getPublicEventConfig() {
  return {
    eventId: EVENT.eventId,
    title: EVENT.title,
    subtitle: EVENT.subtitle,
    dateLabel: EVENT.dateLabel,
    organizer: EVENT.organizer,
    location: EVENT.location,
    theme: EVENT.theme,
    questions: QUESTIONS.map(({ id, label, type, required, hint, placeholder, maxLength }) => ({
      id,
      label,
      type,
      required,
      ...(hint ? { hint } : {}),
      ...(placeholder ? { placeholder } : {}),
      ...(maxLength ? { maxLength } : {}),
    })),
  };
}
