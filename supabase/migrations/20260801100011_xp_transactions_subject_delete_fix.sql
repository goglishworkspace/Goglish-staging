-- xp_transactions.subject_id (20260728120002_xp_transactions_extend.sql) was
-- added with no ON DELETE behavior, defaulting to RESTRICT - deleting a
-- subject that any student has ever earned XP under (quiz/exam completion)
-- fails with a foreign key violation instead of actually deleting the row.
-- xp_transactions is an append-only ledger (profiles.xp_total is a running
-- total updated separately, not derived from this table - see
-- award_gamification_rewards), so the historical XP-earned record should
-- survive the subject's deletion; only the subject attribution is lost.
alter table public.xp_transactions drop constraint xp_transactions_subject_id_fkey;
alter table public.xp_transactions
  add constraint xp_transactions_subject_id_fkey
  foreign key (subject_id) references public.subjects(id) on delete set null;
