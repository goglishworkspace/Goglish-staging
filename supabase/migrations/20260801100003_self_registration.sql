-- New self-service registration flow: client calls supabase.auth.signUp()
-- directly (with role_type/national_id/grade/child_national_id/phone as
-- user_metadata) instead of going through /api/auth/register. Profile
-- creation now happens in app/auth/callback/route.ts once the email is
-- confirmed and the metadata is available on a real session, via the new
-- complete_self_registration() RPC below - the original complete_registration()
-- RPC and /api/auth/register route are left untouched (still used by the
-- existing test suite and any other caller).

-- The parent flow never collects the parent's own national ID (only the
-- child's, for auto-linking), so these can no longer be required for every
-- profile - only student profiles populate them going forward.
alter table public.profiles alter column national_id_encrypted drop not null;
alter table public.profiles alter column national_id_masked drop not null;
alter table public.profiles alter column birth_date drop not null;

alter table public.profiles add column if not exists role_type text check (role_type in ('student', 'parent'));
alter table public.profiles add column if not exists child_national_id text;

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
  on conflict (id) do nothing;

  insert into public.role_user (user_id, role_id)
  select p_user_id, id from public.roles where name = p_role_type
  on conflict (user_id, role_id) do nothing;
end;
$$;

revoke all on function public.complete_self_registration(uuid, text, text, text, text, text, text, date, text, text) from public, anon, authenticated;
grant execute on function public.complete_self_registration(uuid, text, text, text, text, text, text, date, text, text) to service_role;
