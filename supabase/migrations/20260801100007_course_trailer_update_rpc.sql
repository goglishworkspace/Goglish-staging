-- The trailer is a marketing teaser meant to be added/changed on courses that
-- are already published (that's when it's actually useful - to pull in more
-- subscribers). courses_update_owner_draft (20260725090008) locks owner
-- updates to draft/rejected rows only, so a normal PATCH can never touch
-- trailer_youtube_id on a live course. Rather than loosen that RLS policy
-- (which would let owners edit title/description post-publish too), expose
-- a narrow RPC that only ever touches trailer_youtube_id, gated by the same
-- can_manage_course_content() check, regardless of status.
create or replace function public.update_course_trailer(p_course_id uuid, p_trailer_youtube_id text)
returns public.courses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.courses;
begin
  if not public.can_manage_course_content(p_course_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.courses
  set trailer_youtube_id = p_trailer_youtube_id
  where id = p_course_id and deleted_at is null
  returning * into v_course;

  return v_course;
end;
$$;

revoke all on function public.update_course_trailer(uuid, text) from public;
grant execute on function public.update_course_trailer(uuid, text) to authenticated;
