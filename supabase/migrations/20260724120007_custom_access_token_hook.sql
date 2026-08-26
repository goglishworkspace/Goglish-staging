-- Phase 1: Custom Access Token Hook - injects the user's role into the JWT
-- app_metadata (Section 35 - Custom Claims). Registered in supabase/config.toml
-- under [auth.hook.custom_access_token].
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role text;
begin
  select r.name into user_role
  from public.role_user ru
  join public.roles r on r.id = ru.role_id
  where ru.user_id = (event ->> 'user_id')::uuid
  order by r.name
  limit 1;

  claims := event -> 'claims';

  if user_role is not null then
    claims := jsonb_set(
      coalesce(claims, '{}'::jsonb),
      '{app_metadata,role}',
      to_jsonb(user_role)
    );
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;

grant usage on schema public to supabase_auth_admin;
grant select on public.role_user, public.roles to supabase_auth_admin;
