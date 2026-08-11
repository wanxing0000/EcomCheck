-- AuditPilot audit_reports — run in Supabase SQL editor
-- `data` stores the full audit payload (report_json)

create table if not exists public.audit_reports (
  id uuid primary key,
  user_id uuid references auth.users (id) on delete cascade,
  url text not null,
  audit_mode text,
  score integer,
  platform text,
  gmc_score integer,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_reports_created_at_idx
  on public.audit_reports (created_at desc);

create index if not exists audit_reports_user_id_idx
  on public.audit_reports (user_id, created_at desc);

-- Migration for existing deployments (safe to re-run)
alter table public.audit_reports add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.audit_reports add column if not exists audit_mode text;

create index if not exists audit_reports_user_id_idx
  on public.audit_reports (user_id, created_at desc);

-- audit_usage — future quota system (record only, no limits yet)
create table if not exists public.audit_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  audit_mode text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_usage_user_id_idx
  on public.audit_usage (user_id, created_at desc);

-- Row Level Security — users can only read their own rows
alter table public.audit_reports enable row level security;
alter table public.audit_usage enable row level security;

drop policy if exists "Users read own audit_reports" on public.audit_reports;
create policy "Users read own audit_reports"
  on public.audit_reports
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users read own audit_usage" on public.audit_usage;
create policy "Users read own audit_usage"
  on public.audit_usage
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Inserts/updates are performed by the API via service role (bypasses RLS).

-- visitor_daily_usage — anonymous free-tier GMC limits (1/day per client_id)
create table if not exists public.visitor_daily_usage (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  audit_mode text not null,
  usage_date date not null default ((timezone('utc', now()))::date),
  audit_count integer not null default 0 check (audit_count >= 0),
  updated_at timestamptz not null default now(),
  unique (client_id, audit_mode, usage_date)
);

create index if not exists visitor_daily_usage_lookup_idx
  on public.visitor_daily_usage (client_id, audit_mode, usage_date);

alter table public.visitor_daily_usage enable row level security;
