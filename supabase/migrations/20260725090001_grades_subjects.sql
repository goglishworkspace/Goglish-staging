-- Phase 2: grades & subjects (Section 6 - Course Structure)
create table public.grades (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  order_index int not null,
  created_at timestamptz not null default now()
);

insert into public.grades (name, slug, order_index) values
  ('أولى ثانوي', 'grade1', 1),
  ('ثانية ثانوي', 'grade2', 2),
  ('ثالثة ثانوي', 'grade3', 3);

-- teachers/teacher_profiles are created in a later migration; the FK below
-- is added there once that table exists (see 20260725090002).
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.grades(id) on delete cascade,
  name text not null,
  slug text not null,
  primary_teacher_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grade_id, slug)
);

create trigger subjects_set_updated_at
  before update on public.subjects
  for each row
  execute function public.set_updated_at();

create index subjects_grade_id_idx on public.subjects(grade_id);
