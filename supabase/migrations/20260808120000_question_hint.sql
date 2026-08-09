-- Optional teacher-authored hint, shown to the student only after they get
-- the question wrong during quiz practice (never sent to the client until
-- then - see the per-question check route).
alter table public.questions add column if not exists hint text;
