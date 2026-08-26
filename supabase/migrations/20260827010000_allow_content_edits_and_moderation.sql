-- Allow Teachers & Admins to edit courses and lessons even after publishing
-- Changes submitted by teachers will update submitted_at to appear in the Admin Review Queue

-- 1. Courses: allow owner/teaching team to update course content regardless of status
drop policy if exists "courses_update_owner_draft" on public.courses;
drop policy if exists "courses_update_owner" on public.courses;

create policy "courses_update_owner" on public.courses
  for update to authenticated
  using (public.can_manage_course_content(id))
  with check (public.can_manage_course_content(id));

-- 2. Lessons: allow owner/teaching team to update lesson content regardless of status
drop policy if exists "lessons_update_owner_draft" on public.lessons;
drop policy if exists "lessons_update_owner" on public.lessons;

create policy "lessons_update_owner" on public.lessons
  for update to authenticated
  using (public.can_manage_module_content(module_id))
  with check (public.can_manage_module_content(module_id));

-- 3. Dedicated RPC to update course full details safely
create or replace function public.update_course_details(
  p_course_id uuid,
  p_title text default null,
  p_description text default null,
  p_cover_image_url text default null,
  p_trailer_youtube_id text default null,
  p_price_cents integer default null,
  p_mark_submitted boolean default false
)
returns public.courses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.courses;
  v_is_admin boolean;
begin
  -- Check permission
  if not public.can_manage_course_content(p_course_id) then
    raise exception 'Not authorized to update this course';
  end if;

  v_is_admin := public.user_has_any_role('admin', 'super_admin', 'moderator', 'content_manager');

  update public.courses set
    title = coalesce(p_title, title),
    description = coalesce(p_description, description),
    cover_image_url = coalesce(p_cover_image_url, cover_image_url),
    trailer_youtube_id = coalesce(p_trailer_youtube_id, trailer_youtube_id),
    price_cents = coalesce(p_price_cents, price_cents),
    submitted_at = case
      when v_is_admin then submitted_at
      when p_mark_submitted then now()
      else submitted_at
    end,
    updated_at = now()
  where id = p_course_id
  returning * into v_course;

  return v_course;
end;
$$;

revoke all on function public.update_course_details(uuid, text, text, text, text, integer, boolean) from public;
grant execute on function public.update_course_details(uuid, text, text, text, text, integer, boolean) to authenticated;
