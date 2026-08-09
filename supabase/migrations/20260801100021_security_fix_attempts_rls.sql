-- Revoke all client UPDATE/DELETE on attempt tables
REVOKE UPDATE, DELETE ON public.student_quiz_attempts FROM authenticated;
REVOKE UPDATE, DELETE ON public.student_exam_attempts FROM authenticated;
REVOKE UPDATE, DELETE ON public.student_quiz_responses FROM authenticated;
REVOKE UPDATE, DELETE ON public.student_exam_responses FROM authenticated;

-- Drop overly-permissive "for all" policies
DROP POLICY IF EXISTS "student_quiz_attempts_owner" ON public.student_quiz_attempts;
DROP POLICY IF EXISTS "student_exam_attempts_owner" ON public.student_exam_attempts;
DROP POLICY IF EXISTS "student_quiz_responses_owner" ON public.student_quiz_responses;
DROP POLICY IF EXISTS "student_exam_responses_owner" ON public.student_exam_responses;

-- Students: INSERT only (to start attempt), SELECT own rows
CREATE POLICY "quiz_attempts_insert" ON public.student_quiz_attempts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "quiz_attempts_select" ON public.student_quiz_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_has_any_role('admin','super_admin','support','teacher'));

-- Repeat for exam_attempts, quiz_responses, exam_responses
CREATE POLICY "exam_attempts_insert" ON public.student_exam_attempts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "exam_attempts_select" ON public.student_exam_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.user_has_any_role('admin','super_admin','support','teacher'));

CREATE POLICY "quiz_responses_insert" ON public.student_quiz_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.student_quiz_attempts a
      WHERE a.id = student_quiz_responses.attempt_id AND a.user_id = auth.uid()
    )
  );
CREATE POLICY "quiz_responses_select" ON public.student_quiz_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_quiz_attempts a
      WHERE a.id = student_quiz_responses.attempt_id AND a.user_id = auth.uid()
    )
    OR public.user_has_any_role('admin','super_admin','support','teacher')
  );

CREATE POLICY "exam_responses_insert" ON public.student_exam_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.student_exam_attempts a
      WHERE a.id = student_exam_responses.attempt_id AND a.user_id = auth.uid()
    )
  );
CREATE POLICY "exam_responses_select" ON public.student_exam_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_exam_attempts a
      WHERE a.id = student_exam_responses.attempt_id AND a.user_id = auth.uid()
    )
    OR public.user_has_any_role('admin','super_admin','support','teacher')
  );
