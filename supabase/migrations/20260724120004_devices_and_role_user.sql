-- Phase 1: role_user junction + devices table (Section 5 - Device Management)
create table public.role_user (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create index role_user_role_id_idx on public.role_user(role_id);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_fingerprint text not null,
  user_agent text,
  ip_address inet,
  is_active boolean not null default true,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_fingerprint)
);

create index devices_user_id_idx on public.devices(user_id);
