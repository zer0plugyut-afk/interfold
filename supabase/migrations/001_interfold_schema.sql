-- InterFold Community Board — fresh schema (run in a NEW Supabase project SQL editor)
-- Project-specific prefix: if_
-- Indexer writes with service_role. Frontend reads with anon (RLS SELECT only).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Sync cursors (one row per contract address)
-- ---------------------------------------------------------------------------
create table if not exists public.if_sync_state (
  contract_key text primary key,
  contract_address text not null,
  last_synced_block bigint not null default 0,
  deploy_block bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Decoded protocol events
-- ---------------------------------------------------------------------------
create table if not exists public.if_events (
  id bigserial primary key,
  contract_key text not null,
  contract_address text not null,
  event_name text not null,
  block_number bigint not null,
  log_index integer not null,
  tx_hash text not null,
  block_timestamp timestamptz,
  args jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (tx_hash, log_index)
);

create index if not exists if_events_block_idx on public.if_events (block_number desc, log_index desc);
create index if not exists if_events_contract_idx on public.if_events (contract_key, block_number desc);
create index if not exists if_events_name_idx on public.if_events (event_name);

-- ---------------------------------------------------------------------------
-- Operator snapshots (current state)
-- ---------------------------------------------------------------------------
create table if not exists public.if_operators (
  address text primary key,
  bond_owner text,
  ciphernode_bond numeric not null default 0,
  ticket_balance numeric not null default 0,
  available_tickets numeric not null default 0,
  tfold_balance numeric not null default 0,
  ticket_share_pct numeric not null default 0,
  is_active boolean not null default false,
  is_registered boolean not null default false,
  is_ciphernode_bonded boolean not null default false,
  has_exit_in_progress boolean not null default false,
  meets_register_floor boolean not null default false,
  meets_active_floor boolean not null default false,
  added_block bigint,
  added_tx text,
  updated_at timestamptz not null default now()
);

create index if not exists if_operators_active_idx on public.if_operators (is_active, available_tickets desc);

-- ---------------------------------------------------------------------------
-- Network live stats (single row id = 1)
-- ---------------------------------------------------------------------------
create table if not exists public.if_network_stats (
  id int primary key default 1 check (id = 1),
  latest_block bigint,
  requests_paused boolean,
  active_e3_count text,
  num_registered_operators text,
  num_active_operators text,
  num_ciphernodes text,
  required_ciphernode_bond text,
  ticket_price text,
  min_ticket_balance text,
  ciphernode_bond_active_bps text,
  exit_delay_days numeric,
  total_ciphernode_bond_liability text,
  fold_total_supply text,
  tfold_total_supply text,
  tfold_underlying text,
  active_ban_count text,
  slash_proposals text,
  sortition_submission_window text,
  unreleased_committee_count text,
  fetched_at timestamptz not null default now()
);

insert into public.if_network_stats (id) values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Event name counts (materialized by indexer)
-- ---------------------------------------------------------------------------
create table if not exists public.if_event_counts (
  contract_key text not null,
  event_name text not null,
  count bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (contract_key, event_name)
);

-- ---------------------------------------------------------------------------
-- RLS: public read, no public write
-- ---------------------------------------------------------------------------
alter table public.if_sync_state enable row level security;
alter table public.if_events enable row level security;
alter table public.if_operators enable row level security;
alter table public.if_network_stats enable row level security;
alter table public.if_event_counts enable row level security;

drop policy if exists "if_sync_state_read" on public.if_sync_state;
create policy "if_sync_state_read" on public.if_sync_state for select using (true);

drop policy if exists "if_events_read" on public.if_events;
create policy "if_events_read" on public.if_events for select using (true);

drop policy if exists "if_operators_read" on public.if_operators;
create policy "if_operators_read" on public.if_operators for select using (true);

drop policy if exists "if_network_stats_read" on public.if_network_stats;
create policy "if_network_stats_read" on public.if_network_stats for select using (true);

drop policy if exists "if_event_counts_read" on public.if_event_counts;
create policy "if_event_counts_read" on public.if_event_counts for select using (true);

-- Realtime publication is applied in 002_realtime_safe.sql
