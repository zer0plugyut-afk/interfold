import { createPublicClient, http, fallback } from "viem";
import { mainnet } from "viem/chains";

const mem = new Map();
const STORAGE_KEY = "if_ens_v2";
const NEGATIVE = "";

/**
 * ENSv2 Universal Resolver path via viem (0xeee…eeee).
 * Prefer VITE_ETH_RPC_URL; fall back to public mainnet endpoints.
 */
const RPC_URLS = [
  typeof import.meta !== "undefined" && import.meta.env?.VITE_ETH_RPC_URL,
  "https://ethereum.publicnode.com",
  "https://cloudflare-eth.com",
  "https://eth.llamarpc.com",
].filter(Boolean);

let client;

function getClient() {
  if (!client) {
    client = createPublicClient({
      chain: mainnet,
      transport: fallback(
        RPC_URLS.map((url) => http(url, { retryCount: 1, timeout: 12_000 }))
      ),
    });
  }
  return client;
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeSession(map) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

function normalize(address) {
  if (!address || typeof address !== "string") return null;
  const a = address.trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(a) ? /** @type {`0x${string}`} */ (a) : null;
}

/**
 * Reverse-resolve via ENSv2 Universal Resolver (viem getEnsName).
 * Forward verification is enforced onchain by the Universal Resolver.
 * @param {string} address
 * @returns {Promise<string|null>}
 */
export async function lookupEns(address) {
  const key = normalize(address);
  if (!key) return null;

  if (mem.has(key)) {
    const v = mem.get(key);
    return v || null;
  }

  const session = readSession();
  if (Object.prototype.hasOwnProperty.call(session, key)) {
    mem.set(key, session[key] ?? NEGATIVE);
    return session[key] || null;
  }

  try {
    const name = await getClient().getEnsName({ address: key });
    const value = name || NEGATIVE;
    mem.set(key, value);
    session[key] = value;
    writeSession(session);
    return name || null;
  } catch {
    // Transient RPC / CCIP failures — memory-only so a refresh can retry
    mem.set(key, NEGATIVE);
    return null;
  }
}

/**
 * @param {string[]} addresses
 * @param {number} [concurrency]
 * @returns {Promise<Record<string, string>>}
 */
export async function lookupEnsMany(addresses, concurrency = 4) {
  const unique = [...new Set(addresses.map(normalize).filter(Boolean))];
  const out = {};
  let i = 0;

  async function worker() {
    while (i < unique.length) {
      const idx = i++;
      const addr = unique[idx];
      const name = await lookupEns(addr);
      if (name) out[addr] = name;
    }
  }

  const n = Math.min(concurrency, Math.max(unique.length, 0));
  if (n > 0) await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}
