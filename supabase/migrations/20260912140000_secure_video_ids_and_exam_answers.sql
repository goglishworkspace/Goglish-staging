-- Migration: 20260912140000_secure_video_ids_and_exam_answers.sql
-- Description: Enforce database security boundaries for SEC-01 and SEC-02.
-- 1. SEC-01: Revoke SELECT on protected video identifiers (youtube_video_id, bunny_video_id)
--    from public roles (anon, authenticated) to prevent direct PostgREST extraction.
-- 2. SEC-02: Revoke SELECT on correct answer indicator (is_correct) on answers table
--    from public roles (anon, authenticated) to prevent answer key scraping.

-- SEC-01: Protect Video Identifiers on public.lessons ------------------------
REVOKE SELECT ON public.lessons FROM anon, authenticated;

GRANT SELECT (
  id,
  module_id,
  title,
  description,
  order_index,
  teacher_id,
  bunny_video_duration_seconds,
  youtube_preview_video_id,
  is_preview,
  status,
  submitted_at,
  rejection_reason,
  created_by,
  reviewed_by,
  reviewed_at,
  deleted_at,
  created_at,
  updated_at,
  deletion_requested_at,
  deletion_requested_by
) ON public.lessons TO anon, authenticated;

-- Ensure staff maintain ability to insert, update, and delete lessons
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;

-- SEC-02: Protect Exam/Quiz Answer Keys on public.answers --------------------
REVOKE SELECT ON public.answers FROM anon, authenticated;

GRANT SELECT (
  id,
  question_id,
  content,
  order_index,
  side,
  match_group,
  created_at
) ON public.answers TO authenticated;

-- Ensure staff maintain ability to insert, update, and delete answers
GRANT INSERT, UPDATE, DELETE ON public.answers TO authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
