-- Phase 5: coin reward alongside the existing xp_reward (Section 10 - Coins
-- System), same admin-editable pattern as xp_reward.
alter table public.quizzes add column coin_reward int not null default 5;
alter table public.exams add column coin_reward int not null default 20;
