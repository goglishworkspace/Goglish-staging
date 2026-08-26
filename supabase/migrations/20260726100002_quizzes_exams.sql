-- Phase 3: quizzes (Section 8 - Quiz, including Homework as quizzes.kind)
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  kind text not null default 'quiz' check (kind in ('quiz', 'homework')),
  title text not null,
  max_attempts int,
  time_limit_seconds int,
  passing_score_percent int not null default 50,
  shuffle_questions boolean not null default true,
  shuffle_options boolean not null default true,
  xp_reward int not null default 10,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger quizzes_set_updated_at
  before update on public.quizzes
  for each row
  execute function public.set_updated_at();

create index quizzes_lesson_id_idx on public.quizzes(lesson_id);

-- Phase 3: exams (Section 8 - Exam)
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  time_limit_seconds int,
  passing_score_percent int not null default 50,
  shuffle_questions boolean not null default true,
  solutions_visible_at timestamptz,
  xp_reward int not null default 50,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger exams_set_updated_at
  before update on public.exams
  for each row
  execute function public.set_updated_at();

create index exams_course_id_idx on public.exams(course_id);
