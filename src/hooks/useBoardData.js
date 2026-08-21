import { useCallback, useEffect, useState } from "react";
import {
  loadFromJson,
  loadFromSupabase,
  subscribeRealtime,
  supabaseConfigured,
} from "../lib/supabaseData";

export function useBoardData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const next = supabaseConfigured
        ? await loadFromSupabase().catch(async (err) => {
            console.warn("Supabase load failed, using JSON", err);
            return loadFromJson();
          })
        : await loadFromJson();
      setData(next);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!supabaseConfigured) return undefined;
    let timer;
    const unsub = subscribeRealtime(() => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 400);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [refresh]);

  return { data, error, loading, refresh, supabaseConfigured };
}
