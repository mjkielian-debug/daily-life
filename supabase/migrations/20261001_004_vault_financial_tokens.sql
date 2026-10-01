-- Move financial provider access tokens to Supabase Vault.
-- Existing financial_connections.secret_ref is used as the opaque pointer.

create or replace function public.store_financial_access_token(
  p_connection_id uuid,
  p_owner_user_id uuid,
  p_access_token text
)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret_ref uuid;
begin
  if p_access_token is null or length(p_access_token) = 0 then
    raise exception 'access token required';
  end if;

  select secret_ref
    into v_secret_ref
    from public.financial_connections
   where id = p_connection_id
     and owner_user_id = p_owner_user_id
   for update;

  if not found then
    raise exception 'financial connection not found';
  end if;

  if v_secret_ref is null then
    select vault.create_secret(
      p_access_token,
      'daily_life_financial_' || p_connection_id::text,
      'Daily Life financial provider token'
    ) into v_secret_ref;

    update public.financial_connections
       set secret_ref = v_secret_ref,
           updated_at = now()
     where id = p_connection_id
       and owner_user_id = p_owner_user_id;
  else
    perform vault.update_secret(v_secret_ref, p_access_token);
  end if;

  return v_secret_ref;
end;
$$;

create or replace function public.get_financial_access_token(
  p_connection_id uuid,
  p_owner_user_id uuid
)
returns text
language sql
security definer
set search_path = public, vault
stable
as $$
  select v.decrypted_secret
    from public.financial_connections c
    join vault.decrypted_secrets v on v.id = c.secret_ref
   where c.id = p_connection_id
     and c.owner_user_id = p_owner_user_id;
$$;

revoke all on function public.store_financial_access_token(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.get_financial_access_token(uuid,uuid) from public, anon, authenticated;
grant execute on function public.store_financial_access_token(uuid,uuid,text) to service_role;
grant execute on function public.get_financial_access_token(uuid,uuid) to service_role;
