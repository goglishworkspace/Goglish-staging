-- Homepage featured video (admin-managed, shown before the Honor Board
-- section on the landing page) - reuses the generic platform_settings store
-- and its existing admin UI (/admin/settings), same as homepage.hero_title.
insert into public.platform_settings (key, value) values
  ('homepage.featured_video_url', 'null')
on conflict (key) do nothing;
