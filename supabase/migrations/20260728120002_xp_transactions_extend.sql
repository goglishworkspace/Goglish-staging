-- Phase 5: widen xp_transactions for Daily Streak / Weekly Challenge sources
-- (Section 10) and per-subject XP attribution for the Subject Leaderboard
-- (Section 10 - "Subject Leaderboard: ترتيب الطلاب داخل كل مادة"). Migration
-- from Phase 3 already applied, so this extends it rather than editing it.
alter table public.xp_transactions
  add column subject_id uuid references public.subjects(id);

-- streak/weekly_challenge events have no natural source row to point at.
alter table public.xp_transactions
  alter column source_id drop not null;

alter table public.xp_transactions
  drop constraint xp_transactions_source_type_check;

alter table public.xp_transactions
  add constraint xp_transactions_source_type_check
  check (source_type in ('quiz', 'exam', 'streak', 'weekly_challenge'));

create index xp_transactions_subject_id_idx on public.xp_transactions(subject_id) where subject_id is not null;
