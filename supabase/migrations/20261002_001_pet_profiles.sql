-- Private pet profiles for Daily Life.
-- Names/data live in Supabase rows, never in public source defaults.

create table if not exists public.pet_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  species text not null default 'pet',
  birthday date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, display_name)
);

create index if not exists pet_profiles_owner_user_id_idx
  on public.pet_profiles(owner_user_id);

drop trigger if exists pet_profiles_set_updated_at on public.pet_profiles;
create trigger pet_profiles_set_updated_at before update on public.pet_profiles
for each row execute function public.set_updated_at();

alter table public.pet_profiles enable row level security;

drop policy if exists "pet_profiles_own" on public.pet_profiles;
create policy "pet_profiles_own" on public.pet_profiles
for all to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

grant select, insert, update, delete on public.pet_profiles to authenticated;
