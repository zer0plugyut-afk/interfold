/**
 * Fill if_events.block_timestamp for rows missing it (uses RPC getBlock).
 * Batches unique block numbers to stay RPC-efficient.
 *
 *   npm run backfill-timestamps
 */
import path from "path";
import { fileURLToPath } from "url";
import { createIndexerClient } from "./supabase.js";
import { JsonRpcProvider } from "ethers";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env"), override: false });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rpc =
  process.env.RPC_URL ||
  process.env.ALCHEMY_RPC_URL ||
  process.env.ETHEREUM_RPC_URL;

if (!url || !key || !rpc) {
  console.error("Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RPC_URL");
  process.exit(1);
}

const sb = createIndexerClient(url, key);
const provider = new JsonRpcProvider(rpc, 1, { staticNetwork: true });

async function main() {
  const { data: rows, error } = await sb
    .from("if_events")
    .select("id,block_number")
    .is("block_timestamp", null)
    .order("block_number", { ascending: true })
    .limit(5000);
  if (error) throw error;
  if (!rows?.length) {
    console.log("No rows missing block_timestamp");
    return;
  }

  const uniqueBlocks = [...new Set(rows.map((r) => Number(r.block_number)))];
  console.log(`Backfilling ${rows.length} rows across ${uniqueBlocks.length} blocks…`);

  const tsByBlock = new Map();
  for (let i = 0; i < uniqueBlocks.length; i++) {
    const bn = uniqueBlocks[i];
    const block = await provider.getBlock(bn);
    if (block?.timestamp != null) {
      tsByBlock.set(bn, new Date(Number(block.timestamp) * 1000).toISOString());
    }
    if ((i + 1) % 25 === 0 || i === uniqueBlocks.length - 1) {
      console.log(`  blocks resolved ${i + 1}/${uniqueBlocks.length}`);
    }
  }

  let updated = 0;
  for (const row of rows) {
    const ts = tsByBlock.get(Number(row.block_number));
    if (!ts) continue;
    const { error: upErr } = await sb
      .from("if_events")
      .update({ block_timestamp: ts })
      .eq("id", row.id);
    if (upErr) throw upErr;
    updated += 1;
  }
  console.log(`Updated ${updated} event timestamps`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
