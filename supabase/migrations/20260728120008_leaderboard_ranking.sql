-- Phase 5: leaderboard_cache (Section 10 - "لوحتان مستقلتان: Subject +
-- Global") and ranking_history (Section 37 - Student Reports). Cache is
-- fully truncated + repopulated on every refresh (see
-- refresh_leaderboard_cache() in leaderboard_cron.sql) rather than upserted
-- row-by-row, so no unique constraint is needed here beyond the primary key.
create table public.leaderboard_cache (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('global', 'subject')),
  subject_id uuid references public.subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rank int not null,
  xp int not null,
  computed_at timestamptz not null default now()
);

create index leaderboard_cache_scope_subject_rank_idx
  on public.leaderboard_cache(scope, subject_id, rank);

alter table public.leaderboard_cache enable row level security;

-- Public "Honor Board" content (Section 28 - Landing Page mentions top
-- students publicly) - readable by anyone, written only by
-- refresh_leaderboard_cache() (service_role, called from pg_cron).
create policy "leaderboard_cache_public_read" on public.leaderboard_cache
  for select to anon, authenticated using (true);

create table public.ranking_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('global', 'subject')),
  subject_id uuid references public.subjects(id) on delete cascade,
  rank int not null,
  xp int not null,
  recorded_at timestamptz not null default now()
);

create index ranking_history_user_id_recorded_at_idx on public.ranking_history(user_id, recorded_at);

alter table public.ranking_history enable row level security;

-- Personal history, not public - only record_ranking_history() (service_role)
-- writes here.
create policy "ranking_history_owner_read" on public.ranking_history
  for select to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'));
