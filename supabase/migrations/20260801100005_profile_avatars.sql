-- Profile pictures for any account (student or teacher) - a private bucket
-- + admin-client-only access (same convention as media/backups/invoices:
-- see 20260725090005_lesson_resources.sql's "no storage.objects RLS
-- policies are needed here" - every read/write goes through a server route
-- that mints a short-lived signed URL, there is no public/permanent link).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- One file per user at a deterministic path (avatars/{user_id}), overwritten
-- on re-upload - avoids needing to track a storage_path column at all.
-- avatar_updated_at doubles as "does this user have an avatar" (null = no)
-- and as a cache-busting signal for the client.
alter table public.profiles add column if not exists avatar_updated_at timestamptz;
