-- Phase 3: quiz attempts + per-question responses.
create table public.student_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_number int not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  randomized_order jsonb not null,
  time_limit_seconds int,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score_percent numeric,
  passed boolean,
  created_at timestamptz not null default now(),
  unique (quiz_id, user_id, attempt_number)
);

create index student_quiz_attempts_user_id_idx on public.student_quiz_attempts(user_id);
create index student_quiz_attempts_quiz_id_idx on public.student_quiz_attempts(quiz_id);

create table public.student_quiz_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.student_quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  response jsonb not null,
  is_correct boolean,
  points_awarded numeric not null default 0,
  unique (attempt_id, question_id)
);

create index student_quiz_responses_attempt_id_idx on public.student_quiz_responses(attempt_id);
