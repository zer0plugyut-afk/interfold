# InterFold Community Board — setup

## SQL to run now (Supabase SQL editor)

1. Paste `supabase/migrations/003_timestamps_and_cursors.sql` (if not already).
2. Paste `supabase/migrations/004_crisp_sepolia.sql` — creates the CRISP tables (original names).
3. Paste `supabase/migrations/005_wipe_crisp_sepolia_for_mainnet.sql` — wipes Sepolia rows and renames tables to `if_crisp_mainnet_*`.

If this project already ran 004, you only need **005** now.

## CRISP mainnet

Addresses live in `indexer/crisp-mainnet.json`. Current program (registered
[tx 0x975b5104…8047](https://etherscan.io/tx/0x975b5104729480bdf914304ce81726041e27450580fab4cd2f2750b7f0848047)
at block 26004622):

| Contract | Address | Deploy block |
| --- | --- | --- |
| CRISPProgram | `0x53FCdb21E73A461CfE6c64B19855204384B91BA3` | 25998868 |
| SelfRegistry | `0x988104E6275359126bbDDDeE35159bd7d138A61C` | 25812212 |
| Interfold (shared mainnet) | `0x28cF63B459e6218C69EA97ea7D90541cf648c715` | sync from 25998868 |

Previous CRISPProgram (`0x847A2230…c1169f`) is kept under `previous` in the JSON for reference.

### Indexer env (local `.env` + Railway)

These keys are part of the normal indexer env (see `indexer/.env.example`). Keep the same set on Railway — only the program address / deploy blocks change on cutover:

```
CRISP_ENABLED=true
CRISP_NETWORK=mainnet
CRISP_CHAIN_ID=1
CRISP_RPC_URL=
CRISP_PROGRAM_ADDRESS=0x53FCdb21E73A461CfE6c64B19855204384B91BA3
CRISP_PROGRAM_DEPLOY_BLOCK=25998868
CRISP_SELF_REGISTRY_ADDRESS=0x988104E6275359126bbDDDeE35159bd7d138A61C
CRISP_SELF_REGISTRY_DEPLOY_BLOCK=25812212
CRISP_INTERFOLD_ADDRESS=0x28cF63B459e6218C69EA97ea7D90541cf648c715
CRISP_INTERFOLD_DEPLOY_BLOCK=25998868
CRISP_EVENTS_TABLE=if_crisp_mainnet_events
CRISP_SYNC_TABLE=if_crisp_mainnet_sync_state
```

`CRISP_EVENTS_TABLE` / `CRISP_SYNC_TABLE` point at the Supabase tables from migration 005 (`if_crisp_mainnet_events`, `if_crisp_mainnet_sync_state`). Leave them as-is unless you rename tables.

1. Confirm local + Railway `CRISP_*` match the block above
2. `npm start` — `crisp.js` detects address changes, resets the program cursor, and indexes from the deploy block

**ABIs** (Etherscan/Sourcify have nothing — the contract is unverified). They live next to the other indexer ABIs:

| File | Source |
| --- | --- |
| `indexer/abis/crisp-program.json` | Full CRISPProgram ABI (events + functions). Regenerated with `cd indexer && npm run build-crisp-abi`. |
| `indexer/abis/self-registry.json` | Full SelfRegistry ABI |
| `indexer/abis/interfold.json` | Shared mainnet InterFold (already used by the core indexer) |

The indexer only decodes **events** (`InputPublished`, `InterfoldBound`, `Registered`, plus InterFold E3 lifecycle). The extra function ABI is there so we can call view methods later (`getRoundData`, `decodeTally`, etc.).

## Indexer

```bash
cd indexer
npm run set-cursors
npm run backfill-timestamps
npm start                     # mainnet core contracts + crisp.js every 5 min
```

CRISP lives in `src/crisp.js` and is imported by `index.js` — defaults come from `crisp-mainnet.json`, overridable via env.

## Frontend `.env`

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
