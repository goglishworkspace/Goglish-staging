-- Teacher-initiated "request deletion" flow: teachers can no longer hard-
-- delete published content directly (data loss risk - e.g. a quiz with
-- student attempts). Instead they flag it here; the actual delete is
-- performed by staff from /admin/deletion-requests (see that route).
alter table public.modules
  add column deletion_requested_at timestamptz,
  add column deletion_requested_by uuid references auth.users(id);

alter table public.lessons
  add column deletion_requested_at timestamptz,
  add column deletion_requested_by uuid references auth.users(id);

alter table public.quizzes
  add column deletion_requested_at timestamptz,
  add column deletion_requested_by uuid references auth.users(id);

alter table public.exams
  add column deletion_requested_at timestamptz,
  add column deletion_requested_by uuid references auth.users(id);

alter table public.questions
  add column deletion_requested_at timestamptz,
  add column deletion_requested_by uuid references auth.users(id);

alter table public.lesson_resources
  add column deletion_requested_at timestamptz,
  add column deletion_requested_by uuid references auth.users(id);
