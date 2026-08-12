-- Bundles never had a cover image column - BundleCard needs one to match
-- CourseCard's display (image or a letter-avatar fallback).
alter table public.course_bundles add column cover_image_url text;
