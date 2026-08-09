-- Phase 4: minimal in-app notifications (Section 12 foundation) and a
-- lightweight parent<->student link (Section 13 foundation, not the full
-- Parent Portal) just enough to notify a parent on a Premium payment.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications(user_id);

create table public.parent_student_links (
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  student_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_user_id, student_user_id)
);
