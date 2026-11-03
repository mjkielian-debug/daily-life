-- Private SMS/notification inbox for the Daily Life Android bridge.
create extension if not exists pgcrypto;

create table if not exists public.text_inbox_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  token_prefix text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create unique index if not exists text_inbox_one_active_token_per_owner
  on public.text_inbox_tokens(owner_user_id)
  where revoked_at is null;
create index if not exists text_inbox_tokens_owner_idx
  on public.text_inbox_tokens(owner_user_id, created_at desc);

create table if not exists public.text_inbox_messages (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  sender text not null default 'Unknown',
  body text not null check (char_length(body) between 1 and 10000),
  received_at timestamptz not null default now(),
  source_app text,
  external_id text not null default gen_random_uuid()::text,
  created_at timestamptz not null default now(),
  unique(owner_user_id, external_id)
);

create index if not exists text_inbox_messages_owner_received_idx
  on public.text_inbox_messages(owner_user_id, received_at desc);

alter table public.text_inbox_tokens enable row level security;
alter table public.text_inbox_messages enable row level security;

drop policy if exists text_inbox_tokens_select_owner on public.text_inbox_tokens;
create policy text_inbox_tokens_select_owner on public.text_inbox_tokens
  for select to authenticated using (owner_user_id = (select auth.uid()));
drop policy if exists text_inbox_tokens_insert_owner on public.text_inbox_tokens;
create policy text_inbox_tokens_insert_owner on public.text_inbox_tokens
  for insert to authenticated with check (owner_user_id = (select auth.uid()));
drop policy if exists text_inbox_tokens_update_owner on public.text_inbox_tokens;
create policy text_inbox_tokens_update_owner on public.text_inbox_tokens
  for update to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

drop policy if exists text_inbox_messages_select_owner on public.text_inbox_messages;
create policy text_inbox_messages_select_owner on public.text_inbox_messages
  for select to authenticated using (owner_user_id = (select auth.uid()));
drop policy if exists text_inbox_messages_delete_owner on public.text_inbox_messages;
create policy text_inbox_messages_delete_owner on public.text_inbox_messages
  for delete to authenticated using (owner_user_id = (select auth.uid()));

revoke all on table public.text_inbox_tokens from anon, authenticated;
revoke all on table public.text_inbox_messages from anon, authenticated;
grant select, insert, update on table public.text_inbox_tokens to authenticated;
grant select, delete on table public.text_inbox_messages to authenticated;
