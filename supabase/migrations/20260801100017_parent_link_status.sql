-- Self-service parent<->child linking (POST /api/parent/children) currently
-- grants a parent instant, silent access to a student's grades/subscription/
-- watch-time the moment they type a correct national ID, with zero input
-- from the student. This adds a status so new links start as a request the
-- student must approve before the parent actually gets access.
--
-- Existing rows predate this feature and were already live parent access -
-- backfilling them as 'approved' (not 'pending') preserves that, rather than
-- silently revoking families' current access. New inserts default to
-- 'pending' going forward.
alter table public.parent_student_links
  add column status text not null default 'approved' check (status in ('pending', 'approved', 'rejected'));

alter table public.parent_student_links alter column status set default 'pending';
