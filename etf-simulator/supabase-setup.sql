-- ═══════════════════════════════════════════════════════════════
-- ETF SIMULATOR — Supabase Database Setup
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════

-- 1. PROFILES — extends auth.users with display name
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  created_at timestamptz default now()
);

-- 2. PORTFOLIOS — stores every saved portfolio with full JSON data
create table public.portfolios (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text,
  ticker text,
  thesis text,
  strategy text,
  holdings jsonb,
  value numeric default 1000000,
  fee numeric,
  risk_profile text,
  time_horizon text,
  rebal_freq text,
  is_public boolean default false,
  portfolio_data jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. ROW LEVEL SECURITY — users see only their own data; public portfolios visible to all

alter table public.profiles enable row level security;
alter table public.portfolios enable row level security;

-- Profiles: users can read/insert/update their own profile
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Portfolios: users can CRUD their own; anyone can read public ones
create policy "Users can view own portfolios"
  on public.portfolios for select using (auth.uid() = user_id);
create policy "Anyone can view public portfolios"
  on public.portfolios for select using (is_public = true);
create policy "Users can insert own portfolios"
  on public.portfolios for insert with check (auth.uid() = user_id);
create policy "Users can update own portfolios"
  on public.portfolios for update using (auth.uid() = user_id);
create policy "Users can delete own portfolios"
  on public.portfolios for delete using (auth.uid() = user_id);

-- 4. AUTO-CREATE PROFILE ON SIGNUP — trigger fills profiles table automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. INDEXES — speed up common queries
create index idx_portfolios_user_id on public.portfolios (user_id);
create index idx_portfolios_is_public on public.portfolios (is_public) where is_public = true;
create index idx_portfolios_created_at on public.portfolios (created_at desc);

-- ═══ DONE — You can now view all user signups and portfolios in
--     Supabase Dashboard → Table Editor → profiles / portfolios
-- ═══════════════════════════════════════════════════════════════
