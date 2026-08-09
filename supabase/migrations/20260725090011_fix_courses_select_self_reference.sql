-- Fix: courses_select called can_manage_course_content(id), whose body
-- re-queries `courses` itself. For INSERT ... RETURNING, that self-referencing
-- subquery does not reliably see the row just inserted in the same statement
-- (confirmed empirically: plain INSERT succeeds, INSERT+RETURNING fails RLS,
-- while the exact same check against an already-committed row succeeds).
-- Fix: reference created_by directly off the row being checked instead of
-- re-querying courses. can_manage_course_content() itself is unaffected and
-- stays in use elsewhere (modules/lessons policies query a *different*
-- table than the one being written, so they don't hit this).
drop policy "courses_select" on public.courses;

create policy "courses_select" on public.courses
  for select to anon, authenticated
  using (
    status = 'published'
    or created_by = auth.uid()
    or public.user_has_any_role('admin', 'super_admin', 'moderator', 'content_manager')
    or exists (
      select 1 from public.course_teachers ct
      join public.teachers t on t.id = ct.teacher_id
      where ct.course_id = courses.id and t.user_id = auth.uid()
    )
  );
