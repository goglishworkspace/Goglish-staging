-- Phase 3: questions/answers shared between quizzes and exams (see plan for
-- why this is deliberately one shared schema rather than two parallel ones -
-- both need the exact same 7 question types).
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references public.quizzes(id) on delete cascade,
  exam_id uuid references public.exams(id) on delete cascade,
  type text not null check (
    type in ('mcq', 'true_false', 'matching', 'essay', 'ordering', 'fill_blank', 'drag_drop')
  ),
  prompt text not null,
  points numeric not null default 1,
  order_index int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_exactly_one_parent check ((quiz_id is not null) <> (exam_id is not null))
);

create trigger questions_set_updated_at
  before update on public.questions
  for each row
  execute function public.set_updated_at();

create index questions_quiz_id_idx on public.questions(quiz_id);
create index questions_exam_id_idx on public.questions(exam_id);

-- Flexible shape covering all 7 question types - see plan's table for how
-- each type uses these columns (content/is_correct/order_index/side/match_group).
create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  content text not null,
  is_correct boolean,
  order_index int,
  side text check (side in ('left', 'right')),
  match_group text,
  created_at timestamptz not null default now()
);

create index answers_question_id_idx on public.answers(question_id);
