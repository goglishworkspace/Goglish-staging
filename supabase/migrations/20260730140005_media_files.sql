-- Phase 7: Media Library (Section 17). Tracks uploaded files (images, PDFs,
-- banners, teacher photos) - videos are links (Bunny/YouTube ids), not
-- files, so they aren't registered here. Private bucket, same
-- admin-client-signed-URL pattern as invoices/certificates/lesson_resources.
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- Also provisioned here (Section 15 - Backup System, Phase 7 export feature):
-- same simple private-bucket pattern, not a "media" type file.
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;

create table public.media_files (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null,
  storage_path text not null,
  file_type text not null check (file_type in ('image', 'pdf', 'audio', 'zip', 'other')),
  original_filename text not null,
  size_bytes int not null,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index media_files_uploaded_by_idx on public.media_files(uploaded_by);

alter table public.media_files enable row level security;

-- All access (including listing) goes through the admin-gated API routes
-- (media-library.service.ts uses the admin client) - staff-only read here
-- mirrors that; there is no direct client write path.
create policy "media_files_staff_read" on public.media_files
  for select to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'));
