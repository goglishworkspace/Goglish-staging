-- Phase 7: SEO (Section 16 mention + Section 27-adjacent). Keyed by path so
-- both fixed pages ("/") and route patterns ("/courses/[slug]") can carry
-- their own meta/OG/schema overrides. Publicly readable - app/sitemap.ts and
-- future page metadata both need it without a session.
create table public.seo_settings (
  path text primary key,
  title text,
  description text,
  og_image_url text,
  canonical_url text,
  schema_json jsonb,
  updated_at timestamptz not null default now()
);

create trigger seo_settings_set_updated_at
  before update on public.seo_settings
  for each row
  execute function public.set_updated_at();

insert into public.seo_settings (path, title, description) values
  ('/', 'Goglish - منصة تعليمية تفاعلية', 'ذاكر صح...وادخل الامتحان وانت واثق - شرح واضح وتدريبات ضخمة وامتحانات بتايمر');

alter table public.seo_settings enable row level security;

create policy "seo_settings_public_read" on public.seo_settings
  for select to anon, authenticated using (true);

create policy "seo_settings_manage" on public.seo_settings
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'content_manager'));
