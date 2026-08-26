-- Pivot away from Bunny Stream for protected lesson video delivery - the
-- team is going with unlisted YouTube videos instead (upload as unlisted,
-- paste the link). This is a separate field from youtube_preview_video_id
-- (a free, unauthenticated teaser clip): youtube_video_id is the actual
-- lesson content, still gated behind is_preview/login/course-access exactly
-- like bunny_video_id was - see lesson-playback.service.ts. bunny_video_id
-- and the Bunny VideoProvider are left in place (Interface+Stub - nothing
-- currently calls it, but the abstraction stays available) rather than
-- ripped out, matching how stub payment providers are kept elsewhere.
alter table public.lessons add column if not exists youtube_video_id text;
