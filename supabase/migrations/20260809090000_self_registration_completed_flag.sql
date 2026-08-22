-- Tracks whether complete_self_registration has actually run for a student/
-- parent profile, independent of which fields happen to be null. Needed
-- because completion currently only fires once, during the fragile
-- /auth/callback PKCE redirect - if that redirect fails (e.g. the
-- confirmation link is opened in a different browser/device than the one
-- that started signUp(), breaking PKCE's code-verifier pairing), Supabase
-- still marks the email confirmed and the user can log in normally, but
-- the profile is left permanently stuck on the handle_new_user() stub
-- (no phone/grade/national_id) with nothing ever signaling the failure.
-- app/api/auth/login/route.ts uses this flag to retry completion on next
-- login - see lib/services/self-registration.service.ts.
alter table public.profiles
  add column if not exists self_registration_completed_at timestamptz;

create or replace function public.complete_self_registration(
  p_user_id uuid,
  p_role_type text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_national_id_encrypted text,
  p_national_id_masked text,
  p_birth_date date,
  p_grade text,
  p_child_national_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, first_name, last_name, phone,
    national_id_encrypted, national_id_masked, birth_date,
    grade, role_type, child_national_id, self_registration_completed_at
  )
  values (
    p_user_id, p_first_name, p_last_name, p_phone,
    p_national_id_encrypted, p_national_id_masked, p_birth_date,
    p_grade, p_role_type, p_child_national_id, now()
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    national_id_encrypted = excluded.national_id_encrypted,
    national_id_masked = excluded.national_id_masked,
    birth_date = excluded.birth_date,
    grade = excluded.grade,
    role_type = excluded.role_type,
    child_national_id = excluded.child_national_id,
    self_registration_completed_at = now();

  insert into public.role_user (user_id, role_id)
  select p_user_id, id from public.roles where name = p_role_type
  on conflict (user_id, role_id) do nothing;
end;
$$;
