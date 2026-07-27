-- M2: values card-sort storage. Not present in the original BLUEPRINT.md §4.1
-- table list — that gap surfaced while building the onboarding psych baseline
-- (directive.schema.json's value_link needs somewhere to point). Documented
-- retroactively in BLUEPRINT.md alongside this migration.

create table user_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  values text[] not null,
  selected_at timestamptz not null default now(),
  constraint user_values_exactly_three check (array_length(values, 1) = 3)
);

create index on user_values (user_id, selected_at desc);

alter table user_values enable row level security;

create policy "owner full access" on user_values
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
