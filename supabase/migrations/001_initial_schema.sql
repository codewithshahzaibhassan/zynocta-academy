-- Run this migration in the Supabase SQL Editor before using STORAGE_MODE=supabase.
create extension if not exists pgcrypto;
create table if not exists public.academy_admins (
  email text primary key,
  password_hash text not null,
  display_name text not null default 'Administrator',
  created_at timestamptz not null default now()
);
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title varchar(160) not null,
  subject varchar(80) not null,
  description varchar(500) not null default '',
  published boolean not null default true,
  storage_path text not null unique,
  original_name text not null,
  file_size bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists materials_published_created_idx on public.materials (published, created_at desc);
create index if not exists materials_subject_idx on public.materials (subject);
-- RLS is enabled. The browser has no direct table access; the Express server uses the service-role key.
alter table public.academy_admins enable row level security;
alter table public.materials enable row level security;
revoke all on public.academy_admins from anon, authenticated;
revoke all on public.materials from anon, authenticated;
-- Do not add public policies. All access goes through the authenticated server API.
