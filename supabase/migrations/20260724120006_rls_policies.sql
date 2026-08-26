-- Phase 1: Row Level Security policies (Section 5 / Section 22 / Section 34)

-- Helper: roles of the currently authenticated user. SECURITY DEFINER so it can
-- read role_user/roles without recursively triggering their own RLS policies.
create or replace function public.current_user_roles()
returns text[]
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(array_agg(r.name), array[]::text[])
  from public.role_user ru
  join public.roles r on r.id = ru.role_id
  where ru.user_id = auth.uid();
$$;

create or replace function public.user_has_any_role(variadic p_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.role_user ru
    join public.roles r on r.id = ru.role_id
    where ru.user_id = auth.uid()
      and r.name = any(p_roles)
  );
$$;

revoke all on function public.current_user_roles() from public;
revoke all on function public.user_has_any_role(text[]) from public;
grant execute on function public.current_user_roles() to authenticated;
grant execute on function public.user_has_any_role(text[]) to authenticated;

-- profiles -------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_staff"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.user_has_any_role('admin', 'super_admin', 'support', 'moderator')
  );

create policy "profiles_update_own_or_staff"
  on public.profiles for update
  to authenticated
  using (
    id = auth.uid()
    or public.user_has_any_role('admin', 'super_admin', 'support')
  )
  with check (
    id = auth.uid()
    or public.user_has_any_role('admin', 'super_admin', 'support')
  );

-- roles / permissions / permission_role --------------------------------
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.permission_role enable row level security;

create policy "roles_select_admin"
  on public.roles for select
  to authenticated
  using (public.user_has_any_role('admin', 'super_admin'));

create policy "permissions_select_admin"
  on public.permissions for select
  to authenticated
  using (public.user_has_any_role('admin', 'super_admin'));

create policy "permission_role_select_admin"
  on public.permission_role for select
  to authenticated
  using (public.user_has_any_role('admin', 'super_admin'));

-- role_user --------------------------------------------------------------
alter table public.role_user enable row level security;

create policy "role_user_select_own_or_admin"
  on public.role_user for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.user_has_any_role('admin', 'super_admin')
  );

create policy "role_user_manage_admin"
  on public.role_user for all
  to authenticated
  using (public.user_has_any_role('admin', 'super_admin'))
  with check (public.user_has_any_role('admin', 'super_admin'));

-- devices ------------------------------------------------------------------
alter table public.devices enable row level security;

create policy "devices_select_own_or_admin"
  on public.devices for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.user_has_any_role('admin', 'super_admin')
  );

create policy "devices_insert_own"
  on public.devices for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "devices_delete_own_or_admin"
  on public.devices for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.user_has_any_role('admin', 'super_admin')
  );

create policy "devices_update_own_or_admin"
  on public.devices for update
  to authenticated
  using (
    user_id = auth.uid()
    or public.user_has_any_role('admin', 'super_admin')
  )
  with check (
    user_id = auth.uid()
    or public.user_has_any_role('admin', 'super_admin')
  );

-- rate_limit_counters --------------------------------------------------
-- RLS enabled with no policies at all: only the service_role (which bypasses
-- RLS) may read/write this table. No client, authenticated or anon, gets access.
alter table public.rate_limit_counters enable row level security;
