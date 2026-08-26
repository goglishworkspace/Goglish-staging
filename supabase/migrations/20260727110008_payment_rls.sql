-- Phase 4: Row Level Security for payments/subscriptions.
-- Reuses public.user_has_any_role() from Phase 1.

-- subscription_plans / course_bundles / bundle_courses -----------------
alter table public.subscription_plans enable row level security;
alter table public.course_bundles enable row level security;
alter table public.bundle_courses enable row level security;

create policy "subscription_plans_select_all" on public.subscription_plans
  for select to anon, authenticated using (true);
create policy "subscription_plans_manage_admin" on public.subscription_plans
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'content_manager'));

create policy "course_bundles_select_all" on public.course_bundles
  for select to anon, authenticated using (true);
create policy "course_bundles_manage_admin" on public.course_bundles
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'content_manager'));

create policy "bundle_courses_select_all" on public.bundle_courses
  for select to anon, authenticated using (true);
create policy "bundle_courses_manage_admin" on public.bundle_courses
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'content_manager'));

-- coupons ----------------------------------------------------------------
-- No public/authenticated SELECT at all - /api/coupons/validate looks codes
-- up via the admin client and returns only the computed discount, never the
-- raw row (so browsing for valid codes isn't possible via the API).
alter table public.coupons enable row level security;

create policy "coupons_manage_admin" on public.coupons
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'content_manager'))
  with check (public.user_has_any_role('admin', 'super_admin', 'content_manager'));

-- orders -----------------------------------------------------------------
alter table public.orders enable row level security;

create policy "orders_select_own_or_admin" on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'));

create policy "orders_insert_own" on public.orders
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- Deliberately no authenticated UPDATE policy: status transitions
-- (pending -> completed/refunded/cancelled) only ever happen via the admin
-- client from webhook/refund processing, never directly from a client.
create policy "orders_update_admin" on public.orders
  for update to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (public.user_has_any_role('admin', 'super_admin', 'support'));

-- payments -----------------------------------------------------------------
-- Read-only for clients (order-history/receipt display); every write goes
-- through the admin client (payment attempts are server-orchestrated: we
-- generate the idempotency key and talk to the provider ourselves).
alter table public.payments enable row level security;

create policy "payments_select_own_or_admin" on public.payments
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = payments.order_id and o.user_id = auth.uid())
    or public.user_has_any_role('admin', 'super_admin', 'support')
  );

-- payment_webhook_events ---------------------------------------------------
-- No client access at all, same as rate_limit_counters (Phase 1): only the
-- service role touches this table.
alter table public.payment_webhook_events enable row level security;

-- user_subscriptions / family_members ---------------------------------
alter table public.user_subscriptions enable row level security;
alter table public.family_members enable row level security;

create policy "user_subscriptions_select_own_or_admin" on public.user_subscriptions
  for select to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'));

-- Self-cancel only: column-level GRANTs (see payment_grants migration)
-- further restrict this to auto_renew/cancelled_at, mirroring the
-- profiles.xp_total lesson from Phase 3 - a broad RLS `using` clause alone
-- would let a student rewrite their own plan_id/current_period_end otherwise.
create policy "user_subscriptions_update_self_or_admin" on public.user_subscriptions
  for update to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'));

create policy "family_members_select" on public.family_members
  for select to authenticated
  using (
    member_user_id = auth.uid()
    or exists (select 1 from public.user_subscriptions s where s.id = subscription_id and s.user_id = auth.uid())
    or public.user_has_any_role('admin', 'super_admin', 'support')
  );

create policy "family_members_manage_owner_or_admin" on public.family_members
  for all to authenticated
  using (
    exists (select 1 from public.user_subscriptions s where s.id = subscription_id and s.user_id = auth.uid())
    or public.user_has_any_role('admin', 'super_admin', 'support')
  )
  with check (
    exists (select 1 from public.user_subscriptions s where s.id = subscription_id and s.user_id = auth.uid())
    or public.user_has_any_role('admin', 'super_admin', 'support')
  );

-- course_entitlements ------------------------------------------------------
-- Read-only for clients: granted by the payment webhook/refund flow via the
-- admin client, never written directly.
alter table public.course_entitlements enable row level security;

create policy "course_entitlements_select_own_or_admin" on public.course_entitlements
  for select to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'));

-- invoices -----------------------------------------------------------------
alter table public.invoices enable row level security;

create policy "invoices_select_own_or_admin" on public.invoices
  for select to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'));

-- refunds ("Refund يُعالَج من الأدمن") -------------------------------------
alter table public.refunds enable row level security;

create policy "refunds_select_own_order_or_admin" on public.refunds
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
    or public.user_has_any_role('admin', 'super_admin', 'support')
  );

create policy "refunds_insert_admin" on public.refunds
  for insert to authenticated
  with check (
    public.user_has_any_role('admin', 'super_admin', 'support') and processed_by = auth.uid()
  );

create policy "refunds_update_admin" on public.refunds
  for update to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (public.user_has_any_role('admin', 'super_admin', 'support'));

-- notifications --------------------------------------------------------
alter table public.notifications enable row level security;

create policy "notifications_select_own_or_admin" on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or public.user_has_any_role('admin', 'super_admin', 'support'));

-- Mark-as-read only: column-level GRANT (read_at only) in payment_grants.
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- parent_student_links (Section 13 foundation) --------------------------
alter table public.parent_student_links enable row level security;

create policy "parent_student_links_select_own" on public.parent_student_links
  for select to authenticated
  using (
    parent_user_id = auth.uid()
    or student_user_id = auth.uid()
    or public.user_has_any_role('admin', 'super_admin', 'support')
  );

create policy "parent_student_links_manage_admin" on public.parent_student_links
  for all to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'support'))
  with check (public.user_has_any_role('admin', 'super_admin', 'support'));
