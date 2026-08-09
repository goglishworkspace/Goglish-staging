-- Phase 2: lesson resources (PDFs/files) - Supabase Storage, private bucket.
-- Uploads/downloads always go through API routes using the admin client to
-- create Signed URLs, so no storage.objects RLS policies are needed here.
insert into storage.buckets (id, name, public)
values ('lesson-resources', 'lesson-resources', false)
on conflict (id) do nothing;

create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  title text not null,
  storage_path text not null,
  file_type text not null,
  file_size_bytes bigint not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index lesson_resources_lesson_id_idx on public.lesson_resources(lesson_id);
