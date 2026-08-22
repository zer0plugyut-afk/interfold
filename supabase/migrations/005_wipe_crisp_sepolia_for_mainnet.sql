-- CRISP Sepolia → mainnet cutover.
-- 1) Run this SQL in the Supabase editor (wipes Sepolia rows, renames tables)
-- 2) Point indexer CRISP_* env at mainnet (see indexer/.env.example)
-- 3) Restart indexer (npm start) — crisp.js re-seeds sync cursors from deploy blocks

do $$
begin
  if to_regclass('public.if_crisp_sepolia_events') is not null then
    truncate table public.if_crisp_sepolia_events restart identity;
    truncate table public.if_crisp_sepolia_sync_state;
    alter table public.if_crisp_sepolia_events rename to if_crisp_mainnet_events;
    alter table public.if_crisp_sepolia_sync_state rename to if_crisp_mainnet_sync_state;
  elsif to_regclass('public.if_crisp_mainnet_events') is not null then
    truncate table public.if_crisp_mainnet_events restart identity;
    truncate table public.if_crisp_mainnet_sync_state;
  else
    raise exception 'CRISP tables not found — run 004_crisp_sepolia.sql first';
  end if;
end $$;

alter table public.if_crisp_mainnet_events alter column network set default 'mainnet';
alter table public.if_crisp_mainnet_events alter column chain_id set default 1;
alter table public.if_crisp_mainnet_sync_state alter column network set default 'mainnet';
alter table public.if_crisp_mainnet_sync_state alter column chain_id set default 1;

alter index if exists public.if_crisp_sepolia_events_block_idx
  rename to if_crisp_mainnet_events_block_idx;
alter index if exists public.if_crisp_sepolia_events_contract_idx
  rename to if_crisp_mainnet_events_contract_idx;
alter index if exists public.if_crisp_sepolia_events_name_idx
  rename to if_crisp_mainnet_events_name_idx;
alter index if exists public.if_crisp_sepolia_events_ts_idx
  rename to if_crisp_mainnet_events_ts_idx;

drop policy if exists "anon read if_crisp_sepolia_events" on public.if_crisp_mainnet_events;
drop policy if exists "anon read if_crisp_mainnet_events" on public.if_crisp_mainnet_events;
create policy "anon read if_crisp_mainnet_events"
  on public.if_crisp_mainnet_events for select to anon using (true);

drop policy if exists "anon read if_crisp_sepolia_sync_state" on public.if_crisp_mainnet_sync_state;
drop policy if exists "anon read if_crisp_mainnet_sync_state" on public.if_crisp_mainnet_sync_state;
create policy "anon read if_crisp_mainnet_sync_state"
  on public.if_crisp_mainnet_sync_state for select to anon using (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.if_crisp_mainnet_events;
  exception when duplicate_object then null;
  end;
end $$;

comment on table public.if_crisp_mainnet_events is
  'CRISP encrypted-ballot events (Ethereum mainnet). Addresses from interfold PR 1870.';
comment on table public.if_crisp_mainnet_sync_state is
  'CRISP indexer cursors (Ethereum mainnet).';
