-- Voting-power breakdown on if_delegations (BondedVotes = locked + bonded + vesting).

alter table public.if_delegations
  add column if not exists locked_votes numeric not null default 0;

alter table public.if_delegations
  add column if not exists bonded_votes numeric not null default 0;

alter table public.if_delegations
  add column if not exists vesting_votes numeric not null default 0;

comment on column public.if_delegations.votes is
  'Total voting power from BondedVotes.getVotes (locked+delegated + bonded + vesting)';
comment on column public.if_delegations.locked_votes is
  'EscrowIVotesAdapter.getVotes — delegated veFOLD locks';
comment on column public.if_delegations.bonded_votes is
  'Ciphernode bond (BondedVotes checkpoints.bonded)';
comment on column public.if_delegations.vesting_votes is
  'Vesting/schedule-locked FOLD remainder (BondedVotes - locked - bonded)';
