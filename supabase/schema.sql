create table if not exists public.audit_reports (
  id uuid primary key,
  url text not null,
  created_at timestamptz not null default now(),
  score integer,
  platform text,
  gmc_score integer,
  data jsonb not null
);

create index if not exists audit_reports_created_at_idx
  on public.audit_reports (created_at desc);
