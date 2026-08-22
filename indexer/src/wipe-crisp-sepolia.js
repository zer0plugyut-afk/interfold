/**
 * Empty CRISP event/sync tables (run SQL 005 instead if you also need the rename).
 *   npm run wipe-crisp
 */
import path from "path";
import { fileURLToPath } from "url";
import { createIndexerClient } from "./supabase.js";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env"), override: false });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const eventsTable = process.env.CRISP_EVENTS_TABLE || "if_crisp_mainnet_events";
const syncTable = process.env.CRISP_SYNC_TABLE || "if_crisp_mainnet_sync_state";

if (!url || !key) {
  console.error("Need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createIndexerClient(url, key);

async function main() {
  console.log(`Wiping ${eventsTable} + ${syncTable}…`);

  const { error: e1 } = await sb.from(eventsTable).delete().gte("id", 0);
  if (e1) throw e1;

  const { error: e2 } = await sb.from(syncTable).delete().neq("contract_key", "");
  if (e2) throw e2;

  console.log("Done. Confirm CRISP_* env is mainnet, then npm start.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
