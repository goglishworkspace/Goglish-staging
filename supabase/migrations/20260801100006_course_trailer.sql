-- Course-level teaser/trailer video (Section 3-ish) - separate from a
-- lesson's own is_preview/youtube_preview_video_id: this is a promotional
-- clip shown on the course landing page itself, visible to anyone
-- (including anonymous visitors) regardless of purchase, to help them
-- decide whether to buy. Always YouTube (same rationale as lesson previews
-- in 20260801100005 and earlier: no real protection needed for a marketing
-- clip, so no Bunny signed-URL machinery here).
alter table public.courses add column if not exists trailer_youtube_id text;
