-- Phase 5: Weekly Challenge (Section 10). Progress is computed live from
-- xp_transactions / attempt / lesson_progress tables within
-- [starts_at, ends_at) rather than tracked with a separately-incremented
-- counter - avoids any race between concurrent activity and a progress
-- update.
create table public.weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  metric text not null check (
    metric in ('xp_earned', 'quizzes_passed', 'exams_passed', 'lessons_completed')
  ),
  target_value int not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  xp_reward int not null default 0,
  coin_reward int not null default 0,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create trigger weekly_challenges_set_updated_at
  before update on public.weekly_challenges
  for each row
  execute function public.set_updated_at();

create index weekly_challenges_active_idx on public.weekly_challenges(starts_at, ends_at);

alter table public.weekly_challenges enable row level security;

create policy "weekly_challenges_public_read" on public.weekly_challenges
  for select to anon, authenticated using (true);

create policy "weekly_challenges_manage" on public.weekly_challenges
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'content_manager'));

create table public.weekly_challenge_completions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.weekly_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create index weekly_challenge_completions_user_id_idx on public.weekly_challenge_completions(user_id);

alter table public.weekly_challenge_completions enable row level security;

-- Read-only for clients: only weekly-challenge.service.ts (via the admin
-- client) ever writes here.
create policy "weekly_challenge_completions_owner_read" on public.weekly_challenge_completions
  for select to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'));
