import { createClient } from "@supabase/supabase-js";
import ws from "ws";

/** Indexer only needs REST writes — still pass ws so Node <22 / Alpine boots cleanly. */
export function createIndexerClient(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });
}
