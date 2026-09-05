import { useEffect, useMemo, useState } from "react";
import { lookupEnsMany } from "../lib/ens";

/**
 * @param {string[]} addresses
 * @returns {Record<string, string>} lowercase address → ENS name
 */
export function useEnsNames(addresses) {
  const key = useMemo(() => {
    const set = new Set();
    for (const a of addresses || []) {
      if (a && typeof a === "string") set.add(a.toLowerCase());
    }
    return [...set].sort().join(",");
  }, [addresses]);

  const list = useMemo(
    () => (key ? key.split(",") : []),
    [key]
  );

  const [names, setNames] = useState({});

  useEffect(() => {
    if (!list.length) {
      setNames({});
      return undefined;
    }
    let cancelled = false;
    lookupEnsMany(list).then((map) => {
      if (!cancelled) setNames(map);
    });
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- key fingerprints list

  return names;
}
