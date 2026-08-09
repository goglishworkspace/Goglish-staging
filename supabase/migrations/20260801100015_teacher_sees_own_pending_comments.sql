-- A teacher gets notified the moment a student comments on their lesson
-- (notifyTeachersOfNewComment in comment-moderation.service.ts), but the old
-- lesson_comments_read policy only let them see approved comments, their own
-- rows, or nothing else - a teacher could never actually reach a student's
-- pending comment to reply to it. Extend read access to the lesson's
-- teaching team, same can_manage_lesson_content() helper Phase 3 already
-- uses for quiz/exam ownership checks.
drop policy "lesson_comments_read" on public.lesson_comments;

create policy "lesson_comments_read" on public.lesson_comments
  for select to anon, authenticated
  using (
    (status = 'approved' and deleted_at is null)
    or user_id = auth.uid()
    or public.user_has_any_role('admin', 'super_admin', 'moderator')
    or public.can_manage_lesson_content(lesson_id)
  );
