-- Phase 6: base table privileges (RLS alone isn't enough - see
-- 20260724120010_grants.sql for why).

grant select on public.lesson_comments to anon, authenticated;
-- Soft-delete only - RLS restricts this to the comment's own author or staff.
grant update (deleted_at) on public.lesson_comments to authenticated;

grant select, insert on public.comment_reports to authenticated;

grant select, insert, update, delete on public.notification_preferences to authenticated;

grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

-- Phase 4 only granted SELECT here (admin used the admin client directly,
-- no API route existed yet). Phase 6 adds /api/parent-links, which uses the
-- session client - RLS's "parent_student_links_manage_admin" policy already
-- restricts these to admin/super_admin/support.
grant insert, delete on public.parent_student_links to authenticated;

grant select on public.live_classes, public.live_class_questions to anon, authenticated;
grant select on public.live_class_attendance to authenticated;

grant select, insert, update, delete on
  public.lesson_comments,
  public.comment_reports,
  public.notification_preferences,
  public.announcements,
  public.live_classes,
  public.live_class_attendance,
  public.live_class_questions
to service_role;
