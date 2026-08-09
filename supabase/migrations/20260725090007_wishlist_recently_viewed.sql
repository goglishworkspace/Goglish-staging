-- Phase 2: Wishlist/Favorites + Recently Viewed (Section 19)
create table public.course_wishlist (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

create table public.favorite_teachers (
  user_id uuid not null references auth.users(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, teacher_id)
);

create table public.recently_viewed_courses (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
