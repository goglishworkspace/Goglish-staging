-- Remove anon access entirely
REVOKE SELECT ON public.answers FROM anon;

-- Drop current overly-broad policy
DROP POLICY IF EXISTS "answers_select" ON public.answers;

-- New policy: staff see full answer key, students see options only
-- (is_correct filtering at app layer for students — already done in API routes)
CREATE POLICY "answers_select" ON public.answers
  FOR SELECT TO authenticated
  USING (
    public.user_has_any_role('admin','super_admin','support','content_manager','teacher','moderator')
    OR EXISTS (
      SELECT 1 FROM public.questions q
      WHERE q.id = answers.question_id
        AND public.can_view_question_parent(q.quiz_id, q.exam_id)
    )
  );
