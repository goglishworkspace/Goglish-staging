-- FIX 1: widen profiles.role_type from the two self-registration branches
-- ('student'/'parent') to the platform's full role domain. This doesn't
-- change *who* can pick what at public registration - register/page.tsx
-- still only ever sends 'student' or 'parent' (see roleTypeSchema in
-- lib/validation/auth.schemas.ts) - it just stops the column itself from
-- rejecting the other values (e.g. an admin-provisioned staff account).
alter table public.profiles drop constraint if exists profiles_role_type_check;
alter table public.profiles add constraint profiles_role_type_check
  check (role_type = any (array[
    'student', 'parent', 'teacher', 'moderator',
    'support', 'content_manager', 'accountant',
    'admin', 'super_admin'
  ]));

-- FIX 2: auto-create a stub profile row the moment someone signs up,
-- rather than only once /api/auth/register's complete_registration or
-- app/auth/callback's complete_self_registration finishes - so
-- `public.profiles` and `auth.users` never diverge even for a signup
-- that's abandoned before its email is confirmed.
--
-- IMPORTANT: this trigger now runs first for every signup, and both
-- existing completion paths insert into the same row for the same id
-- afterward:
--   - complete_registration (20260724120008_complete_registration_rpc.sql,
--     called right after signUp() in /api/auth/register) previously did a
--     bare INSERT with no conflict handling - it would now hard-fail every
--     signup with a duplicate-key error.
--   - complete_self_registration (20260801100003_self_registration.sql,
--     called from /auth/callback once the email is confirmed) previously
--     used ON CONFLICT DO NOTHING - it would now silently skip writing the
--     real encrypted national ID / birth date / grade / child_national_id,
--     quietly breaking parent auto-linking and age validation with no error.
-- Both are redefined below via CREATE OR REPLACE (their original migration
-- files are untouched) to UPSERT, so the authoritative data from whichever
-- completion path runs always wins over this trigger's placeholder row.
--
-- Also: /api/auth/register's signUp() call doesn't pass first_name/
-- last_name in metadata at all (only complete_registration receives them,
-- as plain request-body fields validated server-side) - first_name/
-- last_name are NOT NULL columns, so a naive trigger insert would abort
-- that signup outright. Coalescing to '' avoids that; complete_registration's
-- upsert overwrites it with the real value moments later in the same flow.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, role_type)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'role_type', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Re-point complete_registration at an UPSERT so it fully populates the
-- row the trigger above now stub-creates first, instead of erroring on the
-- resulting primary key conflict. Same signature/behavior otherwise.
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
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    national_id_encrypted = excluded.national_id_encrypted,
    national_id_masked = excluded.national_id_masked,
    birth_date = excluded.birth_date;

  insert into public.role_user (user_id, role_id)
  select p_user_id, id from public.roles where name = 'student'
  on conflict (user_id, role_id) do nothing;
end;
$$;

-- Same treatment for complete_self_registration.
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
    grade, role_type, child_national_id
  )
  values (
    p_user_id, p_first_name, p_last_name, p_phone,
    p_national_id_encrypted, p_national_id_masked, p_birth_date,
    p_grade, p_role_type, p_child_national_id
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
    child_national_id = excluded.child_national_id;

  insert into public.role_user (user_id, role_id)
  select p_user_id, id from public.roles where name = p_role_type
  on conflict (user_id, role_id) do nothing;
end;
$$;
