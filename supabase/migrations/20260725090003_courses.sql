-- Phase 2: courses + teaching team assignment (Section 6 - Teacher Collaboration)
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  cover_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'rejected')),
  submitted_at timestamptz,
  rejection_reason text,
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_id, slug)
);

create trigger courses_set_updated_at
  before update on public.courses
  for each row
  execute function public.set_updated_at();

create index courses_subject_id_idx on public.courses(subject_id);
create index courses_status_idx on public.courses(status);
create index courses_created_by_idx on public.courses(created_by);

create table public.course_teachers (
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (course_id, teacher_id)
);

create index course_teachers_teacher_id_idx on public.course_teachers(teacher_id);
