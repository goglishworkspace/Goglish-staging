-- Phase 4: base table privileges (RLS alone isn't enough - see
-- 20260724120010_grants.sql for why).

grant select on
  public.subscription_plans,
  public.course_bundles,
  public.bundle_courses
to anon, authenticated;

grant insert, update, delete on
  public.subscription_plans,
  public.course_bundles,
  public.bundle_courses,
  public.coupons
to authenticated;

grant select, insert on public.orders to authenticated;
grant select on
  public.payments,
  public.user_subscriptions,
  public.course_entitlements,
  public.invoices
to authenticated;

-- Column-restricted: a student may only ever flip their own auto_renew off /
-- set cancelled_at, never rewrite plan_id/current_period_end/etc directly
-- (same defensive pattern as profiles.xp_total in Phase 3).
grant update (auto_renew, cancelled_at) on public.user_subscriptions to authenticated;

grant select, insert, delete on public.family_members to authenticated;

grant select, insert, update on public.refunds to authenticated;

grant select on public.notifications to authenticated;
-- Mark-as-read only.
grant update (read_at) on public.notifications to authenticated;

grant select on public.parent_student_links to authenticated;

grant select, insert, update, delete on
  public.subscription_plans,
  public.course_bundles,
  public.bundle_courses,
  public.coupons,
  public.orders,
  public.payments,
  public.payment_webhook_events,
  public.user_subscriptions,
  public.family_members,
  public.course_entitlements,
  public.invoices,
  public.refunds,
  public.notifications,
  public.parent_student_links
to service_role;
