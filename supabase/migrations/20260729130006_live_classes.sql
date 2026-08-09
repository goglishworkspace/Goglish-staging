-- Phase 6: Live Classes (Section 14). No real streaming provider is named
-- anywhere in the prompt (unlike Bunny/YouTube for on-demand video), so
-- `meeting_url` is a plain external link (Zoom/Meet) the admin sets - this
-- system's job is scheduling, notifications, attendance, session-scoped Q&A,
-- and a real post-session replay via the existing Bunny VideoProvider.
create table public.live_classes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id),
  title text not null,
  meeting_url text,
  scheduled_at timestamptz not null,
  duration_minutes int not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended', 'cancelled')),
  bunny_video_id text,
  reminder_sent_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger live_classes_set_updated_at
  before update on public.live_classes
  for each row
  execute function public.set_updated_at();

create index live_classes_course_id_idx on public.live_classes(course_id);
create index live_classes_scheduled_at_idx on public.live_classes(scheduled_at);

alter table public.live_classes enable row level security;

-- Public read (schedule is browsable, like the course catalog); every write
-- (create/reschedule/cancel/start/end/attach recording) goes through the
-- admin client after the route validates admin role or teacher ownership -
-- see live-class.service.ts. No client write policy needed.
create policy "live_classes_public_read" on public.live_classes
  for select to anon, authenticated using (true);

create table public.live_class_attendance (
  id uuid primary key default gen_random_uuid(),
  live_class_id uuid not null references public.live_classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (live_class_id, user_id)
);

create index live_class_attendance_live_class_id_idx on public.live_class_attendance(live_class_id);

alter table public.live_class_attendance enable row level security;

create policy "live_class_attendance_read" on public.live_class_attendance
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.live_classes lc
      where lc.id = live_class_attendance.live_class_id and lc.teacher_id = public.current_teacher_id()
    )
    or public.user_has_any_role('admin', 'super_admin', 'support', 'moderator')
  );

create table public.live_class_questions (
  id uuid primary key default gen_random_uuid(),
  live_class_id uuid not null references public.live_classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  answer_text text,
  answered boolean not null default false,
  created_at timestamptz not null default now()
);

create index live_class_questions_live_class_id_idx on public.live_class_questions(live_class_id);

alter table public.live_class_questions enable row level security;

-- Q&A content isn't the protected asset (the video is) - readable like
-- lesson comments, same reasoning.
create policy "live_class_questions_public_read" on public.live_class_questions
  for select to anon, authenticated using (true);
