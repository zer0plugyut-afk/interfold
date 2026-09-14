-- Exit begin tx + current veFOLD NFT holder (escrow while exiting).
alter table public.if_locks
  add column if not exists created_at timestamptz;

alter table public.if_locks
  add column if not exists exit_tx text;

alter table public.if_locks
  add column if not exists nft_owner text;
