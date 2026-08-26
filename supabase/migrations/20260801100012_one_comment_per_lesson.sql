-- A student gets exactly one top-level comment/question per lesson (mirrors
-- the existing one-review-per-course rule on public.reviews). Scoped to
-- parent_comment_id is null so this never blocks replies within a thread,
-- and to deleted_at is null so a soft-deleted comment frees up the slot.
create unique index lesson_comments_one_per_user_per_lesson
  on public.lesson_comments (user_id, lesson_id)
  where parent_comment_id is null and deleted_at is null;
