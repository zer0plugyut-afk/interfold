# What we can build now (vs later)

Snapshot from mainnet scan (`npm run scan` in `poc-dashboard`).

## Buildable now — real events + live reads

| Feature | Why official dashboard misses it | Data we already have |
| --- | --- | --- |
| **Operator board** | Official UI = per-wallet setup guide (`#operator`) | 3 ciphernodes via `CiphernodeAdded`; bonds, tickets, owners, active flags |
| **Bonded FOLD + ticket TVL** | No network TVL / share metrics | 96,000 FOLD liability; 5,000 tFOLD; per-op ticket share (60% / 20% / 20%) |
| **Policy / pause panel** | Home leans Sepolia demo counters | `requestsPaused=true`, bond floor 32k, ticket price 1k, exit 30d, active BPS 80% |
| **Event timeline** | No historical feed | 38 bonding + 14 registry + 23 interfold + 7 slash logs (decoded) |

### Events that already happened (useful for PoC)

- Bonding: `BondOwnerSet` (5), `CiphernodeBondUpdated` (3), `TicketBalanceUpdated` (5), `OperatorActivationChanged` (3), config/init
- Registry: `CiphernodeAdded` (3), wiring/config
- Interfold: setup only (`RequestsPausedSet`, verifiers, fee config, `E3ProgramRegistered`) — **no `E3Requested`**
- Slashing: role/wiring only — **no proposals**

## Later — wait for chain activity

| Feature | Blocker |
| --- | --- |
| E3 lifecycle explorer | `requestsPaused` + zero E3 request events |
| Sortition fairness auditor | No `CommitteeRequested` / `TicketSubmitted` |
| Slash / refund explorer | No `SlashProposed` / appeals |

Mock verifiers / MockE3Program are registered for rehearsal — not something to “dashboard” as production truth; better as a **warning badge** once E3s exist.

## PoC decision

Ship the **gap board** (operators + TVL + policy + timeline) from JSON. Re-scan as mainnet unpauses; then add E3/sortition panes.
