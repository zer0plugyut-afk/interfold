-- Governance lock / delegation (Aragon VE) — locked FOLD, not ciphernode bond.
-- Proxy addresses on mainnet (impls verified on Etherscan).

-- ---------------------------------------------------------------------------
-- Lock NFT positions (VotingEscrow)
-- ---------------------------------------------------------------------------
create table if not exists public.if_locks (
  token_id bigint primary key,
  owner text,
  amount numeric not null default 0,
  start_ts bigint,
  is_active boolean not null default true,
  is_exiting boolean not null default false,
  is_delegated boolean not null default false,
  delegatee text,
  exit_holder text,
  exit_date timestamptz,
  created_block bigint,
  created_tx text,
  withdrawn_block bigint,
  withdrawn_tx text,
  updated_at timestamptz not null default now()
);

create index if not exists if_locks_owner_idx on public.if_locks (owner);
create index if not exists if_locks_active_idx on public.if_locks (is_active, is_exiting);

-- ---------------------------------------------------------------------------
-- Wallet → delegatee mapping (EscrowIVotesAdapter)
-- ---------------------------------------------------------------------------
create table if not exists public.if_delegations (
  account text primary key,
  delegatee text,
  votes numeric not null default 0,
  updated_block bigint,
  updated_tx text,
  updated_at timestamptz not null default now()
);

create index if not exists if_delegations_delegatee_idx on public.if_delegations (delegatee);

-- ---------------------------------------------------------------------------
-- Aggregate governance gauges (single row id = 1)
-- ---------------------------------------------------------------------------
create table if not exists public.if_governance_stats (
  id int primary key default 1 check (id = 1),
  total_locked text,
  current_exiting text,
  active_lock_count bigint,
  exiting_lock_count bigint,
  delegated_account_count bigint,
  total_delegate_votes text,
  latest_block bigint,
  fetched_at timestamptz not null default now()
);

insert into public.if_governance_stats (id) values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS: public read
-- ---------------------------------------------------------------------------
alter table public.if_locks enable row level security;
alter table public.if_delegations enable row level security;
alter table public.if_governance_stats enable row level security;

drop policy if exists "if_locks_read" on public.if_locks;
create policy "if_locks_read" on public.if_locks for select using (true);

drop policy if exists "if_delegations_read" on public.if_delegations;
create policy "if_delegations_read" on public.if_delegations for select using (true);

drop policy if exists "if_governance_stats_read" on public.if_governance_stats;
create policy "if_governance_stats_read" on public.if_governance_stats for select using (true);

-- Realtime (safe re-run)
do $$
begin
  begin
    alter publication supabase_realtime add table public.if_locks;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.if_delegations;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.if_governance_stats;
  exception when duplicate_object then null;
  end;
end $$;
