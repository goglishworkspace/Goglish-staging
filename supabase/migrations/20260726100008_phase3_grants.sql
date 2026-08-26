-- Phase 3: base table privileges (see 20260724120010_grants.sql - RLS alone
-- is not enough, Postgres checks GRANTs first regardless of role).

grant select on
  public.quizzes,
  public.exams,
  public.questions,
  public.answers
to anon, authenticated;

grant insert, update, delete on
  public.quizzes,
  public.exams,
  public.questions,
  public.answers
to authenticated;

-- Owner-scoped tables: no anon access.
grant select, insert, update, delete on
  public.student_quiz_attempts,
  public.student_quiz_responses,
  public.student_exam_attempts,
  public.student_exam_responses
to authenticated;

-- Read-only for clients: only service_role writes (XP/certificate services).
grant select on public.xp_transactions, public.certificates to authenticated;

grant select, insert, update, delete on
  public.quizzes,
  public.exams,
  public.questions,
  public.answers,
  public.student_quiz_attempts,
  public.student_quiz_responses,
  public.student_exam_attempts,
  public.student_exam_responses,
  public.xp_transactions,
  public.certificates
to service_role;
