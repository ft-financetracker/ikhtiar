-- IKHTIAR v0.1 — profil minimal (opsional untuk milestone selanjutnya)
-- Jalankan di proyek Supabase milik Anda; uji dahulu pada staging.
-- Login dan Dashboard v0.1 TIDAK membutuhkan tabel ini.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  headline text not null default '',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
-- Scoped to authenticated users, ownership enforced for all operations.
create policy "profiles_select_own" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "profiles_delete_own" on public.profiles for delete to authenticated using (user_id = (select auth.uid()));
-- Admin features, Storage policies, and signup triggers are deliberately postponed.
