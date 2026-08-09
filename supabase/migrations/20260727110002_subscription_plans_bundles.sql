-- Phase 4: subscription plans (Section 3 - شهري/ترم/سنوي/Premium/Family).
-- "Bundle" is modeled separately below (course_bundles) as a one-time course
-- package purchase, not a recurring plan - see plan notes for why.
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('monthly', 'term', 'yearly', 'premium', 'family')),
  name text not null,
  price_cents int not null,
  currency text not null default 'EGP',
  duration_days int not null,
  includes_parent_tracking boolean not null default false,
  family_seats int,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger subscription_plans_set_updated_at
  before update on public.subscription_plans
  for each row
  execute function public.set_updated_at();

insert into public.subscription_plans (kind, name, price_cents, duration_days, includes_parent_tracking, family_seats) values
  ('monthly', 'اشتراك شهري', 15000, 30, false, null),
  ('term', 'اشتراك الترم', 40000, 120, false, null),
  ('yearly', 'اشتراك سنوي', 120000, 365, false, null),
  ('premium', 'اشتراك Premium (متابعة ولي الأمر)', 25000, 30, true, null),
  ('family', 'اشتراك Family', 45000, 30, false, 4);

-- Bundle: a fixed set of courses sold together as one one-time purchase,
-- permanent access like buying courses individually (Section 3 distinguishes
-- "باقات (Bundles)" from "اشتراك بريميم" explicitly).
create table public.course_bundles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  price_cents int not null,
  currency text not null default 'EGP',
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger course_bundles_set_updated_at
  before update on public.course_bundles
  for each row
  execute function public.set_updated_at();

create table public.bundle_courses (
  bundle_id uuid not null references public.course_bundles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  primary key (bundle_id, course_id)
);
