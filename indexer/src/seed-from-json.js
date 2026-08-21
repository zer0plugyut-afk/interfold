/**
 * Seed Supabase from the existing PoC JSON snapshot (one-time bootstrap).
 * Run AFTER applying supabase/migrations/*.sql
 *
 *   cd indexer && npm run seed-json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in indexer/.env");
  process.exit(1);
}

const datasetPath = path.join(__dirname, "../../public/data/poc-dataset.json");
const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
const sb = createClient(url, key, { auth: { persistSession: false } });

const KEY_MAP = {
  BondingRegistry: "bonding",
  CiphernodeRegistry: "registry",
  Interfold: "interfold",
  SlashingManager: "slash",
};

async function main() {
  console.log("Seeding from", datasetPath);

  const live = dataset.live;
  await sb.from("if_network_stats").upsert({
    id: 1,
    latest_block: live.latestBlock,
    requests_paused: live.requestsPaused,
    active_e3_count: live.activeE3Count,
    num_registered_operators: live.numRegisteredOperators,
    num_active_operators: live.numActiveOperators,
    num_ciphernodes: live.numCiphernodes,
    required_ciphernode_bond: live.requiredCiphernodeBond,
    ticket_price: live.ticketPrice,
    min_ticket_balance: live.minTicketBalance,
    ciphernode_bond_active_bps: live.ciphernodeBondActiveBps,
    exit_delay_days: live.exitDelayDays,
    total_ciphernode_bond_liability: live.totalCiphernodeBondLiability,
    fold_total_supply: live.foldTotalSupply,
    tfold_total_supply: live.tfoldTotalSupply,
    tfold_underlying: live.tfoldUnderlying,
    active_ban_count: live.activeBanCount,
    slash_proposals: live.slashProposals,
    sortition_submission_window: live.sortitionSubmissionWindow,
    unreleased_committee_count: live.unreleasedCommitteeCount,
    fetched_at: live.fetchedAt || new Date().toISOString(),
  });

  const ops = (dataset.operators || []).map((o) => ({
    address: o.address,
    bond_owner: o.bondOwner,
    ciphernode_bond: Number(o.ciphernodeBond),
    ticket_balance: Number(o.ticketBalance),
    available_tickets: Number(o.availableTickets),
    tfold_balance: Number(o.tfoldBalance),
    ticket_share_pct: Number(o.ticketSharePct),
    is_active: !!o.isActive,
    is_registered: !!o.isRegistered,
    is_ciphernode_bonded: !!o.isCiphernodeBonded,
    has_exit_in_progress: !!o.hasExitInProgress,
    meets_register_floor: !!o.meetsRegisterFloor,
    meets_active_floor: !!o.meetsActiveFloor,
    added_block: o.addedBlock,
    added_tx: o.addedTx,
    updated_at: new Date().toISOString(),
  }));
  if (ops.length) {
    const { error } = await sb.from("if_operators").upsert(ops);
    if (error) throw error;
  }

  const ADDR = {
    bonding: dataset.addresses?.bonding || "0x0ec90465095C21830BEcED07e032809A2Bd2915F",
    registry: dataset.addresses?.registry || "0xC927A5B2d8F68697bC28C0670df05178c93df2d7",
    interfold: dataset.addresses?.interfold || "0x28cF63B459e6218C69EA97ea7D90541cf648c715",
    slash: dataset.addresses?.slash || "0x974E865B1BB24AF2a9ef8204AdEA9251Cc7C5FD9",
  };

  const events = (dataset.timeline || []).map((e) => {
    const contract_key = KEY_MAP[e.contract] || "bonding";
    return {
      contract_key,
      contract_address: (ADDR[contract_key] || "").toLowerCase(),
      event_name: e.event,
      block_number: e.blockNumber,
      log_index: e.logIndex,
      tx_hash: e.txHash,
      args: e.args || {},
    };
  });

  for (let i = 0; i < events.length; i += 100) {
    const chunk = events.slice(i, i + 100);
    const { error } = await sb.from("if_events").upsert(chunk, { onConflict: "tx_hash,log_index" });
    if (error) throw error;
  }

  const summary = dataset.eventSummary || {};
  const counts = [];
  const summaryKeyToContract = {
    bonding: "bonding",
    registry: "registry",
    interfold: "interfold",
    slashing: "slash",
  };
  for (const [ck, map] of Object.entries(summary)) {
    if (ck === "totals" || typeof map !== "object") continue;
    const key = summaryKeyToContract[ck] || ck;
    for (const [event_name, count] of Object.entries(map)) {
      counts.push({
        contract_key: key,
        event_name,
        count,
        updated_at: new Date().toISOString(),
      });
    }
  }
  if (counts.length) {
    const { error } = await sb.from("if_event_counts").upsert(counts);
    if (error) throw error;
  }

  console.log(`Seeded operators=${ops.length} events=${events.length} counts=${counts.length}`);

  // Advance cursors so live indexer does not re-scan history
  for (const [label, key] of Object.entries(KEY_MAP)) {
    const subset = events.filter((e) => e.contract_key === key);
    const maxBlock = subset.reduce((m, e) => Math.max(m, e.block_number || 0), 0);
    if (!maxBlock) continue;
    const addr =
      key === "bonding"
        ? "0x0ec90465095C21830BEcED07e032809A2Bd2915F"
        : key === "registry"
          ? "0xC927A5B2d8F68697bC28C0670df05178c93df2d7"
          : key === "interfold"
            ? "0x28cF63B459e6218C69EA97ea7D90541cf648c715"
            : "0x974E865B1BB24AF2a9ef8204AdEA9251Cc7C5FD9";
    const deploy =
      key === "bonding" ? 25473398 : key === "registry" ? 25786378 : key === "interfold" ? 25786382 : 25786375;
    await sb.from("if_sync_state").upsert({
      contract_key: key,
      contract_address: addr,
      last_synced_block: maxBlock,
      deploy_block: deploy,
      updated_at: new Date().toISOString(),
    });
    console.log(`cursor ${key} → ${maxBlock} (${label})`);
  }

  console.log("Next: npm run backfill-timestamps  then  npm start");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
