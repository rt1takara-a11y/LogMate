-- LogMate initial schema
-- Run this in the Supabase SQL Editor (or via `supabase db push`) on a fresh project.

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- =========================================================
-- profiles: 1:1 with auth.users
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  business_name text,
  business_type text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own rows" on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- auto-create a profile row on signup (covers both email and Google OAuth signups)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- shared updated_at trigger helper
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- logs: one row per user per calendar day
-- =========================================================
create table public.logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null,
  event text,
  good_things text,
  improvements text,
  insights text,
  sales numeric,
  customer_count integer,
  avg_spend numeric generated always as
    (case when customer_count > 0 then round(sales / customer_count, 2) else null end) stored,
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index logs_user_date_idx on public.logs (user_id, log_date desc);
create index logs_trgm_idx on public.logs
  using gin ((coalesce(event, '') || ' ' || coalesce(good_things, '') || ' ' ||
              coalesce(improvements, '') || ' ' || coalesce(insights, '')) gin_trgm_ops);

create trigger logs_set_updated_at
  before update on public.logs
  for each row execute function public.set_updated_at();

alter table public.logs enable row level security;

create policy "own rows" on public.logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- staff
-- =========================================================
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  memo text,
  strengths text,
  weaknesses text,
  growth_summary text,
  growth_summary_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create index staff_user_idx on public.staff (user_id);

alter table public.staff enable row level security;

create policy "own rows" on public.staff for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- staff_logs: per-staff notes attached to a day's log
-- user_id is denormalized from logs so RLS stays a flat check
-- =========================================================
create table public.staff_logs (
  id uuid primary key default gen_random_uuid(),
  log_id uuid not null references public.logs(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  good_point text,
  improvement text,
  memo text,
  created_at timestamptz not null default now()
);

create index staff_logs_staff_idx on public.staff_logs (staff_id, created_at desc);
create index staff_logs_log_idx on public.staff_logs (log_id);

alter table public.staff_logs enable row level security;

create policy "own rows" on public.staff_logs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- todos
-- =========================================================
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_id uuid references public.logs(id) on delete set null,
  title text not null,
  completed boolean not null default false,
  due_date date,
  ai_suggested_due_date date,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index todos_user_open_idx on public.todos (user_id, completed, created_at);

alter table public.todos enable row level security;

create policy "own rows" on public.todos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- chat_messages
-- =========================================================
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  referenced_log_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index chat_messages_user_idx on public.chat_messages (user_id, created_at);

alter table public.chat_messages enable row level security;

create policy "own rows" on public.chat_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- reports: daily / weekly / monthly AI-generated reports
-- =========================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  report_type text not null check (report_type in ('daily', 'weekly', 'monthly')),
  period_start date not null,
  period_end date not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, report_type, period_start)
);

create index reports_user_idx on public.reports (user_id, report_type, period_start desc);

alter table public.reports enable row level security;

create policy "own rows" on public.reports for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- user_ai_settings: BYOK provider + encrypted API key
-- =========================================================
create table public.user_ai_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic')),
  model text,
  encrypted_api_key text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_ai_settings enable row level security;

create policy "own rows" on public.user_ai_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- storage: private bucket for log photos
-- =========================================================
insert into storage.buckets (id, name, public)
values ('log-photos', 'log-photos', false)
on conflict (id) do nothing;

create policy "own folder select" on storage.objects for select
  using (bucket_id = 'log-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own folder insert" on storage.objects for insert
  with check (bucket_id = 'log-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own folder delete" on storage.objects for delete
  using (bucket_id = 'log-photos' and (storage.foldername(name))[1] = auth.uid()::text);
