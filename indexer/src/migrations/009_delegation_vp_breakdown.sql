-- Voting-power breakdown on if_delegations (BondedVotes = locked + bonded + vesting).

alter table public.if_delegations
  add column if not exists locked_votes numeric not null default 0;

alter table public.if_delegations
  add column if not exists bonded_votes numeric not null default 0;

alter table public.if_delegations
  add column if not exists vesting_votes numeric not null default 0;
