-- Phase 6: Lesson Comments (Section 11) - replaces the removed group chat.
-- Every comment goes through Draft-like moderation: pending -> approved/
-- rejected. No client INSERT policy on purpose - the resulting status is a
-- system decision (auto-filter result), always written via the admin client
-- from POST /api/lessons/[id]/comments (see comment-moderation.service.ts),
-- same trust boundary as orders/payments in Phase 4.
create table public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.lesson_comments(id) on delete cascade,
  content text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  -- Distinguishes an auto-filter rejection (counts toward the 3-strike
  -- warning system) from a manual admin/moderator rejection (doesn't -
  -- Section 11/38 tie the strikes specifically to filter violations).
  auto_rejected boolean not null default false,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  report_count int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger lesson_comments_set_updated_at
  before update on public.lesson_comments
  for each row
  execute function public.set_updated_at();

create index lesson_comments_lesson_id_idx on public.lesson_comments(lesson_id);
create index lesson_comments_user_id_idx on public.lesson_comments(user_id);
create index lesson_comments_status_idx on public.lesson_comments(status);

alter table public.lesson_comments enable row level security;

-- Approved + not-deleted comments are visible to everyone (even anon, like
-- course browsing); a student always sees their own regardless of status
-- (Section 11 - "الطالب يقدر يشوف حالة تعليقه الخاص بيه بس"); staff sees all.
create policy "lesson_comments_read" on public.lesson_comments
  for select to anon, authenticated
  using (
    (status = 'approved' and deleted_at is null)
    or user_id = auth.uid()
    or public.user_has_any_role('admin', 'super_admin', 'moderator')
  );

-- Soft-delete only (deleted_at) - the owner or staff. The column-restricted
-- GRANT in phase6_grants.sql is what actually limits this to deleted_at.
create policy "lesson_comments_soft_delete" on public.lesson_comments
  for update to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'moderator'))
  with check (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'moderator'));

create table public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.lesson_comments(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_user_id)
);

alter table public.comment_reports enable row level security;

create policy "comment_reports_insert_own" on public.comment_reports
  for insert to authenticated
  with check (reporter_user_id = auth.uid());

create policy "comment_reports_read_own_or_staff" on public.comment_reports
  for select to authenticated
  using (reporter_user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'moderator'));

create or replace function public.increment_comment_report_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.lesson_comments set report_count = report_count + 1 where id = new.comment_id;
  return new;
end;
$$;

create trigger comment_reports_increment_count
  after insert on public.comment_reports
  for each row
  execute function public.increment_comment_report_count();
