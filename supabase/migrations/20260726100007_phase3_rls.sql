-- Phase 3: Row Level Security policies for the Assessment System.
-- Reuses can_manage_course_content()/can_manage_module_content()/
-- user_has_any_role() from Phase 2 (20260725090008_phase2_rls.sql).

-- Helper: resolves lesson -> module -> course permission (quizzes hang off a
-- lesson, not a module, so this bridges to the Phase 2 helper).
create or replace function public.can_manage_lesson_content(p_lesson_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.can_manage_module_content(l.module_id)
  from public.lessons l
  where l.id = p_lesson_id;
$$;

-- Helper: is this quiz/exam published, or manageable by the current user?
-- Used for questions_select - questions are visible whenever their parent is.
create or replace function public.can_view_question_parent(p_quiz_id uuid, p_exam_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case
    when p_quiz_id is not null then exists (
      select 1 from public.quizzes q where q.id = p_quiz_id
        and (q.status = 'published' or public.can_manage_lesson_content(q.lesson_id))
    )
    when p_exam_id is not null then exists (
      select 1 from public.exams e where e.id = p_exam_id
        and (e.status = 'published' or public.can_manage_course_content(e.course_id))
    )
    else false
  end;
$$;

-- Helper: can the current user author/edit this question (regardless of
-- publish status)?
create or replace function public.can_manage_question_parent(p_quiz_id uuid, p_exam_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case
    when p_quiz_id is not null then (
      select public.can_manage_lesson_content(q.lesson_id) from public.quizzes q where q.id = p_quiz_id
    )
    when p_exam_id is not null then (
      select public.can_manage_course_content(e.course_id) from public.exams e where e.id = p_exam_id
    )
    else false
  end;
$$;

revoke all on function public.can_manage_lesson_content(uuid) from public;
revoke all on function public.can_view_question_parent(uuid, uuid) from public;
revoke all on function public.can_manage_question_parent(uuid, uuid) from public;
grant execute on function public.can_manage_lesson_content(uuid) to anon, authenticated;
grant execute on function public.can_view_question_parent(uuid, uuid) to anon, authenticated;
grant execute on function public.can_manage_question_parent(uuid, uuid) to anon, authenticated;

-- quizzes ------------------------------------------------------------------
alter table public.quizzes enable row level security;

create policy "quizzes_select" on public.quizzes
  for select to anon, authenticated
  using (status = 'published' or public.can_manage_lesson_content(lesson_id));

create policy "quizzes_insert" on public.quizzes
  for insert to authenticated
  with check (created_by = auth.uid() and public.can_manage_lesson_content(lesson_id));

create policy "quizzes_update" on public.quizzes
  for update to authenticated
  using (public.can_manage_lesson_content(lesson_id))
  with check (public.can_manage_lesson_content(lesson_id));

create policy "quizzes_delete" on public.quizzes
  for delete to authenticated
  using (public.can_manage_lesson_content(lesson_id));

-- exams ----------------------------------------------------------------
alter table public.exams enable row level security;

create policy "exams_select" on public.exams
  for select to anon, authenticated
  using (status = 'published' or public.can_manage_course_content(course_id));

create policy "exams_insert" on public.exams
  for insert to authenticated
  with check (created_by = auth.uid() and public.can_manage_course_content(course_id));

create policy "exams_update" on public.exams
  for update to authenticated
  using (public.can_manage_course_content(course_id))
  with check (public.can_manage_course_content(course_id));

create policy "exams_delete" on public.exams
  for delete to authenticated
  using (public.can_manage_course_content(course_id));

-- questions --------------------------------------------------------------
alter table public.questions enable row level security;

create policy "questions_select" on public.questions
  for select to anon, authenticated
  using (public.can_view_question_parent(quiz_id, exam_id));

create policy "questions_manage" on public.questions
  for all to authenticated
  using (public.can_manage_question_parent(quiz_id, exam_id))
  with check (public.can_manage_question_parent(quiz_id, exam_id));

-- answers ------------------------------------------------------------------
alter table public.answers enable row level security;

create policy "answers_select" on public.answers
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.questions q
      where q.id = answers.question_id and public.can_view_question_parent(q.quiz_id, q.exam_id)
    )
  );

create policy "answers_manage" on public.answers
  for all to authenticated
  using (
    exists (
      select 1 from public.questions q
      where q.id = answers.question_id and public.can_manage_question_parent(q.quiz_id, q.exam_id)
    )
  )
  with check (
    exists (
      select 1 from public.questions q
      where q.id = answers.question_id and public.can_manage_question_parent(q.quiz_id, q.exam_id)
    )
  );

-- student_quiz_attempts / student_quiz_responses ------------------------
alter table public.student_quiz_attempts enable row level security;
alter table public.student_quiz_responses enable row level security;

create policy "student_quiz_attempts_owner" on public.student_quiz_attempts
  for all to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (user_id = auth.uid());

create policy "student_quiz_attempts_teacher_read" on public.student_quiz_attempts
  for select to authenticated
  using (
    exists (
      select 1 from public.quizzes q
      where q.id = student_quiz_attempts.quiz_id and public.can_manage_lesson_content(q.lesson_id)
    )
  );

create policy "student_quiz_responses_owner" on public.student_quiz_responses
  for all to authenticated
  using (
    exists (
      select 1 from public.student_quiz_attempts a
      where a.id = student_quiz_responses.attempt_id and a.user_id = auth.uid()
    )
    or public.user_has_any_role('admin', 'super_admin', 'support')
  )
  with check (
    exists (
      select 1 from public.student_quiz_attempts a
      where a.id = student_quiz_responses.attempt_id and a.user_id = auth.uid()
    )
  );

create policy "student_quiz_responses_teacher_read" on public.student_quiz_responses
  for select to authenticated
  using (
    exists (
      select 1 from public.student_quiz_attempts a
      join public.quizzes q on q.id = a.quiz_id
      where a.id = student_quiz_responses.attempt_id and public.can_manage_lesson_content(q.lesson_id)
    )
  );

-- student_exam_attempts / student_exam_responses -------------------------
alter table public.student_exam_attempts enable row level security;
alter table public.student_exam_responses enable row level security;

create policy "student_exam_attempts_owner" on public.student_exam_attempts
  for all to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (user_id = auth.uid());

create policy "student_exam_attempts_teacher_read" on public.student_exam_attempts
  for select to authenticated
  using (
    exists (
      select 1 from public.exams e
      where e.id = student_exam_attempts.exam_id and public.can_manage_course_content(e.course_id)
    )
  );

create policy "student_exam_responses_owner" on public.student_exam_responses
  for all to authenticated
  using (
    exists (
      select 1 from public.student_exam_attempts a
      where a.id = student_exam_responses.attempt_id and a.user_id = auth.uid()
    )
    or public.user_has_any_role('admin', 'super_admin', 'support')
  )
  with check (
    exists (
      select 1 from public.student_exam_attempts a
      where a.id = student_exam_responses.attempt_id and a.user_id = auth.uid()
    )
  );

create policy "student_exam_responses_teacher_read" on public.student_exam_responses
  for select to authenticated
  using (
    exists (
      select 1 from public.student_exam_attempts a
      join public.exams e on e.id = a.exam_id
      where a.id = student_exam_responses.attempt_id and public.can_manage_course_content(e.course_id)
    )
  );

-- xp_transactions ------------------------------------------------------
-- Read-only for clients: only the service role (xp.service.ts, via the
-- admin client) ever writes here.
alter table public.xp_transactions enable row level security;

create policy "xp_transactions_owner_read" on public.xp_transactions
  for select to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'));

-- certificates -----------------------------------------------------------
-- Same story: only issued via the service role (certificate.service.ts).
alter table public.certificates enable row level security;

create policy "certificates_owner_read" on public.certificates
  for select to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'));
