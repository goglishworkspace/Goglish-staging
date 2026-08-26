-- Phase 7: Settings API (Section 16). A single key-value store instead of a
-- table per category (General/Branding/Email/SMS/...) - simpler and covers
-- every category the same way. Secrets (Stripe keys, Bunny auth key, etc.)
-- stay in env vars as before; this table is for admin-configurable
-- *behavioral* knobs. Note: existing hardcoded constants from earlier phases
-- (e.g. the 3-warning comment threshold in comment-moderation.service.ts)
-- are NOT rewired to read from here - that would mean touching every past
-- phase's code, out of scope for introducing the settings store itself.
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create trigger platform_settings_set_updated_at
  before update on public.platform_settings
  for each row
  execute function public.set_updated_at();

insert into public.platform_settings (key, value) values
  ('general.site_name', '"Goglish"'),
  ('general.maintenance_mode', 'false'),
  ('branding.theme', '{"primary": "#F5C518", "secondary": "#1A1A2E"}'),
  ('branding.logo_url', 'null'),
  ('branding.favicon_url', 'null'),
  ('homepage.hero_title', '"ذاكر صح...وادخل الامتحان وانت واثق"'),
  ('homepage.hero_subtitle', '"شرح واضح، تدريبات ضخمة، امتحانات بتايمر"'),
  ('email.from_address', '"no-reply@goglish.com"'),
  ('sms.provider', '"stub"'),
  ('whatsapp.provider', '"stub"'),
  ('storage.provider', '"supabase"'),
  ('bunny.enabled', 'true'),
  ('youtube.enabled', 'true'),
  ('comments_moderation.max_warnings', '3'),
  ('comments_moderation.suspension_hours', '24'),
  ('live_class.reminder_minutes_before', '30'),
  ('exam.default_passing_score_percent', '50'),
  ('leaderboard.refresh_interval_minutes', '5'),
  ('notifications.channels_enabled', '{"email": true, "sms": true, "push": true, "whatsapp": true}');

alter table public.platform_settings enable row level security;

create policy "platform_settings_staff_read" on public.platform_settings
  for select to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'support'));

create policy "platform_settings_manage" on public.platform_settings
  for update to authenticated
  using (public.user_has_any_role('admin', 'super_admin'))
  with check (public.user_has_any_role('admin', 'super_admin'));
