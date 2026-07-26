-- Operator Phase 1 schema (M0).
-- Mirrors BLUEPRINT.md §4. Every table is owned by exactly one auth.users
-- row, directly or via its parent chain, and RLS enforces that ownership —
-- there is no service-role bypass built into these policies; deterministic
-- jobs (VACR, scoring, Sunday Review assembly) run with the service role
-- key, which is not subject to RLS.

create extension if not exists pgcrypto;

-- ===================================================================
-- 4.1 Onboarding
-- ===================================================================

create table diagnostic_intake (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_model text,
  offer text,
  pricing jsonb,
  ttm_revenue numeric,
  lead_sources jsonb,
  hours_breakdown jsonb,
  what_tried text,
  constraint_hypothesis text check (
    constraint_hypothesis in (
      'constraint_finder', 'offer_bench', 'lead_engine', 'money_rules',
      'time_buyback', 'owner_independence', 'execution_cadence'
    )
  ),
  constraint_confidence numeric check (constraint_confidence between 0 and 1),
  created_at timestamptz not null default now()
);

create table scale_administration (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  instrument text not null check (instrument in ('who5', 'ngse', 'ips')),
  responses jsonb not null,
  score numeric not null,
  cycle_day int not null check (cycle_day in (0, 45, 90)),
  floor_policy_triggered boolean not null default false,
  administered_at timestamptz not null default now()
);

create table profit_baseline (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('xero', 'manual')),
  trailing_12mo_pnl jsonb not null,
  captured_at timestamptz not null default now()
);

-- ===================================================================
-- 4.2 Rock -> directive chain
-- ===================================================================

create table cycle (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  billing_status text,
  gate_result jsonb,
  created_at timestamptz not null default now(),
  constraint cycle_dates_valid check (end_date > start_date)
);

create table rock (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references cycle (id) on delete cascade,
  statement text not null,
  constraint_module text check (
    constraint_module in (
      'constraint_finder', 'offer_bench', 'lead_engine', 'money_rules',
      'time_buyback', 'owner_independence', 'execution_cadence'
    )
  ),
  status text not null default 'proposed' check (
    status in ('proposed', 'approved', 'active', 'closed')
  ),
  created_at timestamptz not null default now()
);

create table weekly_lead_action (
  id uuid primary key default gen_random_uuid(),
  rock_id uuid not null references rock (id) on delete cascade,
  week_of date not null,
  statement text not null,
  created_at timestamptz not null default now()
);

create table daily_directive (
  id uuid primary key default gen_random_uuid(),
  weekly_lead_action_id uuid references weekly_lead_action (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  rock_link uuid not null references rock (id) on delete cascade,
  if_then_plan text not null,
  value_link text,
  verification_spec jsonb not null,
  anchor_time time,
  status text not null default 'pending' check (
    status in ('pending', 'done', 'skipped')
  ),
  created_at timestamptz not null default now()
);

-- ===================================================================
-- 4.3 Verification & resistance
-- ===================================================================

create table verification_artifact (
  id uuid primary key default gen_random_uuid(),
  directive_id uuid not null references daily_directive (id) on delete cascade,
  artifact_type text not null check (
    artifact_type in (
      'screenshot', 'photo', 'document', 'calendar_record', 'xero_object', 'call_log'
    )
  ),
  storage_path text,
  extraction jsonb,
  rubric_result jsonb,
  confidence numeric check (confidence between 0 and 1),
  status text not null check (status in ('verified', 'attested')),
  created_at timestamptz not null default now()
);

create table skip_log (
  id uuid primary key default gen_random_uuid(),
  directive_id uuid not null references daily_directive (id) on delete cascade,
  thought_selected text not null,
  triage_category text not null check (
    triage_category in ('low_expectancy', 'low_value', 'delay', 'impulsiveness')
  ),
  routed_protocol_id text not null,
  created_at timestamptz not null default now()
);

create table resistance_triage_event (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  skip_log_id uuid not null references skip_log (id) on delete cascade,
  block_type text not null check (
    block_type in ('low_expectancy', 'low_value', 'delay', 'impulsiveness')
  ),
  signal_phrase text,
  micro_protocol_id text not null,
  created_at timestamptz not null default now()
);

-- ===================================================================
-- 4.4 Scoring & review
-- ===================================================================

create table vacr_snapshot (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  window_size int not null default 30,
  verified_count int not null,
  assigned_count int not null,
  vacr numeric not null,
  computed_at timestamptz not null default now()
);

create table sunday_review (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cycle_id uuid not null references cycle (id) on delete cascade,
  profit_pulse jsonb,
  vacr_trend jsonb,
  pattern_insight text,
  micro_check jsonb,
  woop_output jsonb,
  week_of date not null,
  created_at timestamptz not null default now()
);

-- ===================================================================
-- Indexes for the lookups the daily/weekly loops actually run
-- ===================================================================

create index on daily_directive (user_id, created_at desc);
create index on daily_directive (rock_link);
create index on rock (cycle_id);
create index on weekly_lead_action (rock_id);
create index on verification_artifact (directive_id);
create index on skip_log (directive_id);
create index on resistance_triage_event (user_id);
create index on vacr_snapshot (user_id, computed_at desc);
create index on sunday_review (user_id, week_of desc);
create index on scale_administration (user_id, instrument, cycle_day);

-- ===================================================================
-- Row Level Security — every row is owned by exactly one user.
-- ===================================================================

alter table diagnostic_intake enable row level security;
alter table scale_administration enable row level security;
alter table profit_baseline enable row level security;
alter table cycle enable row level security;
alter table rock enable row level security;
alter table weekly_lead_action enable row level security;
alter table daily_directive enable row level security;
alter table verification_artifact enable row level security;
alter table skip_log enable row level security;
alter table resistance_triage_event enable row level security;
alter table vacr_snapshot enable row level security;
alter table sunday_review enable row level security;

create policy "owner full access" on diagnostic_intake
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner full access" on scale_administration
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner full access" on profit_baseline
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner full access" on cycle
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner full access" on rock
  for all using (
    exists (select 1 from cycle where cycle.id = rock.cycle_id and cycle.user_id = auth.uid())
  ) with check (
    exists (select 1 from cycle where cycle.id = rock.cycle_id and cycle.user_id = auth.uid())
  );

create policy "owner full access" on weekly_lead_action
  for all using (
    exists (
      select 1 from rock
      join cycle on cycle.id = rock.cycle_id
      where rock.id = weekly_lead_action.rock_id and cycle.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from rock
      join cycle on cycle.id = rock.cycle_id
      where rock.id = weekly_lead_action.rock_id and cycle.user_id = auth.uid()
    )
  );

create policy "owner full access" on daily_directive
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner full access" on verification_artifact
  for all using (
    exists (
      select 1 from daily_directive
      where daily_directive.id = verification_artifact.directive_id
        and daily_directive.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from daily_directive
      where daily_directive.id = verification_artifact.directive_id
        and daily_directive.user_id = auth.uid()
    )
  );

create policy "owner full access" on skip_log
  for all using (
    exists (
      select 1 from daily_directive
      where daily_directive.id = skip_log.directive_id
        and daily_directive.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from daily_directive
      where daily_directive.id = skip_log.directive_id
        and daily_directive.user_id = auth.uid()
    )
  );

create policy "owner full access" on resistance_triage_event
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner full access" on vacr_snapshot
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner full access" on sunday_review
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
