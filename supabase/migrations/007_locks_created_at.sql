-- Add on-chain created timestamp for locks (Deposit block time, not indexer write time).
alter table public.if_locks
  add column if not exists created_at timestamptz;
