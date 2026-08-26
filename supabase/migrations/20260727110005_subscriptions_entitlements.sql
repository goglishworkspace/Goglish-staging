-- Phase 4: active subscription state + permanent per-course access.
create table public.user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status text not null default 'active' check (status in ('active', 'grace_period', 'expired', 'cancelled')),
  started_at timestamptz not null default now(),
  current_period_end timestamptz not null,
  auto_renew boolean not null default true,
  grace_period_ends_at timestamptz,
  cancelled_at timestamptz,
  stripe_subscription_id text,
  order_id uuid references public.orders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_subscriptions_set_updated_at
  before update on public.user_subscriptions
  for each row
  execute function public.set_updated_at();

create index user_subscriptions_user_id_idx on public.user_subscriptions(user_id);
create index user_subscriptions_status_idx on public.user_subscriptions(status);

create table public.family_members (
  subscription_id uuid not null references public.user_subscriptions(id) on delete cascade,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (subscription_id, member_user_id)
);

-- Permanent access to one specific course (Section 3 - "الكورسات المشتراة
-- متاحة للأبد"). Distinct from an active subscription, which only grants
-- access to published courses while the subscription itself is active.
create table public.course_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  source text not null check (source in ('purchase', 'bundle', 'coupon')),
  order_id uuid references public.orders(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (user_id, course_id)
);

create index course_entitlements_user_id_idx on public.course_entitlements(user_id);
