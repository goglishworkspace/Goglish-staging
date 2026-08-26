-- P1.5 follow-up: the INSERT policies added in 20260801100021 only checked
-- ownership (user_id = auth.uid()), not field values - a client could still
-- INSERT a brand-new attempt row already claiming status='submitted',
-- passed=true, score_percent=100, bypassing real scoring entirely. The
-- legitimate "start attempt" routes (app/api/quizzes/[id]/start,
-- app/api/exams/[id]/start) never set these columns themselves - they always
-- rely on the table defaults - so restricting INSERT to that exact shape
-- doesn't break anything real, only forged pre-scored rows.

DROP POLICY IF EXISTS "quiz_attempts_insert" ON public.student_quiz_attempts;
CREATE POLICY "quiz_attempts_insert" ON public.student_quiz_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'in_progress'
    AND score_percent IS NULL
    AND passed IS NULL
    AND submitted_at IS NULL
  );

DROP POLICY IF EXISTS "exam_attempts_insert" ON public.student_exam_attempts;
CREATE POLICY "exam_attempts_insert" ON public.student_exam_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'in_progress'
    AND score_percent IS NULL
    AND passed IS NULL
    AND submitted_at IS NULL
    AND auto_submitted = false
    AND left_window_at IS NULL
  );

-- Since the P1.5-services fix, scoring writes to the responses tables go
-- exclusively through the admin client (app/api/quiz-attempts/[id]/submit,
-- lib/services/attempt-scoring.service.ts) - the client-side INSERT grant is
-- no longer used by any real code path and is pure forgery surface (a
-- student could otherwise insert a response row directly claiming
-- is_correct=true for any answer). Revoke it entirely, same treatment as the
-- UPDATE/DELETE revoke in 20260801100021.
REVOKE INSERT ON public.student_quiz_responses FROM authenticated;
REVOKE INSERT ON public.student_exam_responses FROM authenticated;
DROP POLICY IF EXISTS "quiz_responses_insert" ON public.student_quiz_responses;
DROP POLICY IF EXISTS "exam_responses_insert" ON public.student_exam_responses;
