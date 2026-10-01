-- Daily Life cloud foundation.
-- Additive only: the existing local IndexedDB app remains the source of truth
-- until a signed-in user explicitly syncs/migrates their data.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'America/Chicago',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  relationship text,
  birthday date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.life_entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid references public.household_members(id) on delete set null,
  category text not null,
  occurred_at timestamptz not null default now(),
  local_date date not null default current_date,
  payload jsonb not null default '{}'::jsonb,
  source text not null default 'app'
    check (source in ('app','chatgpt','import','bank','system')),
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, source, external_id)
);

create table if not exists public.app_snapshots (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_months (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, month),
  check (date_trunc('month', month)::date = month)
);

create table if not exists public.financial_connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_item_id text not null,
  institution_name text,
  status text not null default 'linked',
  secret_ref uuid,
  last_synced_at timestamptz,
  sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, provider, provider_item_id)
);

create table if not exists public.financial_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.financial_connections(id) on delete cascade,
  provider_account_id text not null,
  display_name text not null,
  mask text,
  account_type text,
  account_subtype text,
  currency text not null default 'USD',
  available_balance numeric(14,2),
  current_balance numeric(14,2),
  balance_as_of timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, provider_account_id)
);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.financial_accounts(id) on delete cascade,
  provider_transaction_id text not null,
  posted_date date,
  authorized_at timestamptz,
  merchant_name text,
  name text,
  provider_amount numeric(14,2) not null,
  currency text not null default 'USD',
  pending boolean not null default false,
  is_transfer boolean not null default false,
  category_primary text,
  category_detailed text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, provider_transaction_id)
);

create index if not exists life_entries_owner_date_idx
  on public.life_entries(owner_user_id, local_date desc);
create index if not exists life_entries_owner_category_date_idx
  on public.life_entries(owner_user_id, category, local_date desc);
create index if not exists financial_accounts_owner_idx
  on public.financial_accounts(owner_user_id);
create index if not exists financial_transactions_owner_date_idx
  on public.financial_transactions(owner_user_id, posted_date desc);
create index if not exists financial_transactions_account_date_idx
  on public.financial_transactions(account_id, posted_date desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists household_members_set_updated_at on public.household_members;
create trigger household_members_set_updated_at before update on public.household_members
for each row execute function public.set_updated_at();

drop trigger if exists life_entries_set_updated_at on public.life_entries;
create trigger life_entries_set_updated_at before update on public.life_entries
for each row execute function public.set_updated_at();

drop trigger if exists budget_months_set_updated_at on public.budget_months;
create trigger budget_months_set_updated_at before update on public.budget_months
for each row execute function public.set_updated_at();

drop trigger if exists financial_connections_set_updated_at on public.financial_connections;
create trigger financial_connections_set_updated_at before update on public.financial_connections
for each row execute function public.set_updated_at();

drop trigger if exists financial_accounts_set_updated_at on public.financial_accounts;
create trigger financial_accounts_set_updated_at before update on public.financial_accounts
for each row execute function public.set_updated_at();

drop trigger if exists financial_transactions_set_updated_at on public.financial_transactions;
create trigger financial_transactions_set_updated_at before update on public.financial_transactions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.household_members enable row level security;
alter table public.life_entries enable row level security;
alter table public.app_snapshots enable row level security;
alter table public.budget_months enable row level security;
alter table public.financial_connections enable row level security;
alter table public.financial_accounts enable row level security;
alter table public.financial_transactions enable row level security;

create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "household_members_own" on public.household_members
for all using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "life_entries_own" on public.life_entries
for all using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "app_snapshots_own" on public.app_snapshots
for all using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "budget_months_own" on public.budget_months
for all using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

create policy "financial_connections_own" on public.financial_connections
for select using (auth.uid() = owner_user_id);

create policy "financial_accounts_own" on public.financial_accounts
for select using (auth.uid() = owner_user_id);

create policy "financial_transactions_own" on public.financial_transactions
for select using (auth.uid() = owner_user_id);

-- Browser clients never directly write provider-synced financial tables.
-- Server-side sync functions use a secret/service role instead.
