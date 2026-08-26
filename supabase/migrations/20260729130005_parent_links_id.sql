-- Phase 6: surrogate id on parent_student_links (Phase 4's composite PK has
-- no single-column handle for a REST /api/parent-links/[id] route). Extends
-- the already-applied Phase 4 migration rather than editing it.
alter table public.parent_student_links
  add column id uuid not null default gen_random_uuid() unique;
