import { useCallback, useEffect, useState } from "react";
import { getFoldUsdPrice } from "../lib/foldPrice";

const REFRESH_MS = 5 * 60 * 1000;

/**
 * Live FOLD/USD + 7d sparkline from CoinGecko (≤ every 5 minutes).
 */
export function useFoldPrice() {
  const [priceUsd, setPriceUsd] = useState(null);
  const [change24h, setChange24h] = useState(null);
  const [spark, setSpark] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (force = false) => {
    try {
      setError(null);
      const row = await getFoldUsdPrice({ force });
      setPriceUsd(row.usd);
      setChange24h(row.change24h);
      setSpark(Array.isArray(row.spark) ? row.spark : []);
      setFetchedAt(row.fetchedAt);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh(false);
    const id = setInterval(() => refresh(false), REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { priceUsd, change24h, spark, fetchedAt, error, loading, refresh };
}
