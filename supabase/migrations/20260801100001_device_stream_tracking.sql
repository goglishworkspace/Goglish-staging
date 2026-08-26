-- Phase 12: Section 22 - "Video Stream: 1 بث نشط / جهاز" (one active stream
-- per device). Reuses the existing `devices` table (already the per-device
-- identity anchor from Section 5's 2-device login limit) rather than a new
-- table - a device's current stream is just two more nullable columns on it.
alter table public.devices
  add column current_lesson_id uuid references public.lessons(id) on delete set null,
  add column stream_expires_at timestamptz;
