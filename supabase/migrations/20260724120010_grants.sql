-- Phase 1: base table privileges. RLS policies (0006) are the real
-- row-level gate, but Postgres also enforces a plain GRANT check before RLS
-- ever runs - without these, every role (service_role included) gets a flat
-- "permission denied for table" regardless of RLS/BYPASSRLS.
-- `anon` intentionally gets nothing on these tables: there is no visitor-facing
-- use case for them in Phase 1.

grant select, insert, update, delete on
  public.profiles,
  public.devices,
  public.role_user
to authenticated;

grant select on
  public.roles,
  public.permissions,
  public.permission_role
to authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.roles,
  public.permissions,
  public.permission_role,
  public.role_user,
  public.devices,
  public.rate_limit_counters
to service_role;
