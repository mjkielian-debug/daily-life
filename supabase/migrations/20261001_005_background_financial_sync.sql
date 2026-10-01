-- Background financial sync, including while the PWA is closed.
create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

create or replace function public.get_daily_cron_key()
returns text
language sql
security definer
set search_path = public, vault
stable
as $$
  select decrypted_secret
    from vault.decrypted_secrets
   where name = 'daily_life_cron_key'
   limit 1;
$$;

revoke all on function public.get_daily_cron_key() from public, anon, authenticated;
grant execute on function public.get_daily_cron_key() to service_role;

select cron.schedule(
  'daily-life-financial-sync',
  '17 */6 * * *',
  $cron$
    select net.http_post(
      url := 'https://lticktlgrlljlafmjsao.supabase.co/functions/v1/plaid-sync-background',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'x-daily-cron-key',
        (select decrypted_secret from vault.decrypted_secrets where name = 'daily_life_cron_key' limit 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    ) as request_id;
  $cron$
);
