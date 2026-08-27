import { useCallback, useEffect, useState } from "react";
import { getFoldOfficialSupply } from "../lib/foldSupply";

const REFRESH_MS = 5 * 60 * 1000;

/**
 * Official circulating (and total) supply from supply.theinterfold.com.
 */
export function useFoldCirculatingSupply() {
  const [circulating, setCirculating] = useState(null);
  const [totalSupply, setTotalSupply] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (force = false) => {
    try {
      setError(null);
      const row = await getFoldOfficialSupply({ force });
      setCirculating(row.circulating);
      setTotalSupply(row.total);
      setFetchedAt(row.fetchedAt);
      if (row.error) setError(row.error);
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

  return { circulating, totalSupply, fetchedAt, error, loading, refresh };
}
