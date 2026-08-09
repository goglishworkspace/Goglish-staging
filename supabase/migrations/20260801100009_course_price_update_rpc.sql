-- Course price is a commercial/business attribute, not reviewed content -
-- teachers should be able to reprice a course (promotions, corrections)
-- without needing to unpublish it first. courses_update_owner_draft
-- (20260725090008) locks all other owner edits to draft/rejected rows, so
-- price_cents goes through the same "narrow RPC, any status" pattern as
-- trailer_youtube_id (see update_course_trailer, 20260801100007).
create or replace function public.update_course_price(p_course_id uuid, p_price_cents int)
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
  if p_price_cents < 0 then
    raise exception 'price_cents must be >= 0' using errcode = '22003';
  end if;

  update public.courses
  set price_cents = p_price_cents
  where id = p_course_id and deleted_at is null
  returning * into v_course;

  return v_course;
end;
$$;

revoke all on function public.update_course_price(uuid, int) from public;
grant execute on function public.update_course_price(uuid, int) to authenticated;
