-- Daily Life household sharing foundation.
-- Reconstructs the live sharing schema additively and keeps private data private by default.

create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My household',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_memberships (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(household_id,user_id)
);

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.shared_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  local_date date not null default current_date,
  payload jsonb not null default '{}'::jsonb,
  editable_by_household boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists household_memberships_household_idx on public.household_memberships(household_id);
create index if not exists household_memberships_user_idx on public.household_memberships(user_id);
create index if not exists household_invites_household_idx on public.household_invites(household_id);
create index if not exists shared_entries_household_date_idx on public.shared_entries(household_id,local_date desc);
create index if not exists shared_entries_owner_idx on public.shared_entries(owner_user_id);

drop trigger if exists households_set_updated_at on public.households;
create trigger households_set_updated_at
before update on public.households
for each row execute function public.set_updated_at();

drop trigger if exists household_memberships_set_updated_at on public.household_memberships;
create trigger household_memberships_set_updated_at
before update on public.household_memberships
for each row execute function public.set_updated_at();

create or replace function public.guard_shared_entry_identity()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if new.household_id is distinct from old.household_id
     or new.owner_user_id is distinct from old.owner_user_id
     or new.category is distinct from old.category then
    raise exception 'Shared entry identity fields cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists shared_entries_identity_guard on public.shared_entries;
create trigger shared_entries_identity_guard
before update on public.shared_entries
for each row execute function public.guard_shared_entry_identity();

create or replace function public.is_household_member(
  p_household_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists(
    select 1
    from public.household_memberships m
    where m.household_id=p_household_id
      and m.user_id=p_user_id
  );
$$;

create or replace function public.is_household_owner(
  p_household_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists(
    select 1
    from public.household_memberships m
    where m.household_id=p_household_id
      and m.user_id=p_user_id
      and m.role='owner'
  );
$$;

alter table public.households enable row level security;
alter table public.household_memberships enable row level security;
alter table public.household_invites enable row level security;
alter table public.shared_entries enable row level security;

drop policy if exists households_select_member on public.households;
create policy households_select_member
on public.households for select
to authenticated
using (public.is_household_member(id,(select auth.uid())));

drop policy if exists households_update_owner on public.households;
create policy households_update_owner
on public.households for update
to authenticated
using (public.is_household_owner(id,(select auth.uid())))
with check (public.is_household_owner(id,(select auth.uid())));

drop policy if exists memberships_select_household on public.household_memberships;
create policy memberships_select_household
on public.household_memberships for select
to authenticated
using (
  user_id=(select auth.uid())
  or public.is_household_member(household_id,(select auth.uid()))
);

drop policy if exists memberships_update_self on public.household_memberships;
create policy memberships_update_self
on public.household_memberships for update
to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

drop policy if exists invites_select_owner on public.household_invites;
create policy invites_select_owner
on public.household_invites for select
to authenticated
using (public.is_household_owner(household_id,(select auth.uid())));

drop policy if exists shared_entries_select_member on public.shared_entries;
create policy shared_entries_select_member
on public.shared_entries for select
to authenticated
using (public.is_household_member(household_id,(select auth.uid())));

drop policy if exists shared_entries_insert_member on public.shared_entries;
create policy shared_entries_insert_member
on public.shared_entries for insert
to authenticated
with check (
  owner_user_id=(select auth.uid())
  and public.is_household_member(household_id,(select auth.uid()))
);

drop policy if exists shared_entries_update_member on public.shared_entries;
create policy shared_entries_update_member
on public.shared_entries for update
to authenticated
using (
  public.is_household_member(household_id,(select auth.uid()))
  and (owner_user_id=(select auth.uid()) or editable_by_household)
)
with check (public.is_household_member(household_id,(select auth.uid())));

drop policy if exists shared_entries_delete_member on public.shared_entries;
create policy shared_entries_delete_member
on public.shared_entries for delete
to authenticated
using (
  public.is_household_member(household_id,(select auth.uid()))
  and (owner_user_id=(select auth.uid()) or editable_by_household)
);

create or replace function public.create_household(p_name text default 'My household')
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
  v_household uuid;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  insert into public.households(name,created_by)
  values (coalesce(nullif(trim(p_name),''),'My household'),v_user)
  returning id into v_household;

  insert into public.household_memberships(household_id,user_id,role)
  values (v_household,v_user,'owner');

  return v_household;
end;
$$;

create or replace function public.create_household_invite(
  p_household_id uuid,
  p_expires_hours integer default 168
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
  v_code text;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not public.is_household_owner(p_household_id,v_user) then
    raise exception 'Only a household owner can create an invite';
  end if;

  v_code := upper(encode(gen_random_bytes(9),'hex'));

  insert into public.household_invites(
    household_id,created_by,code_hash,expires_at,max_uses,uses,revoked
  ) values (
    p_household_id,
    v_user,
    encode(digest(v_code,'sha256'),'hex'),
    now()+make_interval(hours=>greatest(1,least(coalesce(p_expires_hours,168),720))),
    1,0,false
  );

  return v_code;
end;
$$;

create or replace function public.accept_household_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
  v_household uuid;
  v_invite uuid;
  v_existing boolean;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if nullif(trim(p_code),'') is null then raise exception 'Invite code required'; end if;

  select i.id,i.household_id
    into v_invite,v_household
  from public.household_invites i
  where i.code_hash=encode(digest(upper(trim(p_code)),'sha256'),'hex')
    and i.revoked=false
    and i.expires_at>now()
    and i.uses<i.max_uses
  order by i.created_at desc
  limit 1
  for update;

  if v_invite is null then
    raise exception 'Invite is invalid, expired, or already used';
  end if;

  select exists(
    select 1 from public.household_memberships
    where household_id=v_household and user_id=v_user
  ) into v_existing;

  if not v_existing then
    insert into public.household_memberships(household_id,user_id,role)
    values (v_household,v_user,'member');
    update public.household_invites set uses=uses+1 where id=v_invite;
  end if;

  return v_household;
end;
$$;

create or replace function public.remove_household_member(
  p_household_id uuid,
  p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not public.is_household_owner(p_household_id,v_user) then
    raise exception 'Only a household owner can remove a member';
  end if;
  if p_user_id=v_user then
    raise exception 'Use delete household instead of removing the owner';
  end if;

  delete from public.shared_entries
  where household_id=p_household_id and owner_user_id=p_user_id;

  delete from public.household_memberships
  where household_id=p_household_id and user_id=p_user_id;

  return found;
end;
$$;

create or replace function public.leave_household(p_household_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
  v_role text;
  v_count integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select role into v_role
  from public.household_memberships
  where household_id=p_household_id and user_id=v_user;

  if v_role is null then raise exception 'You are not a member of this household'; end if;

  select count(*) into v_count
  from public.household_memberships
  where household_id=p_household_id;

  if v_role='owner' then
    if v_count>1 then
      raise exception 'The owner cannot leave while other members remain';
    end if;
    delete from public.households where id=p_household_id and created_by=v_user;
    return true;
  end if;

  delete from public.shared_entries
  where household_id=p_household_id and owner_user_id=v_user;

  delete from public.household_memberships
  where household_id=p_household_id and user_id=v_user;

  return true;
end;
$$;

create or replace function public.delete_household(p_household_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if not public.is_household_owner(p_household_id,v_user) then
    raise exception 'Only the household owner can delete the household';
  end if;

  delete from public.households where id=p_household_id;
  return true;
end;
$$;

-- Data API exposure is explicit. No household table is readable anonymously.
revoke all on table public.households from anon;
revoke all on table public.household_memberships from anon;
revoke all on table public.household_invites from anon;
revoke all on table public.shared_entries from anon;

revoke all on table public.households from authenticated;
revoke all on table public.household_memberships from authenticated;
revoke all on table public.household_invites from authenticated;
revoke all on table public.shared_entries from authenticated;

grant select on table public.households to authenticated;
grant select on table public.household_memberships to authenticated;
grant update(display_name) on table public.household_memberships to authenticated;
grant select,insert,update,delete on table public.shared_entries to authenticated;

-- SECURITY DEFINER RPCs are intentionally callable only after sign-in.
revoke execute on function public.accept_household_invite(text) from public,anon;
revoke execute on function public.create_household(text) from public,anon;
revoke execute on function public.create_household_invite(uuid,integer) from public,anon;
revoke execute on function public.delete_household(uuid) from public,anon;
revoke execute on function public.is_household_member(uuid,uuid) from public,anon;
revoke execute on function public.is_household_owner(uuid,uuid) from public,anon;
revoke execute on function public.leave_household(uuid) from public,anon;
revoke execute on function public.remove_household_member(uuid,uuid) from public,anon;

grant execute on function public.accept_household_invite(text) to authenticated;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.create_household_invite(uuid,integer) to authenticated;
grant execute on function public.delete_household(uuid) to authenticated;
grant execute on function public.is_household_member(uuid,uuid) to authenticated;
grant execute on function public.is_household_owner(uuid,uuid) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;
grant execute on function public.remove_household_member(uuid,uuid) to authenticated;
