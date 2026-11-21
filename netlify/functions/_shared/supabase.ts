import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const CERTIFICATE_BUCKET = 'certificates';
export const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 hari

let cachedClient: SupabaseClient | null = null;

/**
 * Client dengan SERVICE ROLE. Hanya boleh dipakai di Netlify Functions.
 * Tidak pernah diekspor ke frontend.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.');
  }

  cachedClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cachedClient;
}

export function isMissingSupabaseConfig(): boolean {
  return !process.env.SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}
