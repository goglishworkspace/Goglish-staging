-- Simplify registration and enable phone-based parent linking
alter table public.profiles add column if not exists child_phone text;
create index if not exists idx_profiles_phone on public.profiles (phone);

create or replace function public.complete_self_registration(
  p_user_id uuid,
  p_role_type text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_national_id_encrypted text default null,
  p_national_id_masked text default null,
  p_birth_date date default null,
  p_grade text default null,
  p_child_national_id text default null,
  p_child_phone text default null
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
    grade, role_type, child_national_id, child_phone, self_registration_completed_at
  )
  values (
    p_user_id, p_first_name, p_last_name, p_phone,
    p_national_id_encrypted, p_national_id_masked, p_birth_date,
    p_grade, p_role_type, p_child_national_id, p_child_phone, now()
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    national_id_encrypted = coalesce(excluded.national_id_encrypted, profiles.national_id_encrypted),
    national_id_masked = coalesce(excluded.national_id_masked, profiles.national_id_masked),
    birth_date = coalesce(excluded.birth_date, profiles.birth_date),
    grade = coalesce(excluded.grade, profiles.grade),
    role_type = excluded.role_type,
    child_national_id = coalesce(excluded.child_national_id, profiles.child_national_id),
    child_phone = coalesce(excluded.child_phone, profiles.child_phone),
    self_registration_completed_at = now();

  insert into public.role_user (user_id, role_id)
  select p_user_id, id from public.roles where name = p_role_type
  on conflict (user_id, role_id) do nothing;
end;
$$;

revoke all on function public.complete_self_registration(uuid, text, text, text, text, text, text, date, text, text, text) from public, anon, authenticated;
grant execute on function public.complete_self_registration(uuid, text, text, text, text, text, text, date, text, text, text) to service_role;
