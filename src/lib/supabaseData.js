import { createClient } from "@supabase/supabase-js";
import { enrichOperatorsWithExits } from "./operatorExits";

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
  escrow: "VotingEscrow",
  escrowIvotes: "EscrowIVotesAdapter",
  exitQueue: "ExitQueue",
  veFoldNft: "veFOLD",
  foldLocks: "FOLDLocks",
};

const CRISP_LABEL = {
  crisp_program: "CRISPProgram",
  crisp_self_registry: "SelfRegistry",
  crisp_interfold: "CRISP-Interfold",
};

const CRISP_EVENTS_TABLE = "if_crisp_mainnet_events";

/** Supabase/PostgREST caps a single response (~1000). Page with .range until exhausted. */
export const SUPABASE_PAGE = 1000;

/**
 * @param {() => import('@supabase/supabase-js').PostgrestFilterBuilder} buildQuery
 *   Fresh query builder each page (order/filters already applied).
 */
async function fetchAllPages(buildQuery) {
  const out = [];
  let from = 0;
  for (;;) {
    const { data, error } = await buildQuery().range(from, from + SUPABASE_PAGE - 1);
    if (error) throw error;
    const rows = data || [];
    out.push(...rows);
    if (rows.length < SUPABASE_PAGE) break;
    from += SUPABASE_PAGE;
  }
  return out;
}

/** One page of if_events (newest first). Used when Next needs rows past the first 1000. */
export async function fetchEventsPage(offset = 0, limit = SUPABASE_PAGE) {
  if (!supabase) return [];
  const from = Math.max(0, Number(offset) || 0);
  const size = Math.min(SUPABASE_PAGE, Math.max(1, Number(limit) || SUPABASE_PAGE));
  const { data, error } = await supabase
    .from("if_events")
    .select("*")
    .order("block_number", { ascending: false })
    .order("log_index", { ascending: false })
    .range(from, from + size - 1);
  if (error) throw error;
  return (data || []).map(mapEvent);
}

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
    addedTimestamp: o.added_timestamp || o.addedTimestamp || null,
  };
}

/**
 * Attach addedTimestamp from CiphernodeAdded / BondOwnerSet rows (already in if_events).
 * Prefer tx match, then address+block, then address alone.
 */
function enrichOperatorsWithAddedTime(operators, addedEvents) {
  if (!operators?.length || !addedEvents?.length) return operators || [];

  const byTx = new Map();
  const byAddrBlock = new Map();
  const byAddr = new Map();

  for (const e of addedEvents) {
    const ts = e.block_timestamp || e.blockTimestamp || null;
    if (!ts) continue;
    const tx = String(e.tx_hash || e.txHash || "").toLowerCase();
    const block = Number(e.block_number ?? e.blockNumber);
    const addr = String(
      e.args?.node || e.args?.ciphernode || e.args?.operator || ""
    ).toLowerCase();

    if (tx) {
      const prev = byTx.get(tx);
      if (!prev || block >= Number(prev.block || 0)) byTx.set(tx, { ts, block });
    }
    if (addr && Number.isFinite(block)) {
      const key = `${addr}:${block}`;
      byAddrBlock.set(key, ts);
      const prev = byAddr.get(addr);
      if (!prev || block >= Number(prev.block || 0)) byAddr.set(addr, { ts, block });
    }
  }

  return operators.map((o) => {
    if (o.addedTimestamp) return o;
    const tx = String(o.addedTx || "").toLowerCase();
    const addr = String(o.address || "").toLowerCase();
    const block = Number(o.addedBlock);
    const fromTx = tx ? byTx.get(tx) : null;
    const fromPair =
      addr && Number.isFinite(block) ? byAddrBlock.get(`${addr}:${block}`) : null;
    const fromAddr = addr ? byAddr.get(addr) : null;
    const addedTimestamp = fromTx?.ts || fromPair || fromAddr?.ts || null;
    return addedTimestamp ? { ...o, addedTimestamp } : o;
  });
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

function mapLock(l) {
  return {
    tokenId: Number(l.token_id),
    owner: l.owner,
    amount: Number(l.amount) || 0,
    startTs: l.start_ts != null ? Number(l.start_ts) : null,
    isActive: Boolean(l.is_active),
    isExiting: Boolean(l.is_exiting),
    isDelegated: Boolean(l.is_delegated),
    delegatee: l.delegatee || null,
    exitHolder: l.exit_holder || null,
    exitDate: l.exit_date || null,
    exitTx: l.exit_tx || null,
    nftOwner: l.nft_owner || null,
    createdBlock: l.created_block != null ? Number(l.created_block) : null,
    createdTx: l.created_tx || null,
    createdAt: l.created_at || null,
    withdrawnBlock: l.withdrawn_block != null ? Number(l.withdrawn_block) : null,
    withdrawnTx: l.withdrawn_tx || null,
    updatedAt: l.updated_at || null,
  };
}

function mapDelegation(d) {
  return {
    account: d.account,
    delegatee: d.delegatee || null,
    votes: Number(d.votes) || 0,
    lockedVotes: Number(d.locked_votes) || 0,
    bondedVotes: Number(d.bonded_votes) || 0,
    vestingVotes: Number(d.vesting_votes) || 0,
    updatedBlock: d.updated_block != null ? Number(d.updated_block) : null,
    updatedTx: d.updated_tx || null,
    updatedAt: d.updated_at || null,
  };
}

function mapGovernanceStats(s) {
  if (!s) return null;
  return {
    totalLocked: s.total_locked,
    currentExiting: s.current_exiting,
    activeLockCount: s.active_lock_count != null ? Number(s.active_lock_count) : 0,
    exitingLockCount: s.exiting_lock_count != null ? Number(s.exiting_lock_count) : 0,
    delegatedAccountCount:
      s.delegated_account_count != null ? Number(s.delegated_account_count) : 0,
    totalDelegateVotes: s.total_delegate_votes,
    latestBlock: s.latest_block,
    fetchedAt: s.fetched_at,
  };
}

export async function loadFromSupabase() {
  const [
    ops,
    stats,
    events,
    counts,
    eventsCountRes,
    crispRows,
    exitEvents,
    addedEvents,
    locks,
    delegations,
    govStats,
  ] = await Promise.all([
    supabase.from("if_operators").select("*").order("available_tickets", { ascending: false }),
    supabase.from("if_network_stats").select("*").eq("id", 1).maybeSingle(),
    // First Supabase page only — EventTimeline Next fetches further ranges past 1000.
    supabase
      .from("if_events")
      .select("*")
      .order("block_number", { ascending: false })
      .order("log_index", { ascending: false })
      .range(0, SUPABASE_PAGE - 1),
    supabase.from("if_event_counts").select("*"),
    // Exact table size for sidebar + pager (not capped by max-rows).
    supabase.from("if_events").select("*", { count: "exact", head: true }),
    fetchAllPages(() =>
      supabase
        .from(CRISP_EVENTS_TABLE)
        .select("*")
        .order("block_number", { ascending: false })
        .order("log_index", { ascending: false })
    )
      .then((data) => ({ data, error: null }))
      .catch((error) => ({ data: null, error })),
    supabase
      .from("if_events")
      .select("event_name,args,block_number")
      .eq("contract_key", "bonding")
      .in("event_name", [
        "CiphernodeDeregistrationRequested",
        "AssetsQueuedForExit",
        "AssetsClaimed",
      ])
      .order("block_number", { ascending: false })
      .limit(500),
    supabase
      .from("if_events")
      .select("args,block_number,tx_hash,block_timestamp,event_name")
      .eq("contract_key", "registry")
      .eq("event_name", "CiphernodeAdded")
      .order("block_number", { ascending: false })
      .limit(500),
    supabase.from("if_locks").select("*").order("amount", { ascending: false }),
    supabase.from("if_delegations").select("*").order("votes", { ascending: false }),
    supabase.from("if_governance_stats").select("*").eq("id", 1).maybeSingle(),
  ]);

  for (const r of [ops, stats, events, counts]) {
    if (r.error) throw r.error;
  }
  // CRISP table may not exist until 005 rename — soft-fail
  const crispEvents = crispRows.error ? [] : (crispRows.data || []).map(mapCrispEvent);
  // Governance tables may not exist until 006 — soft-fail
  const governance = {
    stats: govStats.error ? null : mapGovernanceStats(govStats.data),
    locks: locks.error ? [] : (locks.data || []).map(mapLock),
    delegations: delegations.error ? [] : (delegations.data || []).map(mapDelegation),
  };

  const eventSummary = { bonding: {}, registry: {}, interfold: {}, slashing: {}, refund: {} };
  const keyMap = {
    bonding: "bonding",
    registry: "registry",
    interfold: "interfold",
    slash: "slashing",
    refund: "refund",
  };
  let eventsTotal = 0;
  for (const c of counts.data || []) {
    const n = Number(c.count) || 0;
    eventsTotal += n;
    const bucket = keyMap[c.contract_key] || c.contract_key;
    if (!eventSummary[bucket]) eventSummary[bucket] = {};
    eventSummary[bucket][c.event_name] = n;
  }

  if (!eventsCountRes.error && eventsCountRes.count != null) {
    eventsTotal = Math.max(eventsTotal, Number(eventsCountRes.count) || 0);
  }

  const timeline = (events.data || []).map(mapEvent);
  const exitTimeline = exitEvents.error
    ? timeline
    : (exitEvents.data || []).map((e) => ({
        event: e.event_name,
        args: e.args || {},
        blockNumber: e.block_number,
      }));

  let operators = enrichOperatorsWithExits((ops.data || []).map(mapOperator), exitTimeline);
  if (!addedEvents.error && addedEvents.data?.length) {
    operators = enrichOperatorsWithAddedTime(operators, addedEvents.data);
  } else {
    // Soft fallback: recent timeline may still carry CiphernodeAdded timestamps
    operators = enrichOperatorsWithAddedTime(
      operators,
      timeline
        .filter((e) => e.event === "CiphernodeAdded")
        .map((e) => ({
          args: e.args,
          block_number: e.blockNumber,
          tx_hash: e.txHash,
          block_timestamp: e.blockTimestamp,
        }))
    );
  }

  return {
    source: "supabase",
    meta: {
      generatedAt: stats.data?.fetched_at || new Date().toISOString(),
      latestBlock: stats.data?.latest_block,
      network: "ethereum-mainnet",
    },
    live: mapLive(stats.data),
    operators,
    timeline,
    eventsTotal: Math.max(eventsTotal, timeline.length),
    governance,
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
  let operators = enrichOperatorsWithExits(data.operators || [], timeline);
  operators = enrichOperatorsWithAddedTime(
    operators,
    timeline
      .filter((e) => e.event === "CiphernodeAdded" || e.event === "BondOwnerSet")
      .map((e) => ({
        args: e.args,
        block_number: e.blockNumber,
        tx_hash: e.txHash,
        block_timestamp: e.blockTimestamp,
      }))
  );
  return {
    ...data,
    operators,
    timeline,
    governance: data.governance || { stats: null, locks: [], delegations: [] },
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
    .on("postgres_changes", { event: "*", schema: "public", table: "if_locks" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "if_delegations" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "if_governance_stats" }, onChange)
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
