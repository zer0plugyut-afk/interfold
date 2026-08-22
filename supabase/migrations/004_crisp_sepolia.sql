-- CRISP (encrypted ballot) — original table create (Sepolia names).
-- Run in Supabase SQL editor after 001/002/003.
-- Then run 005_wipe_crisp_sepolia_for_mainnet.sql to wipe and rename for mainnet.

create table if not exists public.if_crisp_sepolia_sync_state (
  contract_key text primary key,
  contract_address text not null,
  last_synced_block bigint not null default 0,
  deploy_block bigint not null default 0,
  chain_id bigint not null default 11155111,
  network text not null default 'sepolia',
  updated_at timestamptz not null default now()
);

create table if not exists public.if_crisp_sepolia_events (
  id bigserial primary key,
  network text not null default 'sepolia',
  chain_id bigint not null default 11155111,
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

create index if not exists if_crisp_sepolia_events_block_idx
  on public.if_crisp_sepolia_events (block_number desc, log_index desc);
create index if not exists if_crisp_sepolia_events_contract_idx
  on public.if_crisp_sepolia_events (contract_key, block_number desc);
create index if not exists if_crisp_sepolia_events_name_idx
  on public.if_crisp_sepolia_events (event_name);
create index if not exists if_crisp_sepolia_events_ts_idx
  on public.if_crisp_sepolia_events (block_timestamp desc nulls last);

alter table public.if_crisp_sepolia_events enable row level security;
alter table public.if_crisp_sepolia_sync_state enable row level security;

drop policy if exists "anon read if_crisp_sepolia_events" on public.if_crisp_sepolia_events;
create policy "anon read if_crisp_sepolia_events"
  on public.if_crisp_sepolia_events for select to anon using (true);

drop policy if exists "anon read if_crisp_sepolia_sync_state" on public.if_crisp_sepolia_sync_state;
create policy "anon read if_crisp_sepolia_sync_state"
  on public.if_crisp_sepolia_sync_state for select to anon using (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.if_crisp_sepolia_events;
  exception when duplicate_object then null;
  end;
end $$;

comment on table public.if_crisp_sepolia_events is
  'CRISP encrypted-ballot events (Sepolia today). Wipe via 005 before mainnet cutover.';
