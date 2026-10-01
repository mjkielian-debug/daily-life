-- Server-only financial connection secrets and sync cursor.
alter table public.financial_connections
  add column if not exists transactions_cursor text;

create table if not exists public.financial_connection_secrets (
  connection_id uuid primary key references public.financial_connections(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  access_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_connection_secrets_owner_idx
  on public.financial_connection_secrets(owner_user_id);

alter table public.financial_connection_secrets enable row level security;

-- No browser-facing RLS policies are intentionally created for this table.
-- Only trusted server-side service-role code should access provider tokens.
revoke all on table public.financial_connection_secrets from anon, authenticated;
grant all on table public.financial_connection_secrets to service_role;

drop trigger if exists financial_connection_secrets_set_updated_at
  on public.financial_connection_secrets;
create trigger financial_connection_secrets_set_updated_at
before update on public.financial_connection_secrets
for each row execute function public.set_updated_at();
