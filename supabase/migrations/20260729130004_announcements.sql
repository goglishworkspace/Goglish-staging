-- Phase 6: Announcement System - admin broadcasts, fanned out to
-- `notifications` at creation time (see announcement.service.ts). Scope is
-- deliberately just 'all' | 'grade' - a 'subject' scope would need joining
-- enrollments/entitlements, more than what's asked for here.
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target text not null check (target in ('all', 'grade')),
  target_grade text check (target_grade in ('grade1', 'grade2', 'grade3')),
  created_by uuid not null references auth.users(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (target != 'grade' or target_grade is not null)
);

alter table public.announcements enable row level security;

create policy "announcements_public_read" on public.announcements
  for select to anon, authenticated using (true);

create policy "announcements_manage" on public.announcements
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'content_manager'));
