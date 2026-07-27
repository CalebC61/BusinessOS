-- M3: stores the Xero OAuth grant needed to pull the trailing P&L (PRD §10.1)
-- and, later, the Sunday Review's weekly pull (M7). One connection per user.
--
-- access_token/refresh_token are sensitive. RLS still scopes rows to their
-- owner like everything else in this schema, but nothing in the app ever
-- reads this table from client code — only server route handlers touch it.
-- Tokens are stored in plaintext; encryption-at-rest (pgsodium/Vault) is a
-- reasonable follow-up before this handles real customer connections, not
-- done here.

create table xero_connection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tenant_id text not null,
  tenant_name text,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  connected_at timestamptz not null default now(),
  unique (user_id)
);

alter table xero_connection enable row level security;

create policy "owner full access" on xero_connection
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
