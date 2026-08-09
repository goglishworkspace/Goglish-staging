-- Phase 7: Audit Logs (Section 25 - "كل العمليات تُسجَّل"). Scoped to the new
-- admin actions this phase introduces plus comment moderation decisions
-- (explicitly required) - not retrofitted across every route from Phases
-- 1-6, which would be its own separate undertaking. See audit-log.service.ts.
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_user_id_idx on public.audit_logs(actor_user_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at);

alter table public.audit_logs enable row level security;

-- Read-only for clients: only audit-log.service.ts (via the admin client)
-- ever writes here.
create policy "audit_logs_staff_read" on public.audit_logs
  for select to authenticated
  using (public.user_has_any_role('admin', 'super_admin', 'support'));
