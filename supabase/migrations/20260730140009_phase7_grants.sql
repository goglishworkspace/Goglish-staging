-- Phase 7: base table privileges (RLS alone isn't enough - see
-- 20260724120010_grants.sql for why).

grant select on public.reviews, public.review_likes to anon, authenticated;
grant insert on public.reviews to authenticated;
-- Soft-delete only - RLS restricts this to the review's own author or staff.
grant update (deleted_at) on public.reviews to authenticated;
grant insert, delete on public.review_likes to authenticated;
grant select, insert on public.review_reports to authenticated;

grant select on public.audit_logs to authenticated;

grant select on public.platform_settings to authenticated;
grant update on public.platform_settings to authenticated;

grant select on public.seo_settings to anon, authenticated;
grant insert, update, delete on public.seo_settings to authenticated;

grant select on public.media_files to authenticated;

grant select on public.academic_calendar_events to anon, authenticated;
grant insert, update, delete on public.academic_calendar_events to authenticated;

grant select, insert, update, delete on
  public.reviews,
  public.review_likes,
  public.review_reports,
  public.audit_logs,
  public.platform_settings,
  public.seo_settings,
  public.media_files,
  public.academic_calendar_events
to service_role;
