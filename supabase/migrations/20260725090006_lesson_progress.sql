-- Phase 2: per-student per-lesson progress. Course-level progress is
-- computed on demand by aggregating this table, not stored separately.
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  progress_seconds int not null default 0,
  completed_at timestamptz,
  last_watched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index lesson_progress_lesson_id_idx on public.lesson_progress(lesson_id);
create index lesson_progress_user_id_idx on public.lesson_progress(user_id);
