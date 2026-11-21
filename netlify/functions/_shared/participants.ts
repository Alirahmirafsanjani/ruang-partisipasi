import { createSign } from 'node:crypto';
import { PARTICIPANT_NIMS } from './config';

const CACHE_TTL_MS = 5 * 60 * 1000;
const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly';

interface CachedNims {
  nims: string[];
  expiresAt: number;
}

let cache: CachedNims | null = null;
let inFlight: Promise<string[]> | null = null;

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SHEET_ID?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim(),
  );
}

function normalizePrivateKey(value: string): string {
  let key = value.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? '');
  if (!email || !privateKey) throw new Error('Google service account belum dikonfigurasi.');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: email,
    scope: SHEETS_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(privateKey).toString('base64url');
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    console.error('[participants] Google OAuth token request failed:', response.status);
    throw new Error('Gagal mengautentikasi Google Sheets.');
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('Token Google Sheets tidak tersedia.');
  return data.access_token;
}

/**
 * Sheet hanya dipakai sebagai daftar NIM yang boleh verifikasi.
 * Kolom lain (misalnya nama lama) diabaikan.
 */
function parseSheetNims(values: string[][]): string[] {
  if (values.length === 0) return [];

  const header = values[0].map((cell) => String(cell ?? '').trim().toLowerCase());
  const nimAliases = ['nim', 'nomor induk mahasiswa', 'nomor induk'];
  const nimIndex = header.findIndex((cell) => nimAliases.includes(cell));
  const nimColumn = nimIndex >= 0 ? nimIndex : 0;

  const nims = values
    .slice(1)
    .map((row) => String(row[nimColumn] ?? '').trim())
    .filter((nim) => nim.length > 0);

  // Kolom unik hanya NIM: duplikat di sheet tidak masalah.
  return [...new Set(nims)];
}

async function fetchFromGoogleSheets(): Promise<string[]> {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  const range = process.env.GOOGLE_SHEET_RANGE?.trim() || 'Peserta!A:A';
  if (!sheetId) throw new Error('GOOGLE_SHEET_ID belum diisi.');

  const accessToken = await getAccessToken();
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}` +
    `/values/${encodeURIComponent(range)}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error('[participants] Google Sheets read failed:', response.status);
    throw new Error('Gagal membaca data NIM dari Google Sheets.');
  }

  const data = (await response.json()) as { values?: string[][] };
  return parseSheetNims(data.values ?? []);
}

async function loadRegisteredNims(): Promise<string[]> {
  if (!isGoogleSheetsConfigured()) return PARTICIPANT_NIMS;
  if (cache && cache.expiresAt > Date.now()) return cache.nims;
  if (inFlight) return inFlight;

  inFlight = fetchFromGoogleSheets()
    .then((nims) => {
      cache = { nims, expiresAt: Date.now() + CACHE_TTL_MS };
      return nims;
    })
    .catch((error) => {
      // Jika ada cache lama, pakai data lama agar layanan tetap tersedia.
      if (cache) {
        console.warn('[participants] Using stale cache because Google Sheets failed:', error);
        return cache.nims;
      }
      throw error;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Cek apakah NIM terdaftar. Nama tidak diambil dari sheet. */
export async function isRegisteredNim(nim: string): Promise<boolean> {
  const nims = await loadRegisteredNims();
  return nims.includes(nim);
}
