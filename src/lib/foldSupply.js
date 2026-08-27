/**
 * Official FOLD supply API — https://supply.theinterfold.com
 * Circulating: GET /api/circulating-supply → { "result": "<decimal string>" }
 * Total:       GET /api/total-supply       → { "result": "1200000000" }
 */

export const FOLD_SUPPLY_BASE = "https://supply.theinterfold.com";
export const FOLD_CIRCULATING_SUPPLY_URL = `${FOLD_SUPPLY_BASE}/api/circulating-supply`;
export const FOLD_TOTAL_SUPPLY_URL = `${FOLD_SUPPLY_BASE}/api/total-supply`;

const CACHE_MS = 5 * 60 * 1000;

/** @type {{ circulating: number|null, total: number|null, fetchedAt: number, error: string|null }|null} */
let cache = null;
/** @type {Promise<{ circulating: number|null, total: number|null, fetchedAt: number, error: string|null }>|null} */
let inflight = null;

function parseResult(json) {
  const raw = json?.result ?? json?.circulating ?? json?.supply ?? json;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

async function fetchSupplyNumber(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Supply API ${res.status}`);
  return parseResult(await res.json());
}

/**
 * Live circulating (+ optional total) from supply.theinterfold.com.
 * @param {{ force?: boolean }} [opts]
 */
export async function getFoldOfficialSupply({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache;
  }
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const [circulating, total] = await Promise.all([
        fetchSupplyNumber(FOLD_CIRCULATING_SUPPLY_URL),
        fetchSupplyNumber(FOLD_TOTAL_SUPPLY_URL).catch(() => null),
      ]);
      if (circulating == null) throw new Error("Invalid circulating supply response");
      cache = {
        circulating,
        total,
        fetchedAt: Date.now(),
        error: null,
      };
      return cache;
    } catch (e) {
      const err = e.message || String(e);
      if (cache) {
        return { ...cache, error: err };
      }
      cache = { circulating: null, total: null, fetchedAt: Date.now(), error: err };
      throw e;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
