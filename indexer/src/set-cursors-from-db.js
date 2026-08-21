/**
 * Advance if_sync_state from max(block_number) already in if_events.
 * Prevents expensive re-scans from deploy blocks after seeding.
 */
import path from "path";
import { fileURLToPath } from "url";
import { createIndexerClient } from "./supabase.js";
import dotenv from "dotenv";
import { CONTRACTS } from "./contracts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env"), override: false });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Need SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createIndexerClient(url, key);

async function main() {
  for (const c of Object.values(CONTRACTS)) {
    const { data, error } = await sb
      .from("if_events")
      .select("block_number")
      .eq("contract_key", c.key)
      .order("block_number", { ascending: false })
      .limit(1);
    if (error) throw error;
    const maxBlock = data?.[0]?.block_number ?? c.deployBlock - 1;
    const { error: upErr } = await sb.from("if_sync_state").upsert({
      contract_key: c.key,
      contract_address: c.address,
      last_synced_block: maxBlock,
      deploy_block: c.deployBlock,
      updated_at: new Date().toISOString(),
    });
    if (upErr) throw upErr;
    console.log(`${c.key}: cursor → ${maxBlock}`);
  }
  console.log("Done. Next indexer run will only scan tip − cursor.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
