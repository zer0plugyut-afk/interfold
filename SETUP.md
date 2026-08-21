# InterFold Community Board — setup

## SQL to run now (Supabase SQL editor)

1. Paste `supabase/migrations/003_timestamps_and_cursors.sql` (if not already).
2. Paste `supabase/migrations/004_crisp_sepolia.sql` — CRISP Sepolia tables.

## CRISP → mainnet cutover (later)

1. Run `005_wipe_crisp_sepolia_for_mainnet.sql` *or* `cd indexer && npm run wipe-crisp-sepolia`
2. In indexer `.env`, set `CRISP_*` to mainnet program address + `CRISP_RPC_URL` (mainnet) + `CRISP_NETWORK=mainnet` + `CRISP_CHAIN_ID=1`
3. `npm start` — `crisp.js` re-indexes from the new deploy block

## Indexer

```bash
cd indexer
# set CRISP_RPC_URL (Sepolia Alchemy) in .env
npm run set-cursors
npm run backfill-timestamps
npm start                     # mainnet contracts + crisp.js every 5 min
```

CRISP lives in `src/crisp.js` and is imported by `index.js` — contract addresses are env-only.

## Frontend `.env`

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```
