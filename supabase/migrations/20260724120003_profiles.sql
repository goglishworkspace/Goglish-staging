-- Phase 1: profiles table (1:1 with auth.users) - Section 5 (Register/Auth)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  phone text,
  phone_verified_at timestamptz,
  phone_verification_code_hash text,
  phone_verification_expires_at timestamptz,
  phone_verification_attempts int not null default 0,
  national_id_encrypted text not null,
  national_id_masked text not null,
  birth_date date not null,
  grade text check (grade in ('grade1', 'grade2', 'grade3')),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();
