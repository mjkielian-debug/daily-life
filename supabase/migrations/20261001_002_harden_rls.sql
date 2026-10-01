-- Security/performance hardening after the initial cloud foundation.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create index if not exists household_members_owner_user_id_idx
  on public.household_members(owner_user_id);
create index if not exists life_entries_member_id_idx
  on public.life_entries(member_id);
create index if not exists financial_accounts_connection_id_idx
  on public.financial_accounts(connection_id);

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using ((select auth.uid()) = user_id);
create policy "profiles_insert_own" on public.profiles
for insert with check ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles
for update using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "household_members_own" on public.household_members;
create policy "household_members_own" on public.household_members
for all using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

drop policy if exists "life_entries_own" on public.life_entries;
create policy "life_entries_own" on public.life_entries
for all using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

drop policy if exists "app_snapshots_own" on public.app_snapshots;
create policy "app_snapshots_own" on public.app_snapshots
for all using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

drop policy if exists "budget_months_own" on public.budget_months;
create policy "budget_months_own" on public.budget_months
for all using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

drop policy if exists "financial_connections_own" on public.financial_connections;
create policy "financial_connections_own" on public.financial_connections
for select using ((select auth.uid()) = owner_user_id);

drop policy if exists "financial_accounts_own" on public.financial_accounts;
create policy "financial_accounts_own" on public.financial_accounts
for select using ((select auth.uid()) = owner_user_id);

drop policy if exists "financial_transactions_own" on public.financial_transactions;
create policy "financial_transactions_own" on public.financial_transactions
for select using ((select auth.uid()) = owner_user_id);
