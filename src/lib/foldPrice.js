/**
 * CoinGecko FOLD (The Interfold) — price + 7d sparkline, 5 minute client cache.
 * https://www.coingecko.com/en/coins/interfold
 */
const COINGECKO_ID = "interfold";
const CONTRACT = "0xE172e9B6cfBeeB5593bDcE3f077356FDb33af904";
const CACHE_KEY = "if_fold_price_v2";
const TTL_MS = 5 * 60 * 1000;
const SPARK_BARS = 20;

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.usd !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(entry) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

function downsampleSparkline(prices, target) {
  if (!prices?.length) return [];
  if (prices.length <= target) return [...prices];
  const step = prices.length / target;
  const out = [];
  for (let i = 0; i < target; i++) {
    const idx = Math.min(Math.floor(i * step), prices.length - 1);
    out.push(prices[idx]);
  }
  return out;
}

async function fetchSparkline() {
  const url = `https://api.coingecko.com/api/v3/coins/${COINGECKO_ID}/market_chart?vs_currency=usd&days=7`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko chart ${res.status}`);
  const json = await res.json();
  const prices = (json.prices || []).map((p) => Number(p[1])).filter((n) => Number.isFinite(n));
  return downsampleSparkline(prices, SPARK_BARS);
}

async function fetchPrice() {
  const urls = [
    `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_ID}&vs_currencies=usd&include_24hr_change=true`,
    `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${CONTRACT}&vs_currencies=usd&include_24hr_change=true`,
  ];

  let lastErr;
  let priceRow = null;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
      const json = await res.json();
      const row = json[COINGECKO_ID] || json[CONTRACT.toLowerCase()] || json[CONTRACT];
      if (row && typeof row.usd === "number") {
        priceRow = row;
        break;
      }
      lastErr = new Error("No price in response");
    } catch (e) {
      lastErr = e;
    }
  }
  if (!priceRow) throw lastErr || new Error("Price fetch failed");

  let spark = [];
  try {
    spark = await fetchSparkline();
  } catch {
    /* spark optional */
  }

  return {
    usd: priceRow.usd,
    change24h: typeof priceRow.usd_24h_change === "number" ? priceRow.usd_24h_change : null,
    spark,
    fetchedAt: Date.now(),
    source: "coingecko",
  };
}

export async function getFoldUsdPrice({ force = false } = {}) {
  const cached = readCache();
  if (!force && cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return { ...cached, fromCache: true };
  }
  try {
    const fresh = await fetchPrice();
    writeCache(fresh);
    return { ...fresh, fromCache: false };
  } catch (e) {
    if (cached) return { ...cached, fromCache: true, stale: true, error: e.message };
    throw e;
  }
}

export function formatUsd(amountFold, priceUsd, digits = 2) {
  if (priceUsd == null || !Number.isFinite(priceUsd)) return "—";
  const usd = Number(amountFold) * priceUsd;
  if (!Number.isFinite(usd)) return "—";
  const abs = Math.abs(usd);
  const sign = usd < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(digits)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(digits)}K`;
  if (abs >= 1) return `${sign}$${abs.toFixed(digits)}`;
  return `${sign}$${abs.toFixed(4)}`;
}

export function formatPriceUsd(priceUsd) {
  if (priceUsd == null || !Number.isFinite(priceUsd)) return "—";
  if (priceUsd >= 1) return `$${priceUsd.toFixed(3)}`;
  if (priceUsd >= 0.01) return `$${priceUsd.toFixed(4)}`;
  return `$${priceUsd.toFixed(5)}`;
}

/** Market cap from unlock-model circulating × spot price */
export function marketCapUsd(circulatingFold, priceUsd) {
  if (priceUsd == null || !Number.isFinite(priceUsd)) return null;
  return Number(circulatingFold) * priceUsd;
}

/** FDV = total supply × spot price */
export function fdvUsd(totalSupplyFold, priceUsd) {
  if (priceUsd == null || !Number.isFinite(priceUsd)) return null;
  return Number(totalSupplyFold) * priceUsd;
}
