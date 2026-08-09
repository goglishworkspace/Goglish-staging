-- Phase 1: atomic registration finisher, called by the Next.js register API
-- route (via the service-role client) right after supabase.auth.signUp().
create or replace function public.complete_registration(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_national_id_encrypted text,
  p_national_id_masked text,
  p_birth_date date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, first_name, last_name, phone,
    national_id_encrypted, national_id_masked, birth_date
  )
  values (
    p_user_id, p_first_name, p_last_name, p_phone,
    p_national_id_encrypted, p_national_id_masked, p_birth_date
  );

  insert into public.role_user (user_id, role_id)
  select p_user_id, id from public.roles where name = 'student';
end;
$$;

revoke all on function public.complete_registration(uuid, text, text, text, text, text, date) from public, anon, authenticated;
grant execute on function public.complete_registration(uuid, text, text, text, text, text, date) to service_role;
