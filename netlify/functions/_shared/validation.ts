import { z } from 'zod';
import { QUESTIONS, type Participant } from './config';
import { isRegisteredNim } from './participants';

export const MAX_TEXT_LENGTH = 2000;

const nimSchema = z
  .string({ required_error: 'NIM wajib diisi.' })
  .trim()
  .min(3, 'NIM terlalu pendek.')
  .max(50, 'NIM terlalu panjang.')
  .regex(/^[A-Za-z0-9._-]+$/, 'Format NIM tidak valid.');

const fullNameSchema = z
  .string({ required_error: 'Nama lengkap wajib diisi.' })
  .trim()
  .min(3, 'Nama lengkap terlalu pendek.')
  .max(100, 'Nama lengkap terlalu panjang.')
  .regex(
    /^[\p{L}\p{M}][\p{L}\p{M}' .,-]*$/u,
    'Nama hanya boleh berisi huruf, spasi, titik, koma, apostrof, dan tanda hubung.',
  );

const answerInputSchema = z.object({
  id: z.string().trim().min(1).max(64),
  value: z.union([z.number().int(), z.string().max(MAX_TEXT_LENGTH)]),
});

const verifySchema = z.object({ nim: nimSchema, fullName: fullNameSchema });

const identitySchema = z.object({ nim: nimSchema, fullName: fullNameSchema });

const answersSchema = z.object({
  answers: z
    .array(answerInputSchema)
    .min(1, 'Jawaban feedback wajib diisi.')
    .max(QUESTIONS.length, 'Jumlah jawaban tidak sesuai.'),
});

const recoverySchema = z.object({
  nim: nimSchema,
  certificateNumber: z.string().trim().min(3).max(80),
});

export type NormalizedAnswer = string | number;

export function parseVerifyBody(body: unknown): { nim: string; fullName: string } {
  const result = verifySchema.safeParse(body);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Data verifikasi tidak valid.');
  }
  return result.data;
}

export function parseSubmitIdentity(body: unknown): { nim: string; fullName: string } {
  const result = identitySchema.safeParse(body);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Identitas tidak valid.');
  }
  return result.data;
}

export function parseRecoveryBody(body: unknown): { nim: string; certificateNumber: string } {
  const result = recoverySchema.safeParse(body);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Data pemulihan tidak valid.');
  }
  return result.data;
}

/**
 * NIM divalidasi ke sheet/config. Nama berasal dari input peserta yang sudah
 * divalidasi formatnya, lalu dipakai apa adanya untuk sertifikat.
 */
export async function requireRegisteredParticipant(
  nim: string,
  fullName: string,
): Promise<Participant> {
  const registered = await isRegisteredNim(nim);
  if (!registered) {
    throw new Error('NIM tidak ditemukan dalam daftar peserta kegiatan ini.');
  }
  return { nim, fullName };
}

/**
 * Validasi jawaban terhadap konfigurasi pertanyaan di backend.
 * Mengembalikan objek bersih siap disimpan ke kolom JSONB.
 */
export function validateAnswers(body: unknown): Record<string, NormalizedAnswer> {
  const result = answersSchema.safeParse(body);
  if (!result.success) {
    throw new Error(result.error.issues[0]?.message ?? 'Jawaban feedback tidak valid.');
  }

  const { answers } = result.data;
  const allowedIds = new Set(QUESTIONS.map((question) => question.id));
  for (const answer of answers) {
    if (!allowedIds.has(answer.id)) {
      throw new Error('Terdapat jawaban untuk pertanyaan yang tidak dikenal.');
    }
  }

  const normalized: Record<string, NormalizedAnswer> = {};

  for (const question of QUESTIONS) {
    const answer = answers.find((item) => item.id === question.id);
    const hasValue =
      answer !== undefined &&
      ((typeof answer.value === 'string' && answer.value.trim().length > 0) ||
        typeof answer.value === 'number');

    if (!hasValue) {
      if (question.required) {
        throw new Error(`Pertanyaan "${question.label}" wajib diisi.`);
      }
      continue;
    }

    if (question.type === 'rating') {
      if (typeof answer?.value !== 'number' || !Number.isInteger(answer.value)) {
        throw new Error(`Jawaban "${question.label}" harus berupa pilihan angka.`);
      }
      if (answer.value < 1 || answer.value > 5) {
        throw new Error(`Nilai "${question.label}" harus antara 1 sampai 5.`);
      }
      normalized[question.id] = answer.value;
      continue;
    }

    if (typeof answer?.value !== 'string') {
      throw new Error(`Jawaban "${question.label}" harus berupa teks.`);
    }
    const text = answer.value.trim();
    const limit = Math.min(question.maxLength ?? 1000, MAX_TEXT_LENGTH);
    if (text.length > limit) {
      throw new Error(`Jawaban "${question.label}" maksimal ${limit} karakter.`);
    }
    normalized[question.id] = text;
  }

  return normalized;
}
