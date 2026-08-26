-- Phase 5: Badges (Section 10 - "Badges System إنجازات تُمنح تلقائياً").
-- criteria_type/criteria_value is deliberately narrow (not a generic rule
-- engine) - these are the only metrics badge.service.ts can actually
-- evaluate today; new criteria types require a matching evaluator branch.
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null,
  icon text not null,
  criteria_type text not null check (
    criteria_type in ('xp_total', 'streak_days', 'level_reached', 'quizzes_passed', 'exams_passed')
  ),
  criteria_value int not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.badges (code, title, description, icon, criteria_type, criteria_value) values
  ('first_quiz', 'أول اختبار', 'خلّصت أول Quiz بنجاح', '🎯', 'quizzes_passed', 1),
  ('quiz_master_10', 'محترف الاختبارات', 'نجحت في 10 Quizzes', '🧠', 'quizzes_passed', 10),
  ('first_exam', 'أول امتحان', 'خلّصت أول Exam بنجاح', '📝', 'exams_passed', 1),
  ('exam_ace_5', 'نجم الامتحانات', 'نجحت في 5 امتحانات', '🏅', 'exams_passed', 5),
  ('streak_3', 'مذاكرة 3 أيام', '3 أيام مذاكرة متتالية', '🔥', 'streak_days', 3),
  ('streak_7', 'أسبوع كامل', '7 أيام مذاكرة متتالية', '🔥', 'streak_days', 7),
  ('streak_30', 'شهر مذاكرة', '30 يوم مذاكرة متتالية', '🔥', 'streak_days', 30),
  ('level_5', 'وصلت المستوى 5', 'وصلت لمستوى نجم صاعد', '⭐', 'level_reached', 5),
  ('level_10', 'وصلت المستوى 10', 'وصلت لأعلى مستوى', '👑', 'level_reached', 10),
  ('xp_1000', '1000 نقطة خبرة', 'جمعت 1000 XP', '💎', 'xp_total', 1000),
  ('xp_5000', '5000 نقطة خبرة', 'جمعت 5000 XP', '💎', 'xp_total', 5000);

alter table public.badges enable row level security;

create policy "badges_public_read" on public.badges
  for select to anon, authenticated using (true);

create policy "badges_manage" on public.badges
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'content_manager'));

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create index user_badges_user_id_idx on public.user_badges(user_id);

alter table public.user_badges enable row level security;

-- Read-only for clients: only badge.service.ts (via the admin client) ever
-- writes here.
create policy "user_badges_owner_read" on public.user_badges
  for select to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'));
