-- Phase 13: Admin User Management Enhancements
-- 1. Auto-incrementing User Code (e.g. GOG-1001) for clean human identification
create sequence if not exists public.user_code_seq start with 1001;

alter table public.profiles
  add column if not exists user_code integer default nextval('public.user_code_seq'),
  add column if not exists admin_notes text;

-- Backfill any existing profiles that don't have user_code yet
update public.profiles
set user_code = nextval('public.user_code_seq')
where user_code is null;

create unique index if not exists idx_profiles_user_code on public.profiles(user_code);

-- 2. Enhance admin policies for managing profiles
create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (public.user_has_any_role('admin', 'super_admin', 'support'));

-- 3. Device policies for staff inspection and management
drop policy if exists "devices_admin_all" on public.devices;
create policy "devices_admin_all" on public.devices
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (public.user_has_any_role('admin', 'super_admin', 'support'));

-- 4. Audit logs read policy for staff
drop policy if exists "audit_logs_staff_read" on public.audit_logs;
create policy "audit_logs_staff_read" on public.audit_logs
  for select to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'support'));

-- 5. Allow admin_grant in course_entitlements
alter table public.course_entitlements drop constraint if exists course_entitlements_source_check;
alter table public.course_entitlements add constraint course_entitlements_source_check check (source in ('purchase', 'bundle', 'coupon', 'admin_grant'));
