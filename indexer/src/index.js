import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createIndexerClient } from "./supabase.js";
import { Contract, Interface, JsonRpcProvider, formatUnits, getAddress } from "ethers";
import dotenv from "dotenv";
import { CONTRACTS, TOKENS } from "./contracts.js";
import { syncCrisp } from "./crisp.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// File .env fills gaps only — Railway / shell env always wins (override: false)
dotenv.config({ path: path.join(__dirname, "../.env"), override: true });
// override:true so indexer/.env wins over stale shell POLL_INTERVAL_MS (was often 30s)

const ONCE = process.argv.includes("--once");
// Default: every 5 minutes — tip-only range from last_synced_block (RPC-efficient)
const POLL_MS = Number(process.env.POLL_INTERVAL_MS || 5 * 60 * 1000);
const CHUNK = Number(process.env.LOG_CHUNK_SIZE || 10_000);

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}. Copy indexer/.env.example → indexer/.env`);
  return v;
}

/** Railway / local: set RPC_URL (or ALCHEMY_RPC_URL) to override. */
function resolveRpcUrl() {
  const rpc =
    process.env.RPC_URL ||
    process.env.ALCHEMY_RPC_URL ||
    process.env.ETHEREUM_RPC_URL ||
    process.env.VITE_ALCHEMY_RPC_URL;
  if (!rpc) {
    throw new Error(
      "Missing RPC_URL (or ALCHEMY_RPC_URL). Public RPCs often return 403 on eth_getLogs — use Alchemy."
    );
  }
  return rpc.trim();
}

function loadAbi(file) {
  const raw = fs
    .readFileSync(path.join(__dirname, "../abis", file), "utf8")
    .replace(/^\uFEFF/, "")
    .trim();
  let parsed = JSON.parse(raw);
  if (typeof parsed === "string") parsed = JSON.parse(parsed);
  return parsed;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function serializeArg(v) {
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(serializeArg);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) {
      if (/^\d+$/.test(k)) continue;
      out[k] = serializeArg(val);
    }
    return out;
  }
  return v;
}

async function getLogs(provider, address, fromBlock, toBlock) {
  const out = [];
  for (let start = fromBlock; start <= toBlock; start += CHUNK) {
    const end = Math.min(start + CHUNK - 1, toBlock);
    let attempt = 0;
    for (;;) {
      try {
        const logs = await provider.getLogs({ address, fromBlock: start, toBlock: end });
        out.push(...logs);
        process.stdout.write(`  ${address.slice(0, 10)}… ${start}-${end}: ${logs.length}\n`);
        break;
      } catch (e) {
        const msg = e.shortMessage || e.message || String(e);
        if (/403|forbidden|rate|limit|exceed/i.test(msg)) {
          const err = new Error(
            `RPC getLogs blocked (${msg}). Set RPC_URL to an Alchemy HTTPS endpoint (pay-as-you-go works).`
          );
          err.code = "RPC_LOGS_FORBIDDEN";
          throw err;
        }
        attempt += 1;
        if (attempt >= 5) throw e;
        const wait = Math.min(10_000, 500 * 2 ** attempt);
        console.warn(`  retry ${attempt} ${start}-${end}: ${msg}`);
        await sleep(wait);
      }
    }
  }
  return out;
}

async function fetchContractLogs(provider, address, fromBlock, toBlock) {
  const apiKey = process.env.ETHERSCAN_API_KEY || process.env.VITE_ETHERSCAN_API_KEY;
  if (apiKey) {
    const viaScan = await etherscanLogs(address, fromBlock, toBlock, apiKey);
    if (viaScan) {
      console.log(`  etherscan logs: ${viaScan.length}`);
      return viaScan;
    }
  }
  try {
    return await getLogs(provider, address, fromBlock, toBlock);
  } catch (e) {
    if (e.code === "RPC_LOGS_FORBIDDEN" && apiKey) {
      console.warn("  RPC blocked — retrying full range via Etherscan…");
      const viaScan = await etherscanLogs(address, fromBlock, toBlock, apiKey);
      if (viaScan) return viaScan;
    }
    throw e;
  }
}

async function etherscanLogs(address, fromBlock, toBlock, apiKey) {
  if (!apiKey) return null;
  const url =
    `https://api.etherscan.io/v2/api?chainid=1&module=logs&action=getLogs` +
    `&address=${address}&fromBlock=${fromBlock}&toBlock=${toBlock}&page=1&offset=1000&apikey=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status === "0" && /No records/i.test(String(json.message) + String(json.result))) return [];
  if (json.status !== "1" || !Array.isArray(json.result)) {
    console.warn("etherscan fallback failed", json.message || json.result);
    return null;
  }
  return json.result.map((l) => ({
    address: l.address,
    topics: l.topics,
    data: l.data,
    blockNumber: parseInt(l.blockNumber, 16),
    transactionHash: l.transactionHash,
    index: parseInt(l.logIndex, 16),
  }));
}

async function ensureSyncRows(sb, latest) {
  for (const c of Object.values(CONTRACTS)) {
    const { data } = await sb
      .from("if_sync_state")
      .select("contract_key,last_synced_block")
      .eq("contract_key", c.key)
      .maybeSingle();

    const tipCursor = Number(latest);
    const backfillStart = c.deployBlock - 1;

    if (!data) {
      await sb.from("if_sync_state").upsert({
        contract_key: c.key,
        contract_address: c.address,
        last_synced_block: c.startAtTip ? tipCursor : backfillStart,
        deploy_block: c.deployBlock,
        updated_at: new Date().toISOString(),
      });
      if (c.startAtTip) {
        console.log(`[${c.label}] startAtTip — cursor set to ${tipCursor} (no history backfill)`);
      }
      continue;
    }

    // If a prior run primed refund at deploy-1, jump to tip instead of scanning empty range
    if (c.startAtTip && Number(data.last_synced_block) <= backfillStart) {
      await sb
        .from("if_sync_state")
        .update({
          last_synced_block: tipCursor,
          updated_at: new Date().toISOString(),
        })
        .eq("contract_key", c.key);
      console.log(`[${c.label}] startAtTip — jumped cursor ${data.last_synced_block} → ${tipCursor}`);
    }
  }
}

async function resolveBlockTimestamps(provider, blockNumbers) {
  const unique = [...new Set(blockNumbers.map(Number))];
  const map = new Map();
  for (const bn of unique) {
    try {
      const block = await provider.getBlock(bn);
      if (block?.timestamp != null) {
        map.set(bn, new Date(Number(block.timestamp) * 1000).toISOString());
      }
    } catch (e) {
      console.warn(`  block ts fail ${bn}:`, e.shortMessage || e.message);
    }
  }
  return map;
}

async function upsertEvents(sb, rows) {
  if (!rows.length) return;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await sb.from("if_events").upsert(chunk, {
      onConflict: "tx_hash,log_index",
      ignoreDuplicates: false,
    });
    if (error) throw error;
  }
}

async function refreshEventCounts(sb) {
  const { data, error } = await sb.from("if_events").select("contract_key,event_name");
  if (error) throw error;
  const map = new Map();
  for (const row of data || []) {
    const k = `${row.contract_key}::${row.event_name}`;
    map.set(k, (map.get(k) || 0) + 1);
  }
  const rows = [...map.entries()].map(([k, count]) => {
    const [contract_key, event_name] = k.split("::");
    return { contract_key, event_name, count, updated_at: new Date().toISOString() };
  });
  if (rows.length) {
    const { error: upErr } = await sb.from("if_event_counts").upsert(rows, {
      onConflict: "contract_key,event_name",
    });
    if (upErr) throw upErr;
  }
}

async function refreshNetworkStats(sb, provider) {
  const bonding = new Contract(CONTRACTS.bonding.address, loadAbi("bonding.json"), provider);
  const registry = new Contract(CONTRACTS.registry.address, loadAbi("registry.json"), provider);
  const interfold = new Contract(CONTRACTS.interfold.address, loadAbi("interfold.json"), provider);
  const slash = new Contract(CONTRACTS.slash.address, loadAbi("slash.json"), provider);
  const fold = new Contract(
    TOKENS.fold,
    ["function totalSupply() view returns (uint256)"],
    provider
  );
  const tfold = new Contract(
    TOKENS.tfold,
    ["function totalSupply() view returns (uint256)", "function underlying() view returns (address)"],
    provider
  );

  const latest = await provider.getBlockNumber();
  const row = {
    id: 1,
    latest_block: latest,
    requests_paused: await interfold.requestsPaused(),
    active_e3_count: (await interfold.activeE3Count()).toString(),
    num_registered_operators: (await bonding.numRegisteredOperators()).toString(),
    num_active_operators: (await bonding.numActiveOperators()).toString(),
    num_ciphernodes: (await registry.numCiphernodes()).toString(),
    required_ciphernode_bond: formatUnits(await bonding.requiredCiphernodeBond(), 18),
    ticket_price: formatUnits(await bonding.ticketPrice(), 18),
    min_ticket_balance: (await bonding.minTicketBalance()).toString(),
    ciphernode_bond_active_bps: (await bonding.ciphernodeBondActiveBps()).toString(),
    exit_delay_days: Number(await bonding.exitDelay()) / 86400,
    total_ciphernode_bond_liability: formatUnits(await bonding.totalCiphernodeBondLiability(), 18),
    fold_total_supply: formatUnits(await fold.totalSupply(), 18),
    tfold_total_supply: formatUnits(await tfold.totalSupply(), 18),
    tfold_underlying: await tfold.underlying(),
    active_ban_count: (await slash.activeBanCount()).toString(),
    slash_proposals: (await slash.totalProposals()).toString(),
    sortition_submission_window: (await registry.sortitionSubmissionWindow()).toString(),
    unreleased_committee_count: (await registry.unreleasedCommitteeCount()).toString(),
    fetched_at: new Date().toISOString(),
  };

  const { error } = await sb.from("if_network_stats").upsert(row);
  if (error) throw error;
  return row;
}

async function refreshOperators(sb, provider) {
  const bonding = new Contract(CONTRACTS.bonding.address, loadAbi("bonding.json"), provider);
  const tfold = new Contract(
    TOKENS.tfold,
    ["function totalSupply() view returns (uint256)", "function balanceOf(address) view returns (uint256)"],
    provider
  );

  const { data: added, error } = await sb
    .from("if_events")
    .select("args,block_number,tx_hash")
    .eq("contract_key", "registry")
    .eq("event_name", "CiphernodeAdded");
  if (error) throw error;

  const removedSet = new Set();
  const { data: removed } = await sb
    .from("if_events")
    .select("args")
    .eq("contract_key", "registry")
    .eq("event_name", "CiphernodeRemoved");
  for (const r of removed || []) {
    const a = r.args?.node || r.args?.ciphernode || r.args?.operator;
    if (a) removedSet.add(getAddress(a));
  }

  const byAddr = new Map();
  for (const e of added || []) {
    const a = e.args?.node || e.args?.ciphernode || e.args?.operator;
    if (!a) continue;
    const addr = getAddress(a);
    if (removedSet.has(addr)) continue;
    const prev = byAddr.get(addr);
    if (!prev || e.block_number >= prev.added_block) {
      byAddr.set(addr, { address: addr, added_block: e.block_number, added_tx: e.tx_hash });
    }
  }

  // Fallback: BondOwnerSet operators that are registered
  if (byAddr.size === 0) {
    const { data: owners } = await sb
      .from("if_events")
      .select("args,block_number,tx_hash")
      .eq("contract_key", "bonding")
      .eq("event_name", "BondOwnerSet");
    for (const e of owners || []) {
      const a = e.args?.operator;
      if (!a) continue;
      const addr = getAddress(a);
      if (!byAddr.has(addr)) {
        byAddr.set(addr, { address: addr, added_block: e.block_number, added_tx: e.tx_hash });
      }
    }
  }

  const tSupply = await tfold.totalSupply();
  const required = await bonding.requiredCiphernodeBond();
  const activeBps = await bonding.ciphernodeBondActiveBps();
  const rows = [];

  for (const base of byAddr.values()) {
    try {
      const registered = await bonding.isRegistered(base.address);
      if (!registered && byAddr.size > 3) continue;
      const [bondAmt, tickets, active, bonded, owner, exitPending, available] = await Promise.all([
        bonding.getCiphernodeBond(base.address),
        bonding.getTicketBalance(base.address),
        bonding.isActive(base.address),
        bonding.isCiphernodeBonded(base.address),
        bonding.bondOwnerOf(base.address),
        bonding.hasExitInProgress(base.address),
        bonding.availableTickets(base.address),
      ]);
      const tBal = await tfold.balanceOf(base.address);
      rows.push({
        address: base.address,
        bond_owner: owner,
        ciphernode_bond: Number(formatUnits(bondAmt, 18)),
        ticket_balance: Number(formatUnits(tickets, 18)),
        available_tickets: Number(available),
        tfold_balance: Number(formatUnits(tBal, 18)),
        ticket_share_pct: tSupply > 0n ? (Number(tBal) / Number(tSupply)) * 100 : 0,
        is_active: active,
        is_registered: registered,
        is_ciphernode_bonded: bonded,
        has_exit_in_progress: exitPending,
        meets_register_floor: bondAmt >= required,
        meets_active_floor: bondAmt * 10000n >= required * activeBps,
        added_block: base.added_block,
        added_tx: base.added_tx,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("operator refresh skip", base.address, e.shortMessage || e.message);
    }
  }

  if (rows.length) {
    const { error: upErr } = await sb.from("if_operators").upsert(rows);
    if (upErr) throw upErr;
  }
  console.log(`operators upserted: ${rows.length}`);
  return rows;
}

async function syncContract(sb, provider, cfg, latest) {
  const abi = loadAbi(cfg.abiFile);
  const iface = new Interface(abi);

  const { data: state } = await sb
    .from("if_sync_state")
    .select("*")
    .eq("contract_key", cfg.key)
    .single();

  let fromBlock = Number(state?.last_synced_block ?? cfg.deployBlock - 1) + 1;
  if (fromBlock < cfg.deployBlock) fromBlock = cfg.deployBlock;
  if (fromBlock > latest) return 0;

  console.log(`\n[${cfg.label}] sync ${fromBlock} → ${latest}`);

  const logs = await fetchContractLogs(provider, cfg.address, fromBlock, latest);
  const rows = [];
  for (const log of logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (!parsed) continue;
      const args = {};
      parsed.fragment.inputs.forEach((input, idx) => {
        args[input.name || String(idx)] = serializeArg(parsed.args[idx]);
      });
      rows.push({
        contract_key: cfg.key,
        contract_address: cfg.address.toLowerCase(),
        event_name: parsed.name,
        block_number: Number(log.blockNumber),
        log_index: Number(log.index ?? log.logIndex ?? 0),
        tx_hash: log.transactionHash,
        args,
      });
    } catch {
      // undecodable
    }
  }

  if (rows.length) {
    const tsMap = await resolveBlockTimestamps(
      provider,
      rows.map((r) => r.block_number)
    );
    for (const row of rows) {
      row.block_timestamp = tsMap.get(row.block_number) || null;
    }
  }

  await upsertEvents(sb, rows);
  await sb
    .from("if_sync_state")
    .update({
      last_synced_block: latest,
      updated_at: new Date().toISOString(),
    })
    .eq("contract_key", cfg.key);

  console.log(`[${cfg.label}] wrote ${rows.length} events`);
  return rows.length;
}

async function syncOnce(sb, provider) {
  const latest = await provider.getBlockNumber();
  console.log("tip", latest);
  await ensureSyncRows(sb, latest);

  let total = 0;
  for (const cfg of Object.values(CONTRACTS)) {
    total += await syncContract(sb, provider, cfg, latest);
  }

  await refreshEventCounts(sb);
  await refreshNetworkStats(sb, provider);
  await refreshOperators(sb, provider);

  // CRISP is a separate module (crisp.js) — mainnet CRISPProgram from PR 1870
  let crispTotal = 0;
  try {
    crispTotal = await syncCrisp(sb);
  } catch (e) {
    console.error("[CRISP] sync error", e.shortMessage || e.message || e);
  }

  console.log(`sync complete (+${total} mainnet, +${crispTotal} crisp events)`);
}

async function main() {
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const rpc = resolveRpcUrl();

  const sb = createIndexerClient(url, key);
  const provider = new JsonRpcProvider(rpc, 1, { staticNetwork: true });

  console.log("InterFold indexer starting");
  console.log("supabase", url);
  console.log("rpc", rpc.replace(/\/v2\/[^/]+/, "/v2/***"));
  console.log("mode", ONCE ? "once" : `loop every ${POLL_MS / 1000}s`);
  console.log("strategy: tip-only from if_sync_state.last_synced_block (no full rescan)");
  console.log("coverage: ALL ABI events on bonding/registry/interfold/slash/refund — including E3* when unpaused");

  await syncOnce(sb, provider);
  if (ONCE) return;

  for (;;) {
    await sleep(POLL_MS);
    try {
      await syncOnce(sb, provider);
    } catch (e) {
      console.error("sync error", e.shortMessage || e.message || e);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
