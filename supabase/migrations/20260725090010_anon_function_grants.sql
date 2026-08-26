-- Phase 2: fix - policies on grades/subjects/teachers/courses/modules/lessons
-- apply `to anon, authenticated` and evaluate can_manage_course_content() /
-- can_manage_module_content() (which in turn call user_has_any_role()) for
-- every row. Postgres checks EXECUTE privilege on referenced functions at
-- plan time regardless of which branch of an OR actually matters at runtime,
-- so anon needs EXECUTE too - these functions are read-only and safely
-- resolve to false for anon (auth.uid() is null), so this is safe to grant.
grant execute on function public.user_has_any_role(text[]) to anon;
grant execute on function public.current_teacher_id() to anon;
grant execute on function public.can_manage_course_content(uuid) to anon;
grant execute on function public.can_manage_module_content(uuid) to anon;
