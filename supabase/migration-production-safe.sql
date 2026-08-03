-- =============================================================================
-- AuditPilot production-safe migration
-- Safe to re-run in Supabase SQL Editor. Does NOT drop tables or delete data.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. audit_reports — create if missing (minimal shell; existing table untouched)
-- -----------------------------------------------------------------------------
create table if not exists public.audit_reports (
  id uuid primary key,
  url text not null,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 2. audit_reports — add missing columns (preserves existing rows)
-- -----------------------------------------------------------------------------
alter table public.audit_reports add column if not exists user_id uuid;
alter table public.audit_reports add column if not exists audit_mode text;
alter table public.audit_reports add column if not exists score integer;
alter table public.audit_reports add column if not exists platform text;
alter table public.audit_reports add column if not exists gmc_score integer;
alter table public.audit_reports add column if not exists data jsonb;

-- Backfill data for any legacy rows that predate the jsonb column (no-op if none)
update public.audit_reports
set data = '{}'::jsonb
where data is null;

-- Foreign key on user_id (add only if not already present)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_reports_user_id_fkey'
      and conrelid = 'public.audit_reports'::regclass
  ) then
    alter table public.audit_reports
      add constraint audit_reports_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end $$;

-- Indexes
create index if not exists audit_reports_created_at_idx
  on public.audit_reports (created_at desc);

create index if not exists audit_reports_user_id_idx
  on public.audit_reports (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 3. audit_usage — create if missing
-- -----------------------------------------------------------------------------
create table if not exists public.audit_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  audit_mode text not null,
  created_at timestamptz not null default now()
);

create index if not exists audit_usage_user_id_idx
  on public.audit_usage (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 4. Row Level Security (read-only for authenticated users; API uses service role)
-- -----------------------------------------------------------------------------
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
