-- Run in Supabase SQL editor (InterFold project)
-- 1) Ensure timestamp column exists (already in 001; safe if present)
alter table public.if_events
  add column if not exists block_timestamp timestamptz;

create index if not exists if_events_ts_idx
  on public.if_events (block_timestamp desc nulls last);

-- 2) Advance sync cursors to the latest event already in DB
--    so the indexer does NOT re-scan from deploy blocks.
with maxes as (
  select contract_key, max(block_number) as max_block
  from public.if_events
  group by contract_key
)
insert into public.if_sync_state (contract_key, contract_address, last_synced_block, deploy_block, updated_at)
select
  m.contract_key,
  case m.contract_key
    when 'bonding' then '0x0ec90465095C21830BEcED07e032809A2Bd2915F'
    when 'registry' then '0xC927A5B2d8F68697bC28C0670df05178c93df2d7'
    when 'interfold' then '0x28cF63B459e6218C69EA97ea7D90541cf648c715'
    when 'slash' then '0x974E865B1BB24AF2a9ef8204AdEA9251Cc7C5FD9'
    else '0x0000000000000000000000000000000000000000'
  end,
  m.max_block,
  case m.contract_key
    when 'bonding' then 25473398
    when 'registry' then 25786378
    when 'interfold' then 25786382
    when 'slash' then 25786375
    else 0
  end,
  now()
from maxes m
on conflict (contract_key) do update
set
  last_synced_block = greatest(public.if_sync_state.last_synced_block, excluded.last_synced_block),
  updated_at = now();
