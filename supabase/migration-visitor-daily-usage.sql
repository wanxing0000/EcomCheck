-- Visitor daily usage — anonymous GMC free-tier limits (1/day per client_id)
-- Run in Supabase SQL Editor. Safe to re-run.

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

-- No public policies — API service role bypasses RLS for read/write.

create or replace function public.consume_visitor_daily_usage(
  p_client_id text,
  p_audit_mode text,
  p_limit integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date := (timezone('utc', now()))::date;
  v_count integer := 0;
begin
  select audit_count
  into v_count
  from public.visitor_daily_usage
  where client_id = p_client_id
    and audit_mode = p_audit_mode
    and usage_date = v_date
  for update;

  if v_count is null then
    v_count := 0;
  end if;

  if v_count >= p_limit then
    return jsonb_build_object(
      'allowed', false,
      'used', v_count,
      'remaining', 0,
      'usage_date', v_date
    );
  end if;

  insert into public.visitor_daily_usage (client_id, audit_mode, usage_date, audit_count)
  values (p_client_id, p_audit_mode, v_date, 1)
  on conflict (client_id, audit_mode, usage_date)
  do update set
    audit_count = visitor_daily_usage.audit_count + 1,
    updated_at = now()
  returning audit_count into v_count;

  return jsonb_build_object(
    'allowed', true,
    'used', v_count,
    'remaining', greatest(p_limit - v_count, 0),
    'usage_date', v_date
  );
end;
$$;

grant execute on function public.consume_visitor_daily_usage(text, text, integer) to service_role;
