-- Phase 2: base table privileges (see 20260724120010_grants.sql for why this
-- is required even though RLS is enabled - Postgres checks GRANTs before RLS
-- ever runs, and service_role does NOT get a free pass on that check).

-- Public read tables: anon needs SELECT too (browsing without login).
grant select on
  public.grades,
  public.subjects,
  public.teachers,
  public.teacher_profiles,
  public.courses,
  public.course_teachers,
  public.modules,
  public.lessons,
  public.lesson_resources
to anon, authenticated;

grant insert, update, delete on
  public.grades,
  public.subjects,
  public.teachers,
  public.teacher_profiles,
  public.courses,
  public.course_teachers,
  public.modules,
  public.lessons,
  public.lesson_resources
to authenticated;

-- Owner-only tables: no anon access at all.
grant select, insert, update, delete on
  public.lesson_progress,
  public.course_wishlist,
  public.favorite_teachers,
  public.recently_viewed_courses
to authenticated;

grant select, insert, update, delete on
  public.grades,
  public.subjects,
  public.teachers,
  public.teacher_profiles,
  public.courses,
  public.course_teachers,
  public.modules,
  public.lessons,
  public.lesson_resources,
  public.lesson_progress,
  public.course_wishlist,
  public.favorite_teachers,
  public.recently_viewed_courses
to service_role;
