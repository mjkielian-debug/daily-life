create table if not exists public.bank_review_rules (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  match_field text not null check (match_field in ('merchant_name','name','category_primary','category_detailed')),
  match_operator text not null default 'contains' check (match_operator in ('contains','equals')),
  match_value text not null,
  action text not null check (action in ('ignore','category')),
  budget_category text null check (budget_category is null or budget_category in ('transport','dining','household','personal','grocery','fun','cushion','ebt')),
  note text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bank_review_rules enable row level security;

drop policy if exists "bank_review_rules_own" on public.bank_review_rules;
create policy "bank_review_rules_own" on public.bank_review_rules
for all using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create index if not exists bank_review_rules_owner_idx on public.bank_review_rules(owner_user_id);

drop trigger if exists bank_review_rules_set_updated_at on public.bank_review_rules;
create trigger bank_review_rules_set_updated_at
before update on public.bank_review_rules
for each row execute function public.set_updated_at();
