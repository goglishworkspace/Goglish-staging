-- The "media" bucket holds only public-facing assets by design (course/bundle
-- covers, teacher photos, banners - see 20260730140005_media_files.sql's own
-- comment) - things staff paste as a permanent link into other public
-- fields. A private bucket forced every copied link through a 15-minute
-- signed URL (media-library.service.ts's SIGNED_URL_TTL_SECONDS), so any
-- link pasted elsewhere silently broke 15 minutes after it was copied.
-- Flipping the bucket public lets listMediaFiles() hand out a real
-- permanent URL instead.
update storage.buckets set public = true where id = 'media';
