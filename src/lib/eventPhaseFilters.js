/**
 * Client-side event phase / topic groups under each contract filter.
 * No DB change — matches against already-indexed `event` names.
 */

function nameIn(names) {
  const set = new Set(names);
  return (eventName) => set.has(eventName);
}

function nameMatch(re) {
  return (eventName) => re.test(eventName);
}

/** @type {Record<string, { id: string, label: string, match: (name: string) => boolean }[]>} */
export const EVENT_PHASE_GROUPS = {
  BondingRegistry: [
    {
      id: "bonds",
      label: "Bonds",
      match: nameIn([
        "CiphernodeBondUpdated",
        "CiphernodeBondSurplusSwept",
        "BondedCheckpointsSet",
        "BondedCheckpointsDetached",
      ]),
    },
    {
      id: "tickets",
      label: "Tickets",
      match: nameIn([
        "TicketBalanceUpdated",
        "SlashedTicketFundsReserved",
        "ReservedSlashedTicketFundsRouted",
      ]),
    },
    {
      id: "lifecycle",
      label: "Activation & exit",
      match: nameIn([
        "OperatorActivationChanged",
        "CiphernodeDeregistrationRequested",
        "AssetsQueuedForExit",
        "AssetsClaimed",
      ]),
    },
    {
      id: "owners",
      label: "Owners",
      match: nameMatch(/^BondOwner|OwnershipTransfer/),
    },
    {
      id: "slash",
      label: "Slash routes",
      match: nameIn([
        "PendingAssetsSlashed",
        "SlashLockUpdated",
        "SlashRouteDestinationReleased",
        "SlashRouteDestinationSnapshotted",
        "SlashedFundsTreasurySet",
        "SlashedFundsWithdrawn",
        "SlashingManagerAuthorizationUpdated",
        "SlashingManagerUpdated",
        "CommitteeObligationUpdated",
      ]),
    },
    {
      id: "config",
      label: "Config",
      match: nameIn([
        "BondingAssetConfigUpdated",
        "ConfigurationUpdated",
        "EligibilityConfigurationVersionUpdated",
        "ManagerBanUpdated",
        "RegistrySet",
        "RewardDistributorUpdated",
        "Initialized",
      ]),
    },
  ],

  CiphernodeRegistry: [
    {
      id: "nodes",
      label: "Nodes",
      match: nameIn(["CiphernodeAdded", "CiphernodeRemoved", "CiphernodeTreeCapacityWarning"]),
    },
    {
      id: "sortition",
      label: "Sortition",
      match: nameIn([
        "TicketSubmitted",
        "SortitionSubmissionWindowSet",
        "SortitionCommitteeFinalized",
      ]),
    },
    {
      id: "committee",
      label: "Committee",
      match: nameMatch(/^Committee/),
    },
    {
      id: "accusations",
      label: "Accusations",
      match: nameMatch(/^Accusation/),
    },
    {
      id: "dkg",
      label: "DKG attest",
      match: nameMatch(/^Dkg/),
    },
    {
      id: "config",
      label: "Config",
      match: nameIn([
        "BondingRegistrySet",
        "InterfoldSet",
        "RegistrySlashingManagerSet",
        "SlashingManagerSet",
        "Initialized",
        "OwnershipTransferStarted",
        "OwnershipTransferred",
      ]),
    },
  ],

  Interfold: [
    {
      id: "requester",
      label: "Requester",
      match: nameIn([
        "E3Requested",
        "RequestsPausedSet",
        "E3ProgramRegistered",
        "ParamSetRegistered",
        "MaxDurationSet",
        "TimeoutConfigUpdated",
        "FeeAssetConfigUpdated",
        "FeeTokenAllowed",
        "EncryptionSchemeEnabled",
        "MarkFailedGracePeriodSet",
        "E3RefundManagerSet",
      ]),
    },
    {
      id: "committee",
      label: "Committee",
      match: nameIn(["CommitteeFormed", "CommitteeFinalized", "CommitteeThresholdsUpdated"]),
    },
    {
      id: "inputs",
      label: "Inputs",
      match: nameIn(["InputPublished"]),
    },
    {
      id: "ciphertext",
      label: "Ciphertext",
      match: nameIn(["CiphertextOutputPublished", "CiphertextVerifierSet", "PkVerifierSet"]),
    },
    {
      id: "plaintext",
      label: "Plaintext",
      match: nameIn(["PlaintextOutputPublished"]),
    },
    {
      id: "failures",
      label: "Failures",
      match: nameIn(["E3Failed", "E3FailureProcessed", "E3StageChanged"]),
    },
    {
      id: "rewards",
      label: "Rewards & treasury",
      match: nameIn([
        "RewardClaimed",
        "RewardCredited",
        "RewardsDistributed",
        "TreasuryClaimed",
        "TreasuryCredited",
        "SlashedFundsEscrowed",
      ]),
    },
    {
      id: "config",
      label: "Config",
      match: nameIn([
        "BondingRegistrySet",
        "CiphernodeRegistrySet",
        "SlashingManagerSet",
        "Initialized",
        "OwnershipTransferStarted",
        "OwnershipTransferred",
      ]),
    },
  ],

  SlashingManager: [
    {
      id: "slash",
      label: "Slash flow",
      match: nameIn([
        "SlashProposed",
        "SlashExecuted",
        "SlashPolicyUpdated",
        "SlashRoutePending",
        "SlashRouteCompleted",
        "SlashedFundsEscrowedToRefund",
        "E3DependenciesReleased",
        "RoutingFailed",
      ]),
    },
    {
      id: "appeals",
      label: "Appeals",
      match: nameIn(["AppealFiled", "AppealResolved"]),
    },
    {
      id: "bans",
      label: "Bans",
      match: nameIn(["BanProposed", "BanCancelled", "NodeBanUpdated"]),
    },
    {
      id: "roles",
      label: "Roles & admin",
      match: nameMatch(/^Role|DefaultAdmin|EIP712/),
    },
    {
      id: "config",
      label: "Config",
      match: nameIn([
        "BondingRegistrySet",
        "BondingRegistryUpdated",
        "CiphernodeRegistrySet",
        "CiphernodeRegistryUpdated",
        "InterfoldSet",
        "InterfoldUpdated",
        "E3RefundManagerSet",
        "E3RefundManagerUpdated",
      ]),
    },
  ],

  E3RefundManager: [
    {
      id: "refunds",
      label: "Refunds",
      match: nameIn([
        "RefundClaimed",
        "RefundDistributionCalculated",
      ]),
    },
    {
      id: "held-rewards",
      label: "Held rewards",
      match: nameIn([
        "SuccessRewardHeld",
        "HeldSuccessRewardClaimed",
        "RewardRecipientSnapshotted",
      ]),
    },
    {
      id: "slashed-funds",
      label: "Slashed funds",
      match: nameIn([
        "SlashedFundsEscrowed",
        "SlashedFundsApplied",
        "SlashedFundsCredited",
        "SlashedFundsClaimed",
        "SlashedFundsDistributedOnSuccess",
        "TreasurySlashedCredited",
        "TreasurySlashedClaimed",
      ]),
    },
    {
      id: "expulsions",
      label: "Expulsions",
      match: nameIn(["ExpulsionProposalStatusChanged"]),
    },
    {
      id: "policy",
      label: "Policy",
      match: nameIn([
        "E3PolicySnapshotted",
        "WorkAllocationUpdated",
        "TreasurySet",
        "TreasuryUpdated",
      ]),
    },
    {
      id: "config",
      label: "Config",
      match: nameIn([
        "InterfoldSet",
        "InterfoldUpdated",
        "Initialized",
        "OwnershipTransferStarted",
        "OwnershipTransferred",
      ]),
    },
  ],

  VotingEscrow: [
    {
      id: "locks",
      label: "Locks",
      match: nameIn(["Deposit", "Withdraw", "Merged", "Split"]),
    },
    {
      id: "admin",
      label: "Admin",
      match: nameIn(["MinDepositSet", "Sweep", "SweepNFT"]),
    },
  ],

  EscrowIVotesAdapter: [
    {
      id: "delegation",
      label: "Delegation",
      match: nameIn([
        "TokensDelegated",
        "TokensUndelegated",
        "DelegateChanged",
        "DelegateVotesChanged",
      ]),
    },
    {
      id: "config",
      label: "Config",
      match: nameIn(["AutoDelegationDisabledSet"]),
    },
  ],

  ExitQueue: [
    {
      id: "exits",
      label: "Exits",
      match: nameIn(["ExitQueued", "ExitCancelled", "Exit"]),
    },
    {
      id: "config",
      label: "Config",
      match: nameIn(["CooldownSet", "FeePercentSet", "MinLockSet"]),
    },
  ],

  veFOLD: [
    {
      id: "transfers",
      label: "Transfers",
      match: nameIn(["Transfer"]),
    },
  ],

  FOLDLocks: [
    {
      id: "active",
      label: "Active locks",
      match: nameIn(["ActiveLockUpdated", "ActiveLockRelinked"]),
    },
    {
      id: "queued",
      label: "Queued",
      match: nameIn(["QueuedLockUpdated"]),
    },
  ],
};

export function phasesForContract(contractId) {
  return EVENT_PHASE_GROUPS[contractId] || null;
}

export function eventMatchesPhase(contractId, phaseId, eventName) {
  if (!phaseId || phaseId === "all") return true;
  const groups = EVENT_PHASE_GROUPS[contractId];
  if (!groups) return true;
  const group = groups.find((g) => g.id === phaseId);
  if (!group) return true;
  return group.match(eventName);
}

export function countByPhase(timeline, contractId) {
  const groups = EVENT_PHASE_GROUPS[contractId];
  const out = { all: 0 };
  if (!groups) return out;
  for (const g of groups) out[g.id] = 0;
  for (const e of timeline) {
    if (e.contract !== contractId) continue;
    out.all += 1;
    for (const g of groups) {
      if (g.match(e.event)) out[g.id] += 1;
    }
  }
  return out;
}
