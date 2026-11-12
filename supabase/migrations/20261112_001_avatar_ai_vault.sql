-- Keep the optional Gemini free-tier key in Vault, never in public app data.
create or replace function public.avatar_ai_set_key(
  p_owner_user_id uuid,
  p_api_key text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, vault
as $$
declare
  v_secret_name text := 'daily_life_avatar_gemini_' || p_owner_user_id::text;
  v_secret_id uuid;
begin
  if p_owner_user_id is null or p_api_key is null or length(p_api_key) < 20 or length(p_api_key) > 256 then
    raise exception 'valid owner and API key required';
  end if;

  select id into v_secret_id
    from vault.secrets
   where name = v_secret_name
   limit 1;

  if v_secret_id is null then
    perform vault.create_secret(p_api_key, v_secret_name, 'Daily Life free-tier outfit photo analyzer');
  else
    perform vault.update_secret(v_secret_id, p_api_key);
  end if;
end;
$$;

create or replace function public.avatar_ai_get_key(p_owner_user_id uuid)
returns text
language sql
security definer
set search_path = pg_catalog, public, vault
stable
as $$
  select decrypted_secret
    from vault.decrypted_secrets
   where name = 'daily_life_avatar_gemini_' || p_owner_user_id::text
   limit 1;
$$;

revoke all on function public.avatar_ai_set_key(uuid, text) from public, anon, authenticated;
revoke all on function public.avatar_ai_get_key(uuid) from public, anon, authenticated;
grant execute on function public.avatar_ai_set_key(uuid, text) to service_role;
grant execute on function public.avatar_ai_get_key(uuid) to service_role;
