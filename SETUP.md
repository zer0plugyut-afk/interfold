# InterFold Community Board — setup

## SQL to run now (Supabase SQL editor)

1. Paste `supabase/migrations/003_timestamps_and_cursors.sql` (if not already).
2. Paste `supabase/migrations/004_crisp_sepolia.sql` — creates the CRISP tables (original names).
3. Paste `supabase/migrations/005_wipe_crisp_sepolia_for_mainnet.sql` — wipes Sepolia rows and renames tables to `if_crisp_mainnet_*`.

If this project already ran 004, you only need **005** now.

## CRISP mainnet (PR 1870)

Addresses live in `indexer/crisp-mainnet.json` (copied from `deployed_contracts.json` on [interfold#1870](https://github.com/theinterfold/interfold/pull/1870)):

| Contract | Address | Deploy block |
| --- | --- | --- |
| CRISPProgram | `0x847A22303639017bcDB7F7E49EEa4a4629c1169f` | 25812209 |
| SelfRegistry | `0x988104E6275359126bbDDDeE35159bd7d138A61C` | 25812212 |
| Interfold (shared mainnet) | `0x28cF63B459e6218C69EA97ea7D90541cf648c715` | sync from 25812209 |

1. Run `005_wipe_crisp_sepolia_for_mainnet.sql`
2. Confirm indexer `.env` `CRISP_*` matches the table above (`CRISP_NETWORK=mainnet`, `CRISP_CHAIN_ID=1`, mainnet RPC)
3. `npm start` — `crisp.js` indexes from the new deploy blocks

**ABIs** (Etherscan/Sourcify have nothing — the contract is unverified). They live next to the other indexer ABIs:

| File | Source |
| --- | --- |
| `indexer/abis/crisp-program.json` | Full CRISPProgram ABI from PR 1870 `CRISPProgram.sol` (events + functions). Regenerated with `cd indexer && npm run build-crisp-abi`. |
| `indexer/abis/self-registry.json` | Full SelfRegistry ABI from the same PR |
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
