# InterFold Community Board (React)

React + Vite community analytics for InterFold.

## Stack

| Path | Role |
| --- | --- |
| `src/` | React app (sidebar, operators, events, theme, Supabase realtime) |
| `indexer/` | Chain → Supabase writer (Railway-ready) |
| `supabase/migrations/` | SQL for a **new** InterFold-only Supabase project |
| `SETUP.md` | Where to put keys |

## Develop

```bash
npm install
npm run dev
```

Without `.env`, the app uses `public/data/poc-dataset.json`.

## Keys

**Frontend** `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**Indexer** `indexer/.env`:

```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
RPC_URL=https://ethereum-rpc.publicnode.com
```

See `SETUP.md` for the full path (migrations → seed → live sync).
