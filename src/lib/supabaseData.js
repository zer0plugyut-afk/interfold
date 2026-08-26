import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(
  url && anon && !String(url).includes("YOUR_PROJECT")
);

export const supabase = supabaseConfigured
  ? createClient(url, anon, { auth: { persistSession: false } })
  : null;

const LABEL = {
  bonding: "BondingRegistry",
  registry: "CiphernodeRegistry",
  interfold: "Interfold",
  slash: "SlashingManager",
  refund: "E3RefundManager",
};

const CRISP_LABEL = {
  crisp_program: "CRISPProgram",
  crisp_self_registry: "SelfRegistry",
  crisp_interfold: "CRISP-Interfold",
};

const CRISP_EVENTS_TABLE = "if_crisp_mainnet_events";

function mapOperator(o) {
  return {
    address: o.address,
    bondOwner: o.bond_owner,
    ciphernodeBond: o.ciphernode_bond,
    ticketBalance: o.ticket_balance,
    availableTickets: o.available_tickets,
    tfoldBalance: o.tfold_balance,
    ticketSharePct: o.ticket_share_pct,
    isActive: o.is_active,
    isRegistered: o.is_registered,
    isCiphernodeBonded: o.is_ciphernode_bonded,
    hasExitInProgress: o.has_exit_in_progress,
    meetsRegisterFloor: o.meets_register_floor,
    meetsActiveFloor: o.meets_active_floor,
    addedBlock: o.added_block,
    addedTx: o.added_tx,
  };
}

function mapLive(s) {
  if (!s) return null;
  return {
    fetchedAt: s.fetched_at,
    latestBlock: s.latest_block,
    requestsPaused: s.requests_paused,
    activeE3Count: s.active_e3_count,
    numRegisteredOperators: s.num_registered_operators,
    numActiveOperators: s.num_active_operators,
    numCiphernodes: s.num_ciphernodes,
    requiredCiphernodeBond: s.required_ciphernode_bond,
    ticketPrice: s.ticket_price,
    minTicketBalance: s.min_ticket_balance,
    ciphernodeBondActiveBps: s.ciphernode_bond_active_bps,
    exitDelayDays: s.exit_delay_days,
    totalCiphernodeBondLiability: s.total_ciphernode_bond_liability,
    foldTotalSupply: s.fold_total_supply,
    tfoldTotalSupply: s.tfold_total_supply,
    tfoldUnderlying: s.tfold_underlying,
    activeBanCount: s.active_ban_count,
    slashProposals: s.slash_proposals,
    sortitionSubmissionWindow: s.sortition_submission_window,
    unreleasedCommitteeCount: s.unreleased_committee_count,
  };
}

function mapEvent(e) {
  return {
    contract: LABEL[e.contract_key] || e.contract_key,
    event: e.event_name,
    blockNumber: e.block_number,
    logIndex: e.log_index,
    txHash: e.tx_hash,
    blockTimestamp: e.block_timestamp || null,
    args: e.args || {},
  };
}

function mapCrispEvent(e) {
  return {
    contract: CRISP_LABEL[e.contract_key] || e.contract_key,
    event: e.event_name,
    blockNumber: e.block_number,
    logIndex: e.log_index,
    txHash: e.tx_hash,
    blockTimestamp: e.block_timestamp || null,
    args: e.args || {},
    network: e.network || "mainnet",
    chainId: e.chain_id,
  };
}

export async function loadFromSupabase() {
  const [ops, stats, events, counts, crisp] = await Promise.all([
    supabase.from("if_operators").select("*").order("available_tickets", { ascending: false }),
    supabase.from("if_network_stats").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("if_events")
      .select("*")
      .order("block_number", { ascending: false })
      .order("log_index", { ascending: false })
      .limit(200),
    supabase.from("if_event_counts").select("*"),
    supabase
      .from(CRISP_EVENTS_TABLE)
      .select("*")
      .order("block_number", { ascending: false })
      .order("log_index", { ascending: false })
      .limit(300),
  ]);

  for (const r of [ops, stats, events, counts]) {
    if (r.error) throw r.error;
  }
  // CRISP table may not exist until 005 rename — soft-fail
  const crispEvents = crisp.error ? [] : (crisp.data || []).map(mapCrispEvent);

  const eventSummary = { bonding: {}, registry: {}, interfold: {}, slashing: {}, refund: {} };
  const keyMap = {
    bonding: "bonding",
    registry: "registry",
    interfold: "interfold",
    slash: "slashing",
    refund: "refund",
  };
  for (const c of counts.data || []) {
    const bucket = keyMap[c.contract_key] || c.contract_key;
    if (!eventSummary[bucket]) eventSummary[bucket] = {};
    eventSummary[bucket][c.event_name] = Number(c.count);
  }

  return {
    source: "supabase",
    meta: {
      generatedAt: stats.data?.fetched_at || new Date().toISOString(),
      latestBlock: stats.data?.latest_block,
      network: "ethereum-mainnet",
    },
    live: mapLive(stats.data),
    operators: (ops.data || []).map(mapOperator),
    timeline: (events.data || []).map(mapEvent),
    crisp: {
      network: crispEvents[0]?.network || "mainnet",
      events: crispEvents,
    },
    eventSummary,
    scope: null,
  };
}

export async function loadFromJson() {
  const res = await fetch("/data/poc-dataset.json");
  if (!res.ok) throw new Error(`JSON dataset ${res.status}`);
  const data = await res.json();
  const timeline = (data.timeline || []).map((e) => ({
    ...e,
    blockTimestamp:
      e.blockTimestamp ||
      (e.timeStamp ? new Date(Number(e.timeStamp) * 1000).toISOString() : null),
  }));
  return {
    ...data,
    timeline,
    crisp: data.crisp || { network: "mainnet", events: [] },
    source: "json",
  };
}

export function subscribeRealtime(onChange) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("interfold-board")
    .on("postgres_changes", { event: "*", schema: "public", table: "if_events" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "if_operators" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "if_network_stats" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "if_event_counts" }, onChange)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: CRISP_EVENTS_TABLE },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

function argsMentionAddress(args, needle) {
  if (!args) return false;
  const n = needle.toLowerCase();
  try {
    return JSON.stringify(args).toLowerCase().includes(n);
  } catch {
    return false;
  }
}

/**
 * Search operators + mainnet events + CRISP events for an address (partial OK).
 */
export async function searchAddressActivity(rawQuery, boardData) {
  const q = String(rawQuery || "").trim().toLowerCase();
  if (!q.startsWith("0x") || q.length < 8) {
    throw new Error("Enter a 0x address");
  }

  const localOps = (boardData?.operators || []).filter(
    (o) =>
      String(o.address || "")
        .toLowerCase()
        .includes(q) ||
      String(o.bondOwner || "")
        .toLowerCase()
        .includes(q)
  );
  const localEvents = (boardData?.timeline || []).filter((e) => argsMentionAddress(e.args, q));
  const localCrisp = (boardData?.crisp?.events || []).filter((e) =>
    argsMentionAddress(e.args, q)
  );

  if (!supabaseConfigured || !supabase) {
    return { operators: localOps, events: localEvents, crispEvents: localCrisp };
  }

  const [opsRes, eventsRes, crispRes] = await Promise.all([
    supabase
      .from("if_operators")
      .select("*")
      .or(`address.ilike.%${q}%,bond_owner.ilike.%${q}%`)
      .limit(50),
    supabase
      .from("if_events")
      .select("*")
      .order("block_number", { ascending: false })
      .limit(800),
    supabase
      .from(CRISP_EVENTS_TABLE)
      .select("*")
      .order("block_number", { ascending: false })
      .limit(500),
  ]);

  const operators = opsRes.error
    ? localOps
    : (opsRes.data || []).map(mapOperator);

  const events = eventsRes.error
    ? localEvents
    : (eventsRes.data || [])
        .filter((e) => argsMentionAddress(e.args, q))
        .slice(0, 100)
        .map(mapEvent);

  const crispEvents = crispRes.error
    ? localCrisp
    : (crispRes.data || [])
        .filter((e) => argsMentionAddress(e.args, q))
        .slice(0, 100)
        .map(mapCrispEvent);

  // Prefer DB hits; fall back to local if empty
  return {
    operators: operators.length ? operators : localOps,
    events: events.length ? events : localEvents,
    crispEvents: crispEvents.length ? crispEvents : localCrisp,
  };
}
