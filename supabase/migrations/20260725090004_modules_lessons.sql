-- Phase 2: modules (plain containers) + lessons (the actual gated content unit)
create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  order_index int not null,
  teacher_id uuid references public.teachers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger modules_set_updated_at
  before update on public.modules
  for each row
  execute function public.set_updated_at();

create index modules_course_id_idx on public.modules(course_id);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  description text,
  order_index int not null,
  teacher_id uuid references public.teachers(id) on delete set null,
  bunny_video_id text,
  bunny_video_duration_seconds int,
  youtube_preview_video_id text,
  is_preview boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'rejected')),
  submitted_at timestamptz,
  rejection_reason text,
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger lessons_set_updated_at
  before update on public.lessons
  for each row
  execute function public.set_updated_at();

create index lessons_module_id_idx on public.lessons(module_id);
create index lessons_status_idx on public.lessons(status);
