-- Wipe Sepolia CRISP data before switching indexer to mainnet CRISP.
-- 1) Run this SQL
-- 2) Set CRISP_* env in indexer to mainnet addresses + CRISP_RPC_URL (mainnet)
-- 3) Optionally rename tables (uncomment below) so names match mainnet
-- 4) Restart indexer (npm start) — crisp.js will re-seed sync cursors from deploy blocks

truncate table public.if_crisp_sepolia_events restart identity;
truncate table public.if_crisp_sepolia_sync_state;

-- Optional: rename after wipe so the schema name matches mainnet
-- alter table public.if_crisp_sepolia_events rename to if_crisp_mainnet_events;
-- alter table public.if_crisp_sepolia_sync_state rename to if_crisp_mainnet_sync_state;
-- (If you rename, also update CRISP_EVENTS_TABLE / CRISP_SYNC_TABLE in indexer env.)
