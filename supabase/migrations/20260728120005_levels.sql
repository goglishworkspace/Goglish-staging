-- Phase 5: Levels (Section 10 - "Levels System مستويات بناءً على XP").
-- Admin-configurable thresholds instead of a hardcoded formula, same
-- philosophy as subscription_plans (Phase 4).
create table public.levels (
  level_number int primary key,
  min_xp int not null unique,
  title text not null
);

insert into public.levels (level_number, min_xp, title) values
  (1, 0, 'مبتدئ'),
  (2, 100, 'متعلم'),
  (3, 250, 'مجتهد'),
  (4, 500, 'متفوق'),
  (5, 1000, 'نجم صاعد'),
  (6, 1750, 'خبير'),
  (7, 2750, 'محترف'),
  (8, 4000, 'بطل المذاكرة'),
  (9, 5500, 'أسطورة'),
  (10, 7500, 'عبقري Goglish');

alter table public.levels enable row level security;

create policy "levels_public_read" on public.levels
  for select to anon, authenticated using (true);

create policy "levels_manage" on public.levels
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'content_manager'));
