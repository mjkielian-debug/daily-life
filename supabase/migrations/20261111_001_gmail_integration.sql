-- Gmail read-only OAuth storage and inbox support for Daily Life.
-- User data stays owner-scoped; OAuth secrets are isolated in the unexposed private schema.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.gmail_oauth_credentials (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  client_id text not null,
  client_secret text not null,
  refresh_token text,
  updated_at timestamptz not null default now()
);
alter table private.gmail_oauth_credentials enable row level security;
revoke all on table private.gmail_oauth_credentials from public, anon, authenticated;
grant select, insert, update, delete on table private.gmail_oauth_credentials to service_role;

create table if not exists public.gmail_connections (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  email_address text not null,
  status text not null default 'connected'
    check (status in ('connected', 'reconnect_required')),
  last_sync_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gmail_connections_status_idx
  on public.gmail_connections(status);
alter table public.gmail_connections enable row level security;
revoke all on table public.gmail_connections from public, anon, authenticated;
grant select on table public.gmail_connections to authenticated;
grant all on table public.gmail_connections to service_role;
drop policy if exists gmail_connections_select_owner on public.gmail_connections;
create policy gmail_connections_select_owner on public.gmail_connections
  for select to authenticated using (owner_user_id = (select auth.uid()));

create table if not exists public.gmail_inbox_messages (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  gmail_message_id text not null,
  thread_id text,
  sender text not null default '',
  subject text not null default '(no subject)',
  snippet text not null default '',
  received_at timestamptz not null default now(),
  review_state text not null default 'new'
    check (review_state in ('new', 'reviewed', 'archived', 'ignored')),
  created_at timestamptz not null default now(),
  unique (owner_user_id, gmail_message_id)
);
create index if not exists gmail_inbox_messages_owner_received_idx
  on public.gmail_inbox_messages(owner_user_id, received_at desc);
alter table public.gmail_inbox_messages enable row level security;
revoke all on table public.gmail_inbox_messages from public, anon, authenticated;
grant select, delete on table public.gmail_inbox_messages to authenticated;
grant all on table public.gmail_inbox_messages to service_role;
drop policy if exists gmail_inbox_messages_select_owner on public.gmail_inbox_messages;
create policy gmail_inbox_messages_select_owner on public.gmail_inbox_messages
  for select to authenticated using (owner_user_id = (select auth.uid()));
drop policy if exists gmail_inbox_messages_delete_owner on public.gmail_inbox_messages;
create policy gmail_inbox_messages_delete_owner on public.gmail_inbox_messages
  for delete to authenticated using (owner_user_id = (select auth.uid()));

create table if not exists public.gmail_oauth_states (
  state_hash text primary key check (state_hash ~ '^[a-f0-9]{64}$'),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists gmail_oauth_states_expiry_idx
  on public.gmail_oauth_states(expires_at);
alter table public.gmail_oauth_states enable row level security;
revoke all on table public.gmail_oauth_states from public, anon, authenticated;
grant all on table public.gmail_oauth_states to service_role;

create or replace function public.set_gmail_oauth_config(
  p_owner_user_id uuid,
  p_client_id text,
  p_client_secret text
) returns void
language sql
set search_path = ''
as $$
  insert into private.gmail_oauth_credentials(owner_user_id, client_id, client_secret, updated_at)
  values (p_owner_user_id, p_client_id, p_client_secret, now())
  on conflict (owner_user_id) do update
    set client_id = excluded.client_id,
        client_secret = excluded.client_secret,
        updated_at = now();
$$;

create or replace function public.get_gmail_oauth_config(p_owner_user_id uuid)
returns table(client_id text, client_secret text)
language sql
stable
set search_path = ''
as $$
  select c.client_id, c.client_secret
  from private.gmail_oauth_credentials c
  where c.owner_user_id = p_owner_user_id;
$$;

create or replace function public.store_gmail_refresh_token(
  p_owner_user_id uuid,
  p_email_address text,
  p_refresh_token text
) returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into private.gmail_oauth_credentials(owner_user_id, client_id, client_secret, refresh_token, updated_at)
  values (p_owner_user_id, '', '', p_refresh_token, now())
  on conflict (owner_user_id) do update
    set refresh_token = excluded.refresh_token,
        updated_at = now();

  insert into public.gmail_connections(owner_user_id, email_address, status, last_sync_error, updated_at)
  values (p_owner_user_id, left(p_email_address, 320), 'connected', null, now())
  on conflict (owner_user_id) do update
    set email_address = excluded.email_address,
        status = 'connected',
        last_sync_error = null,
        updated_at = now();
end;
$$;

create or replace function public.get_gmail_refresh_token(p_owner_user_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select c.refresh_token
  from private.gmail_oauth_credentials c
  where c.owner_user_id = p_owner_user_id;
$$;

revoke all on function public.set_gmail_oauth_config(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_gmail_oauth_config(uuid) from public, anon, authenticated;
revoke all on function public.store_gmail_refresh_token(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_gmail_refresh_token(uuid) from public, anon, authenticated;
grant execute on function public.set_gmail_oauth_config(uuid, text, text) to service_role;
grant execute on function public.get_gmail_oauth_config(uuid) to service_role;
grant execute on function public.store_gmail_refresh_token(uuid, text, text) to service_role;
grant execute on function public.get_gmail_refresh_token(uuid) to service_role;

-- The sync function only performs mailbox reads at 7am, noon, and 6pm in each
-- account's stored timezone. Run the dispatcher hourly so those local windows
-- are reached across timezones. Existing push and financial jobs are untouched.
do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'daily-life-gmail-sync';
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
  perform cron.schedule(
    'daily-life-gmail-sync',
    '5 * * * *',
    $job$
      select net.http_post(
        url := 'https://lticktlgrlljlafmjsao.supabase.co/functions/v1/gmail-sync',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-daily-cron-key', public.get_daily_cron_key()::text
        ),
        body := '{}'::jsonb
      );
    $job$
  );
end
$$;
