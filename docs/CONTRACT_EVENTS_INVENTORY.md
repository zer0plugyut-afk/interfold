# Mainnet contract events inventory

Source of truth for addresses: [Ciphernode Operators — Mainnet Contract Addresses](https://docs.theinterfold.com/ciphernode-operators#mainnet-contract-addresses) (checked against the live docs page).

Event lists for the four core protocol contracts come from the **implementation** ABIs (proxies only expose `AdminChanged` / `Upgraded`). Those match the ABIs already in `indexer/abis/`.  
`E3RefundManager`, token, and fee-token events were pulled from verified **implementation** ABIs on mainnet (Blockscout).

---

## Coverage vs docs

| Docs contract | Address | Deploy block | Board indexer? | How |
| --- | --- | ---: | --- | --- |
| Interfold | `0x28cF63B459e6218C69EA97ea7D90541cf648c715` | 25786382 | **Yes** | Full log sync → `if_events` (`contract_key=interfold`) |
| CiphernodeRegistry | `0xC927A5B2d8F68697bC28C0670df05178c93df2d7` | 25786378 | **Yes** | Full log sync (`registry`) |
| BondingRegistry | `0x0ec90465095C21830BEcEd07e032809A2Bd2915F` | 25473398 | **Yes** | Full log sync (`bonding`) |
| SlashingManager | `0x974E865B1BB24AF2a9ef8204AdEA9251Cc7C5FD9` | 25786375 | **Yes** | Full log sync (`slash`) |
| E3RefundManager | `0x1940eF168f4E0B3dA24BEca539856684793B0F6e` | 25786384 | **Yes** | Full log sync → `if_events` (`contract_key=refund`); **starts at tip** (no history backfill) |
| InterfoldTicketToken (tFOLD) | `0xC0B5b49a3949eC4B520eF21BaCFE16e3695F3B5D` | 25786372 | **Partial** | Address used for `totalSupply` / balances only — **events not indexed** |
| InterfoldToken (FOLD) | `0xE172e9B6cfBeeB5593bDcE3f077356FDb33af904` | 25473449 | **Partial** | Same — supply / tokenomics reads only |
| USDS (fee token) | `0xdC035D45d973E3EC169d2276DDab16f1e407384F` | 20663730 | **No** | Not indexed |
| sUSDS (ticket collateral) | `0xa3931d71877C0E7a3148CB7Eb4463524FEc27fbD` | 20677434 | **No** | Not indexed |

**Also on the board (not in that docs table):** CRISPProgram + SelfRegistry (+ Interfold companion logs for CRISP) via the separate CRISP indexer module.

**Bottom line:** the five core protocol contracts (Interfold, Registry, Bonding, Slashing, **E3RefundManager**) are fully programmed for event indexing. Tokens are used for gauges/tokenomics, not for a full event timeline.

---

## Important events for operator fees / rewards

| Event | Contract | In indexer ABI? | Will show in Events/Charts when it fires? |
| --- | --- | --- | --- |
| `RewardsDistributed` | Interfold | Yes | Yes (Charts “Reward flows”) |
| `RewardCredited` | Interfold | Yes | Yes |
| `RewardClaimed` | Interfold | Yes | Yes |
| `TreasuryCredited` / `TreasuryClaimed` | Interfold | Yes | Yes |
| `FeeAssetConfigUpdated` / `FeeTokenAllowed` | Interfold | Yes | Already seen (config only) |
| `RewardDistributorUpdated` | BondingRegistry | Yes | Already seen (config only) |
| `HeldSuccessRewardClaimed` | E3RefundManager | Yes | Yes (Events → Refunds) |
| `SuccessRewardHeld` | E3RefundManager | Yes | Yes |
| `SlashedFundsDistributedOnSuccess` | E3RefundManager | Yes | Yes |
| `RefundClaimed` / `RefundDistributionCalculated` | E3RefundManager | Yes | Yes |
| `Payout` | InterfoldTicketToken | — | **No** |

So: **success-path operator rewards that emit on Interfold are covered.** Refund / held-reward / slash-distribution flows on **E3RefundManager are not covered yet**.

---

## 1. Interfold — indexed ✅ (34 events)

Address: `0x28cF63…c715` · Impl: `0x8acbf7…61ba`

- `BondingRegistrySet`
- `CiphernodeRegistrySet`
- `CiphertextOutputPublished`
- `CiphertextVerifierSet`
- `CommitteeFinalized`
- `CommitteeFormed`
- `CommitteeThresholdsUpdated`
- `E3Failed`
- `E3FailureProcessed`
- `E3ProgramRegistered`
- `E3RefundManagerSet`
- `E3Requested`
- `E3StageChanged`
- `EncryptionSchemeEnabled`
- `FeeAssetConfigUpdated`
- `FeeTokenAllowed`
- `Initialized`
- `InputPublished`
- `MarkFailedGracePeriodSet`
- `MaxDurationSet`
- `OwnershipTransferStarted`
- `OwnershipTransferred`
- `ParamSetRegistered`
- `PkVerifierSet`
- `PlaintextOutputPublished`
- `RequestsPausedSet`
- `RewardClaimed`
- `RewardCredited`
- `RewardsDistributed`
- `SlashedFundsEscrowed`
- `SlashingManagerSet`
- `TimeoutConfigUpdated`
- `TreasuryClaimed`
- `TreasuryCredited`

---

## 2. CiphernodeRegistry — indexed ✅ (27 events)

Address: `0xC927A5…f2d7` · Impl: `0xb06aaf…9b7b`

- `AccusationVoteValidityProposalCancelled`
- `AccusationVoteValidityProposed`
- `AccusationVoteValiditySet`
- `BondingRegistrySet`
- `CiphernodeAdded`
- `CiphernodeRemoved`
- `CiphernodeTreeCapacityWarning`
- `CommitteeActivationChanged`
- `CommitteeFormationFailed`
- `CommitteeMemberExpelled`
- `CommitteeProofPublished`
- `CommitteePublished`
- `CommitteeRequested`
- `CommitteeViabilityUpdated`
- `DkgFoldAttestationContextEstablished`
- `DkgFoldAttestationVerifierProposalCancelled`
- `DkgFoldAttestationVerifierProposed`
- `DkgFoldAttestationVerifierUpdated`
- `Initialized`
- `InterfoldSet`
- `OwnershipTransferStarted`
- `OwnershipTransferred`
- `RegistrySlashingManagerSet`
- `SlashingManagerSet`
- `SortitionCommitteeFinalized`
- `SortitionSubmissionWindowSet`
- `TicketSubmitted`

---

## 3. BondingRegistry — indexed ✅ (31 events)

Address: `0x0ec904…915F` · Impl: `0x4ff6e7…40e4`

- `AssetsClaimed`
- `AssetsQueuedForExit`
- `BondOwnerSet`
- `BondOwnerTransferProposed`
- `BondedCheckpointsDetached`
- `BondedCheckpointsSet`
- `BondingAssetConfigUpdated`
- `CiphernodeBondSurplusSwept`
- `CiphernodeBondUpdated`
- `CiphernodeDeregistrationRequested`
- `CommitteeObligationUpdated`
- `ConfigurationUpdated`
- `EligibilityConfigurationVersionUpdated`
- `Initialized`
- `ManagerBanUpdated`
- `OperatorActivationChanged`
- `OwnershipTransferStarted`
- `OwnershipTransferred`
- `PendingAssetsSlashed`
- `RegistrySet`
- `ReservedSlashedTicketFundsRouted`
- `RewardDistributorUpdated`
- `SlashLockUpdated`
- `SlashRouteDestinationReleased`
- `SlashRouteDestinationSnapshotted`
- `SlashedFundsTreasurySet`
- `SlashedFundsWithdrawn`
- `SlashedTicketFundsReserved`
- `SlashingManagerAuthorizationUpdated`
- `SlashingManagerUpdated`
- `TicketBalanceUpdated`

---

## 4. SlashingManager — indexed ✅ (29 events)

Address: `0x974E86…5FD9`

- `AppealFiled`
- `AppealResolved`
- `BanCancelled`
- `BanProposed`
- `BondingRegistrySet`
- `BondingRegistryUpdated`
- `CiphernodeRegistrySet`
- `CiphernodeRegistryUpdated`
- `DefaultAdminDelayChangeCanceled`
- `DefaultAdminDelayChangeScheduled`
- `DefaultAdminTransferCanceled`
- `DefaultAdminTransferScheduled`
- `E3DependenciesReleased`
- `E3RefundManagerSet`
- `E3RefundManagerUpdated`
- `EIP712DomainChanged`
- `InterfoldSet`
- `InterfoldUpdated`
- `NodeBanUpdated`
- `RoleAdminChanged`
- `RoleGranted`
- `RoleRevoked`
- `RoutingFailed`
- `SlashExecuted`
- `SlashPolicyUpdated`
- `SlashProposed`
- `SlashRouteCompleted`
- `SlashRoutePending`
- `SlashedFundsEscrowedToRefund`

---

## 5. E3RefundManager — indexed ✅ (22 events)

Address: `0x1940eF…0F6e` · Impl: `0xe50624…f86a` · ABI: `indexer/abis/refund.json`

These cover failed-E3 refunds and slash redistribution:

- `E3PolicySnapshotted`
- `ExpulsionProposalStatusChanged`
- `HeldSuccessRewardClaimed`
- `Initialized`
- `InterfoldSet`
- `InterfoldUpdated`
- `OwnershipTransferStarted`
- `OwnershipTransferred`
- `RefundClaimed`
- `RefundDistributionCalculated`
- `RewardRecipientSnapshotted`
- `SlashedFundsApplied`
- `SlashedFundsClaimed`
- `SlashedFundsCredited`
- `SlashedFundsDistributedOnSuccess`
- `SlashedFundsEscrowed`
- `SuccessRewardHeld`
- `TreasurySet`
- `TreasurySlashedClaimed`
- `TreasurySlashedCredited`
- `TreasuryUpdated`
- `WorkAllocationUpdated`

---

## 6. InterfoldTicketToken (tFOLD) — events not indexed ❌ (13)

Address: `0xC0B5b4…3B5D` · Used only for supply/balance reads.

- `Approval`
- `DelegateChanged`
- `DelegateVotesChanged`
- `EIP712DomainChanged`
- `ERC20Rescued`
- `OwnershipTransferStarted`
- `OwnershipTransferred`
- `Payout`
- `RegistryChangeCancelled`
- `RegistryChanged`
- `RegistryChangeRequested`
- `RegistryLocked`
- `Transfer`

---

## 7. InterfoldToken (FOLD) — events not indexed ❌ (19)

Address: `0xE172e9…f904` · Used for supply / tokenomics, not event sync.

- `ActiveLockRelinked`
- `ActiveLockUpdated`
- `AllocationMinted`
- `Approval`
- `ClaimLockExemptUpdated`
- `ClaimSourceSet`
- `DelegateChanged`
- `DelegateVotesChanged`
- `EIP712DomainChanged`
- `OwnershipTransferStarted`
- `OwnershipTransferred`
- `PolicyDefined`
- `QueuedLockUpdated`
- `RoleAdminChanged`
- `RoleGranted`
- `RoleRevoked`
- `TgeTriggered`
- `Transfer`
- `TransferWhitelistUpdated`

---

## 8. USDS (fee token) — not indexed ❌ (6)

Address: `0xdC035D…384F` · Impl: `0x1923df…4102`

- `Approval`
- `Deny`
- `Initialized`
- `Rely`
- `Transfer`
- `Upgraded`

---

## 9. sUSDS (ticket collateral) — not indexed ❌ (11)

Address: `0xa3931d…7fbD` · Impl: `0x4e7991…61e0`

- `Approval`
- `Deny`
- `Deposit`
- `Drip`
- `File`
- `Initialized`
- `Referral`
- `Rely`
- `Transfer`
- `Upgraded`
- `Withdraw`

---

## Are we covering the most important events?

**Yes for the live operator + E3 board today:**

- Operator bonding / tickets / activation → BondingRegistry  
- Registry / sortition / committee → CiphernodeRegistry  
- E3 lifecycle + fee config + reward *hooks* → Interfold  
- Slash proposals / bans → SlashingManager  

**Gaps that matter next:**

1. **Ticket/FOLD token event streams** — only needed if you want transfer/`Payout`/lock timelines; not required for the current operator table.  
2. **USDS / sUSDS** — usually unnecessary to index fully; fee/ticket story is already visible via Bonding + Interfold fee/reward events.

When Interfold emits `RewardsDistributed` / `RewardCredited` / `RewardClaimed`, the running indexer will store them and the Events + Charts UI will show them with no ABI change.
