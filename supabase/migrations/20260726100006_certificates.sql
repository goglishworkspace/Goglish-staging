-- Phase 3: certificates (Section 8 - "Certificates عند الاجتياز"), PDF stored
-- in a private Storage bucket, downloaded via signed URL (same pattern as
-- lesson_resources in Phase 2).
insert into storage.buckets (id, name, public)
values ('certificates', 'certificates', false)
on conflict (id) do nothing;

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  attempt_id uuid not null references public.student_exam_attempts(id) on delete cascade,
  certificate_number text not null unique,
  storage_path text not null,
  issued_at timestamptz not null default now(),
  unique (attempt_id)
);

create index certificates_user_id_idx on public.certificates(user_id);
