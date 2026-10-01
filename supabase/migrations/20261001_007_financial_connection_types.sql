-- Distinguish transaction-enabled bank/card connections from investment-only Items.
alter table public.financial_connections
  add column if not exists connection_type text not null default 'bank';

alter table public.financial_connections
  drop constraint if exists financial_connections_connection_type_check;

alter table public.financial_connections
  add constraint financial_connections_connection_type_check
  check (connection_type in ('bank','investment'));
