-- Phase 3: exam attempts + per-question responses. UNIQUE(exam_id, user_id)
-- enforces "محاولة واحدة فقط... لا استثناءات" (Section 8) at the DB level,
-- not just in application logic.
create table public.student_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  randomized_order jsonb not null,
  time_limit_seconds int,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  auto_submitted boolean not null default false,
  left_window_at timestamptz,
  score_percent numeric,
  passed boolean,
  created_at timestamptz not null default now(),
  unique (exam_id, user_id)
);

create index student_exam_attempts_user_id_idx on public.student_exam_attempts(user_id);
create index student_exam_attempts_exam_id_idx on public.student_exam_attempts(exam_id);

create table public.student_exam_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.student_exam_attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  response jsonb not null,
  is_correct boolean,
  points_awarded numeric not null default 0,
  unique (attempt_id, question_id)
);

create index student_exam_responses_attempt_id_idx on public.student_exam_responses(attempt_id);
