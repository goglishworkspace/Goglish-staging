-- Phase 6: per-channel opt-out (Section 12 - "Notification Preferences").
-- in_app is always on and has no row here - a missing row for a given
-- channel means "enabled" (the default), see notification-dispatch.service.ts.
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'push', 'whatsapp')),
  enabled boolean not null default true,
  unique (user_id, channel)
);

create index notification_preferences_user_id_idx on public.notification_preferences(user_id);

alter table public.notification_preferences enable row level security;

create policy "notification_preferences_owner" on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
