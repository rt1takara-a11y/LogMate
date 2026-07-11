-- Customer notes (常連客ノート) and proactive AI insights for the dashboard.

-- =========================================================
-- customers
-- =========================================================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  profile_notes text,
  visit_pattern text,
  last_visit_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index customers_user_idx on public.customers (user_id, name);

alter table public.customers enable row level security;

create policy "own rows" on public.customers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- =========================================================
-- customer_notes: dated visit/interaction journal entries
-- =========================================================
create table public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  visit_date date not null default current_date,
  note text not null,
  created_at timestamptz not null default now()
);

create index customer_notes_customer_idx on public.customer_notes (customer_id, visit_date desc);

alter table public.customer_notes enable row level security;

create policy "own rows" on public.customer_notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- ai_insights: cached proactive "AI noticed this" batches
-- =========================================================
create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insights jsonb not null,
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now()
);

create index ai_insights_user_idx on public.ai_insights (user_id, created_at desc);

alter table public.ai_insights enable row level security;

create policy "own rows" on public.ai_insights for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- grants (tables created via the SQL Editor don't inherit Supabase's
-- default authenticated-role grants, even with ALTER DEFAULT PRIVILEGES
-- set in an earlier migration in some project configurations)
-- =========================================================
grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.customer_notes to authenticated;
grant select, insert, update, delete on public.ai_insights to authenticated;
