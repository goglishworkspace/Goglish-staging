-- Phase 2: Row Level Security policies for the educational structure.
-- Reuses public.user_has_any_role() from Phase 1 (20260724120006_rls_policies.sql).

-- Helper: the teachers.id row for the current user, if any.
create or replace function public.current_teacher_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.teachers where user_id = auth.uid();
$$;

-- Helper: can the current user manage (create/edit) content under this course?
-- Covers: admin-ish roles, the course's creator, and anyone on its teaching team.
create or replace function public.can_manage_course_content(p_course_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.user_has_any_role('admin', 'super_admin', 'moderator', 'content_manager')
    or exists (
      select 1 from public.courses c
      where c.id = p_course_id and c.created_by = auth.uid()
    )
    or exists (
      select 1 from public.course_teachers ct
      join public.teachers t on t.id = ct.teacher_id
      where ct.course_id = p_course_id and t.user_id = auth.uid()
    );
$$;

-- Helper: same, but resolved from a module_id (lessons reference module_id, not course_id).
create or replace function public.can_manage_module_content(p_module_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.can_manage_course_content(m.course_id)
  from public.modules m
  where m.id = p_module_id;
$$;

revoke all on function public.current_teacher_id() from public;
revoke all on function public.can_manage_course_content(uuid) from public;
revoke all on function public.can_manage_module_content(uuid) from public;
grant execute on function public.current_teacher_id() to authenticated;
grant execute on function public.can_manage_course_content(uuid) to authenticated;
grant execute on function public.can_manage_module_content(uuid) to authenticated;

-- grades ---------------------------------------------------------------
alter table public.grades enable row level security;

create policy "grades_select_all" on public.grades
  for select to anon, authenticated using (true);

create policy "grades_manage_admin" on public.grades
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'content_manager'));

-- subjects ---------------------------------------------------------------
alter table public.subjects enable row level security;

create policy "subjects_select_all" on public.subjects
  for select to anon, authenticated using (true);

create policy "subjects_manage_admin" on public.subjects
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'content_manager'));

-- teachers / teacher_profiles ---------------------------------------------
alter table public.teachers enable row level security;
alter table public.teacher_profiles enable row level security;

create policy "teachers_select_all" on public.teachers
  for select to anon, authenticated using (true);

create policy "teachers_manage_admin" on public.teachers
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (public.user_has_any_role('admin', 'super_admin', 'support'));

create policy "teacher_profiles_select_all" on public.teacher_profiles
  for select to anon, authenticated using (true);

create policy "teacher_profiles_update_self_or_admin" on public.teacher_profiles
  for update to authenticated
  using (
    teacher_id = public.current_teacher_id()
    or public.user_has_any_role('admin', 'super_admin', 'support')
  )
  with check (
    teacher_id = public.current_teacher_id()
    or public.user_has_any_role('admin', 'super_admin', 'support')
  );

create policy "teacher_profiles_admin_insert_delete" on public.teacher_profiles
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (public.user_has_any_role('admin', 'super_admin', 'support'));

-- courses ------------------------------------------------------------------
alter table public.courses enable row level security;

create policy "courses_select" on public.courses
  for select to anon, authenticated
  using (status = 'published' or public.can_manage_course_content(id));

create policy "courses_insert" on public.courses
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (public.current_teacher_id() is not null
         or public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  );

-- Owners (and their team) may only edit while the course isn't published yet -
-- flipping status to 'published' requires the admin policy below.
create policy "courses_update_owner_draft" on public.courses
  for update to authenticated
  using (status in ('draft', 'rejected') and public.can_manage_course_content(id))
  with check (status in ('draft', 'rejected') and public.can_manage_course_content(id));

create policy "courses_update_admin" on public.courses
  for update to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'moderator', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'moderator', 'content_manager'));

create policy "courses_delete_admin" on public.courses
  for delete to authenticated
  using (public.user_has_any_role('admin', 'super_admin'));

-- course_teachers ------------------------------------------------------
alter table public.course_teachers enable row level security;

create policy "course_teachers_select_all" on public.course_teachers
  for select to anon, authenticated using (true);

create policy "course_teachers_manage_admin" on public.course_teachers
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'content_manager'));

-- modules ------------------------------------------------------------------
alter table public.modules enable row level security;

create policy "modules_select" on public.modules
  for select to anon, authenticated
  using (
    exists (select 1 from public.courses c where c.id = modules.course_id and c.status = 'published')
    or public.can_manage_course_content(course_id)
  );

create policy "modules_manage" on public.modules
  for all to authenticated
  using (public.can_manage_course_content(course_id))
  with check (public.can_manage_course_content(course_id));

-- lessons --------------------------------------------------------------
alter table public.lessons enable row level security;

create policy "lessons_select" on public.lessons
  for select to anon, authenticated
  using (status = 'published' or public.can_manage_module_content(module_id));

create policy "lessons_insert" on public.lessons
  for insert to authenticated
  with check (created_by = auth.uid() and public.can_manage_module_content(module_id));

create policy "lessons_update_owner_draft" on public.lessons
  for update to authenticated
  using (status in ('draft', 'rejected') and public.can_manage_module_content(module_id))
  with check (status in ('draft', 'rejected') and public.can_manage_module_content(module_id));

create policy "lessons_update_admin" on public.lessons
  for update to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'moderator', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'moderator', 'content_manager'));

create policy "lessons_delete" on public.lessons
  for delete to authenticated
  using (
    (status = 'draft' and public.can_manage_module_content(module_id))
    or public.user_has_any_role('admin', 'super_admin')
  );

-- lesson_resources -------------------------------------------------------
alter table public.lesson_resources enable row level security;

create policy "lesson_resources_select" on public.lesson_resources
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_resources.lesson_id
        and (l.status = 'published' or public.can_manage_module_content(l.module_id))
    )
  );

create policy "lesson_resources_manage" on public.lesson_resources
  for all to authenticated
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_resources.lesson_id
        and public.can_manage_module_content(l.module_id)
    )
  )
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_resources.lesson_id
        and public.can_manage_module_content(l.module_id)
    )
  );

-- lesson_progress --------------------------------------------------------
alter table public.lesson_progress enable row level security;

create policy "lesson_progress_owner" on public.lesson_progress
  for all to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (user_id = auth.uid());

-- course_wishlist / favorite_teachers / recently_viewed_courses --------
alter table public.course_wishlist enable row level security;
alter table public.favorite_teachers enable row level security;
alter table public.recently_viewed_courses enable row level security;

create policy "course_wishlist_owner" on public.course_wishlist
  for all to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (user_id = auth.uid());

create policy "favorite_teachers_owner" on public.favorite_teachers
  for all to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (user_id = auth.uid());

create policy "recently_viewed_courses_owner" on public.recently_viewed_courses
  for all to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (user_id = auth.uid());
