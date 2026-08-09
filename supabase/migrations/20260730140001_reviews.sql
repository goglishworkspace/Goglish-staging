-- Phase 7: Reviews & Ratings (Section 20). Unified table for both course and
-- teacher reviews (target_type) instead of two near-identical tables.
-- courses never got rating columns in Phase 2; teacher_profiles did
-- (rating_avg/rating_count) but nothing ever populated them until now.
alter table public.courses
  add column rating_avg numeric(3, 2) not null default 0,
  add column rating_count int not null default 0;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('course', 'teacher')),
  target_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  like_count int not null default 0,
  report_count int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create index reviews_target_idx on public.reviews(target_type, target_id);

alter table public.reviews enable row level security;

create policy "reviews_read" on public.reviews
  for select to anon, authenticated
  using (
    deleted_at is null
    or user_id = auth.uid()
    or public.user_has_any_role('admin', 'super_admin', 'moderator')
  );

-- Single self-service actor (the reviewer) - completion eligibility is a
-- business rule enforced in review.service.ts, not something RLS needs to
-- know about.
create policy "reviews_insert_own" on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid());

-- Soft-delete only (deleted_at) - the review's own author, or staff.
create policy "reviews_soft_delete" on public.reviews
  for update to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'moderator'))
  with check (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'moderator'));

create table public.review_likes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

alter table public.review_likes enable row level security;

create policy "review_likes_read" on public.review_likes
  for select to anon, authenticated using (true);

create policy "review_likes_insert_own" on public.review_likes
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "review_likes_delete_own" on public.review_likes
  for delete to authenticated
  using (user_id = auth.uid());

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (review_id, reporter_user_id)
);

alter table public.review_reports enable row level security;

create policy "review_reports_insert_own" on public.review_reports
  for insert to authenticated
  with check (reporter_user_id = auth.uid());

create policy "review_reports_read_own_or_staff" on public.review_reports
  for select to authenticated
  using (reporter_user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'moderator'));

-- Keeps courses.rating_avg/rating_count and teacher_profiles.rating_avg/
-- rating_count in sync by recomputing from scratch (avoids incremental-math
-- drift) whenever a review is added, changed, or (soft-)deleted.
create or replace function public.sync_rating_avg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_type text := coalesce(new.target_type, old.target_type);
  v_target_id uuid := coalesce(new.target_id, old.target_id);
  v_avg numeric(3, 2);
  v_count int;
begin
  select coalesce(avg(rating), 0)::numeric(3, 2), count(*)
  into v_avg, v_count
  from public.reviews
  where target_type = v_target_type and target_id = v_target_id and deleted_at is null;

  if v_target_type = 'course' then
    update public.courses set rating_avg = v_avg, rating_count = v_count where id = v_target_id;
  elsif v_target_type = 'teacher' then
    update public.teacher_profiles set rating_avg = v_avg, rating_count = v_count where teacher_id = v_target_id;
  end if;

  return null;
end;
$$;

create trigger reviews_sync_rating
  after insert or update or delete on public.reviews
  for each row
  execute function public.sync_rating_avg();

create or replace function public.sync_review_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reviews
  set like_count = (select count(*) from public.review_likes where review_id = coalesce(new.review_id, old.review_id))
  where id = coalesce(new.review_id, old.review_id);
  return null;
end;
$$;

create trigger review_likes_sync_count
  after insert or delete on public.review_likes
  for each row
  execute function public.sync_review_like_count();

create or replace function public.increment_review_report_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reviews set report_count = report_count + 1 where id = new.review_id;
  return new;
end;
$$;

create trigger review_reports_increment_count
  after insert on public.review_reports
  for each row
  execute function public.increment_review_report_count();
