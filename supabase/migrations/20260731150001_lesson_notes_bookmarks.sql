-- Phase 9: lesson-level Notes and Bookmarks (Section 7 - video player features).
-- Both are timestamped to a specific second in the video, like chapter
-- markers, so the student can click one to seek back. Purely self-service -
-- no server-decided logic, so plain session client + own-row RLS is enough
-- (same "single actor, no server-computed status" rule already used for
-- wishlist/recently-viewed).
create table public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  timestamp_seconds int not null check (timestamp_seconds >= 0),
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger lesson_notes_set_updated_at
  before update on public.lesson_notes
  for each row
  execute function public.set_updated_at();

create index lesson_notes_lesson_id_user_id_idx on public.lesson_notes(lesson_id, user_id);

create table public.lesson_bookmarks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  timestamp_seconds int not null check (timestamp_seconds >= 0),
  label text,
  created_at timestamptz not null default now()
);

create index lesson_bookmarks_lesson_id_user_id_idx on public.lesson_bookmarks(lesson_id, user_id);

alter table public.lesson_notes enable row level security;
alter table public.lesson_bookmarks enable row level security;

create policy "lesson_notes_own" on public.lesson_notes
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "lesson_bookmarks_own" on public.lesson_bookmarks
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.lesson_notes, public.lesson_bookmarks to authenticated;
grant select, insert, update, delete on public.lesson_notes, public.lesson_bookmarks to service_role;
