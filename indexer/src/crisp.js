/**
 * CRISP (encrypted ballot) indexer — separate module.
 * Imported by index.js so `npm start` runs mainnet + CRISP together.
 *
 * Today: Sepolia CRISPProgram (+ paired Sepolia Interfold for E3 lifecycle).
 * Later (mainnet): wipe Sepolia rows (005_wipe…sql), set CRISP_* env to mainnet,
 * restart — no code structure change required.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Interface, JsonRpcProvider } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function env(name, fallback = "") {
  return (process.env[name] || fallback).trim();
}

function bool(name, fallback = true) {
  const v = env(name, fallback ? "true" : "false").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** All CRISP contract targets come from env — switch Sepolia → mainnet here. */
export function getCrispConfig() {
  if (!bool("CRISP_ENABLED", true)) return null;

  const network = env("CRISP_NETWORK", "sepolia");
  const chainId = Number(env("CRISP_CHAIN_ID", network === "mainnet" ? "1" : "11155111"));
  const rpcUrl =
    env("CRISP_RPC_URL") ||
    env("SEPOLIA_RPC_URL") ||
    (chainId === 1 ? env("RPC_URL") : "");

  const programAddress = env(
    "CRISP_PROGRAM_ADDRESS",
    "0x8D9c914446451fdE7FC0fdBcF20573E878c3DE5a"
  );
  const programDeploy = Number(env("CRISP_PROGRAM_DEPLOY_BLOCK", "11508527"));

  const interfoldAddress = env(
    "CRISP_INTERFOLD_ADDRESS",
    "0x38A8A686A420023568E995b57B4FBEA371555Ba7"
  );
  const interfoldDeploy = Number(env("CRISP_INTERFOLD_DEPLOY_BLOCK", "11508431"));

  const eventsTable = env("CRISP_EVENTS_TABLE", "if_crisp_sepolia_events");
  const syncTable = env("CRISP_SYNC_TABLE", "if_crisp_sepolia_sync_state");
  const chunk = Number(env("CRISP_LOG_CHUNK_SIZE", env("LOG_CHUNK_SIZE", "10000")));

  if (!rpcUrl) {
    console.warn("[CRISP] skipped — set CRISP_RPC_URL (or SEPOLIA_RPC_URL)");
    return null;
  }

  return {
    network,
    chainId,
    rpcUrl,
    eventsTable,
    syncTable,
    chunk,
    contracts: [
      {
        key: "crisp_program",
        label: "CRISPProgram",
        address: programAddress,
        deployBlock: programDeploy,
        abiFile: "crisp-program.json",
      },
      {
        key: "crisp_interfold",
        label: "CRISP-Interfold",
        address: interfoldAddress,
        deployBlock: interfoldDeploy,
        abiFile: "interfold.json",
      },
    ],
  };
}

function loadAbi(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "../abis", file), "utf8"));
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getLogs(provider, address, fromBlock, toBlock, chunk) {
  const out = [];
  for (let start = fromBlock; start <= toBlock; start += chunk) {
    const end = Math.min(start + chunk - 1, toBlock);
    let attempt = 0;
    for (;;) {
      try {
        const logs = await provider.getLogs({ address, fromBlock: start, toBlock: end });
        out.push(...logs);
        process.stdout.write(`  [CRISP] ${address.slice(0, 10)}… ${start}-${end}: ${logs.length}\n`);
        break;
      } catch (e) {
        const msg = e.shortMessage || e.message || String(e);
        attempt += 1;
        if (attempt >= 5) throw e;
        console.warn(`  [CRISP] retry ${attempt} ${start}-${end}: ${msg}`);
        await sleep(Math.min(10_000, 500 * 2 ** attempt));
      }
    }
  }
  return out;
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
    } catch {
      /* ignore */
    }
  }
  return map;
}

async function ensureSync(sb, cfg) {
  for (const c of cfg.contracts) {
    const { data } = await sb
      .from(cfg.syncTable)
      .select("contract_key")
      .eq("contract_key", c.key)
      .maybeSingle();
    if (!data) {
      await sb.from(cfg.syncTable).upsert({
        contract_key: c.key,
        contract_address: c.address,
        last_synced_block: c.deployBlock - 1,
        deploy_block: c.deployBlock,
        chain_id: cfg.chainId,
        network: cfg.network,
        updated_at: new Date().toISOString(),
      });
    }
  }
}

async function syncOne(sb, provider, cfg, contract, tip) {
  const abi = loadAbi(contract.abiFile);
  const iface = new Interface(abi);

  const { data: state } = await sb
    .from(cfg.syncTable)
    .select("*")
    .eq("contract_key", contract.key)
    .maybeSingle();

  let from = Number(state?.last_synced_block ?? contract.deployBlock - 1) + 1;
  if (from < contract.deployBlock) from = contract.deployBlock;
  if (from > tip) return 0;

  console.log(`\n[CRISP:${cfg.network}] ${contract.label} ${from} → ${tip}`);
  const logs = await getLogs(provider, contract.address, from, tip, cfg.chunk);
  const rows = [];

  for (const log of logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics, data: log.data });
      if (!parsed) continue;
      const args = {};
      parsed.fragment.inputs.forEach((input, idx) => {
        args[input.name || String(idx)] = serializeArg(parsed.args[idx]);
      });
      // Truncate huge ciphertext bytes for DB size
      if (typeof args.encryptedVote === "string" && args.encryptedVote.length > 200) {
        args.encryptedVote = `${args.encryptedVote.slice(0, 66)}…(${args.encryptedVote.length} hex)`;
      }
      rows.push({
        network: cfg.network,
        chain_id: cfg.chainId,
        contract_key: contract.key,
        contract_address: contract.address.toLowerCase(),
        event_name: parsed.name,
        block_number: Number(log.blockNumber),
        log_index: Number(log.index ?? log.logIndex ?? 0),
        tx_hash: log.transactionHash,
        args,
      });
    } catch {
      /* undecodable */
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
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await sb.from(cfg.eventsTable).upsert(chunk, {
        onConflict: "tx_hash,log_index",
        ignoreDuplicates: false,
      });
      if (error) throw error;
    }
  }

  await sb.from(cfg.syncTable).upsert({
    contract_key: contract.key,
    contract_address: contract.address,
    last_synced_block: tip,
    deploy_block: contract.deployBlock,
    chain_id: cfg.chainId,
    network: cfg.network,
    updated_at: new Date().toISOString(),
  });

  console.log(`[CRISP:${cfg.network}] ${contract.label} wrote ${rows.length}`);
  return rows.length;
}

/**
 * One CRISP sync pass. Safe to call from the main indexer loop.
 */
export async function syncCrisp(sb) {
  const cfg = getCrispConfig();
  if (!cfg) return 0;

  const provider = new JsonRpcProvider(cfg.rpcUrl, cfg.chainId, { staticNetwork: true });
  const tip = await provider.getBlockNumber();
  console.log(`[CRISP:${cfg.network}] tip ${tip} chain=${cfg.chainId}`);

  await ensureSync(sb, cfg);
  let total = 0;
  for (const c of cfg.contracts) {
    total += await syncOne(sb, provider, cfg, c, tip);
  }
  return total;
}
