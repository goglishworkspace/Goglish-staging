-- Phase 2: teachers registry + public-facing teacher profiles
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table public.teacher_profiles (
  teacher_id uuid primary key references public.teachers(id) on delete cascade,
  -- Public display name shown on the teacher directory/landing page.
  -- Denormalized on purpose: profiles.first_name/last_name (Phase 1) is
  -- private (owner/staff-only RLS), so public teacher cards can't join it.
  display_name text,
  bio text,
  photo_url text,
  experience_years int,
  rating_avg numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  updated_at timestamptz not null default now()
);

create trigger teacher_profiles_set_updated_at
  before update on public.teacher_profiles
  for each row
  execute function public.set_updated_at();

-- Keeps the 1:1 relationship always populated - a teachers row always has a
-- (possibly empty) teacher_profiles row to edit, no separate insert step needed.
create or replace function public.create_teacher_profile()
returns trigger
language plpgsql
as $$
begin
  insert into public.teacher_profiles (teacher_id) values (new.id);
  return new;
end;
$$;

create trigger teachers_create_profile
  after insert on public.teachers
  for each row
  execute function public.create_teacher_profile();

alter table public.subjects
  add constraint subjects_primary_teacher_id_fkey
  foreign key (primary_teacher_id) references public.teachers(id) on delete set null;
