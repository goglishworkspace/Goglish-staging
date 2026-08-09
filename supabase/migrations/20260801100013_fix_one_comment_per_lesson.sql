-- 20260801100012's partial unique index blocked a student from ever
-- submitting a second top-level comment on a lesson once their first one
-- was rejected (auto-filter or manual) - which broke the 3-strike system
-- (each strike is a separate rejected comment) and would permanently lock a
-- student out of a lesson's Q&A after one bad first attempt. A rejected
-- comment never actually surfaces (Section 11), so it shouldn't consume the
-- student's one-comment slot - only a pending/approved comment should.
drop index public.lesson_comments_one_per_user_per_lesson;

create unique index lesson_comments_one_per_user_per_lesson
  on public.lesson_comments (user_id, lesson_id)
  where parent_comment_id is null and deleted_at is null and status <> 'rejected';
