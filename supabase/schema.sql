-- ============================================================
-- RUANG PARTISIPASI — SKEMA SUPABASE
-- Jalankan seluruh isi file ini di Supabase SQL Editor.
-- Aman dijalankan ulang (idempoten).
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- 1. Tabel feedback
-- ------------------------------------------------------------
create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  nim text not null,
  full_name text not null,
  answers jsonb not null default '{}'::jsonb,
  certificate_number text not null,
  certificate_path text,
  submitted_at timestamptz not null default now(),
  certificate_generated_at timestamptz,
  constraint feedback_submissions_event_nim_key unique (event_id, nim),
  constraint feedback_submissions_certificate_number_key unique (certificate_number)
);

create index if not exists feedback_submissions_event_id_idx
  on public.feedback_submissions (event_id);

-- ------------------------------------------------------------
-- 2. Tabel counter penomoran sertifikat
-- ------------------------------------------------------------
create table if not exists public.event_counters (
  event_id text primary key,
  last_number bigint not null default 0
);

-- ------------------------------------------------------------
-- 3. Row Level Security
-- Tidak ada policy untuk anon/authenticated => tidak ada data yang
-- bisa dibaca atau ditulis lewat anon key. Service role bypass RLS.
-- ------------------------------------------------------------
alter table public.feedback_submissions enable row level security;
alter table public.event_counters enable row level security;

-- RLS memblokir anon/authenticated, tetapi service_role tetap membutuhkan
-- privilege level tabel. Di sebagian project Supabase grant default tidak
-- otomatis terpasang, jadi kita nyatakan eksplisit di sini.
grant usage on schema public to service_role;
grant all on public.feedback_submissions to service_role;
grant all on public.event_counters to service_role;

-- ------------------------------------------------------------
-- 4. RPC penomoran sertifikat (atomik, aman untuk konkurensi)
-- UPDATE terhadap satu baris counter mengambil row lock sehingga
-- dua request bersamaan tidak bisa mendapat nomor yang sama.
-- ------------------------------------------------------------
create or replace function public.allocate_certificate_number(
  p_event_id text,
  p_prefix text default 'SI'
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year text := to_char(now() at time zone 'UTC', 'YYYY');
  v_prefix text := upper(regexp_replace(coalesce(p_prefix, 'SI'), '[^A-Za-z0-9]', '', 'g'));
  v_next bigint;
begin
  if p_event_id is null or length(trim(p_event_id)) = 0 then
    raise exception 'event_id wajib diisi';
  end if;

  if v_prefix = '' then
    v_prefix := 'SI';
  end if;

  insert into public.event_counters (event_id, last_number)
  values (p_event_id, 0)
  on conflict (event_id) do nothing;

  update public.event_counters
     set last_number = last_number + 1
   where event_id = p_event_id
  returning last_number into v_next;

  return v_prefix || '-' || v_year || '-' || lpad(v_next::text, 4, '0');
end;
$$;

-- Hanya service role yang boleh memanggil RPC ini.
revoke all on function public.allocate_certificate_number(text, text) from public;
revoke all on function public.allocate_certificate_number(text, text) from anon, authenticated;
grant execute on function public.allocate_certificate_number(text, text) to service_role;

-- ------------------------------------------------------------
-- 5. Bucket Storage PRIVATE untuk PDF sertifikat
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do update set public = false;

-- Tidak dibuat policy storage.objects: akses hanya lewat service role
-- di Netlify Functions. Signed URL dibuat dengan masa berlaku terbatas.
