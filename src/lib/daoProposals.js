/**
 * Community-tracked Interfold DAO proposals.
 * Update an entry here when a draft is revised or finalized on-chain.
 */

export const DAO_SOURCE_FILEVERSE =
  "https://docs.fileverse.io/document/324KnxwAfRGJQ9hzsGDeuV#k=yySI3Bg6m0KBUAHKJ07m_obE1bVWuYBwyKpX-VSXRIA";

export const DAO_GOV_DOCS = "https://docs.theinterfold.com/governance";
export const DAO_GOV_APP = "https://governance.theinterfold.com/";

export const DAO_RULES = [
  { id: "propose", label: "Create proposal", value: "12K FOLD" },
  { id: "vote", label: "Vote duration", value: "5 days" },
  { id: "quorum", label: "Quorum", value: "2%" },
  { id: "threshold", label: "Approval", value: ">50%" },
  { id: "path", label: "Lifecycle", value: "Vote → Foundation → Execute" },
];

/** Average epoch pool (illustrative); actual pools follow Fibonacci schedule. */
export const EPOCH_POOL = 2_000_000;
export const PROGRAM_POOL = 12_000_000;
export const TOTAL_SUPPLY = 1_200_000_000;
/** 14-day epoch at ~30s blocks. */
export const EPOCH_BLOCKS = 40_320;
/** Program accrual cap — lottery/Draw weight is unchanged above this. */
export const TICKET_CAP = 5;

/** Fibonacci weights 1:1:2:3:5:8 → 20 units × 600,000 FOLD. */
export const EPOCH_SCHEDULE = [
  { epoch: 1, weight: 1, pool: 600_000 },
  { epoch: 2, weight: 1, pool: 600_000 },
  { epoch: 3, weight: 2, pool: 1_200_000 },
  { epoch: 4, weight: 3, pool: 1_800_000 },
  { epoch: 5, weight: 5, pool: 3_000_000 },
  { epoch: 6, weight: 8, pool: 4_800_000 },
];

/**
 * Indicative payout per credited full-epoch ticket (credited = min(balance, 5) per node),
 * illustrated at the 2M FOLD average epoch pool.
 */
export const TICKET_SCENARIOS = [
  { tickets: 10, perTicket: 200_000 },
  { tickets: 100, perTicket: 20_000 },
  { tickets: 1_000, perTicket: 2_000 },
  { tickets: 10_000, perTicket: 200 },
];

export const DAO_PROPOSALS = [
  {
    id: "ipp-001",
    code: "IPP-001",
    title: "Initial Ciphernode Rewards Program",
    status: "draft",
    statusLabel: "Draft · community review",
    type: "IPP",
    author: "@auryn_macmillan",
    authorUrl: "https://x.com/auryn_macmillan",
    dateLabel: "September 2026",
    sourceLabel: "Fileverse draft",
    sourceUrl: DAO_SOURCE_FILEVERSE,
    revisedNote:
      "Updated with a 5-ticket accrual cap per node (lottery weight above 5 is unchanged) on the Fibonacci epoch schedule.",
    summary:
      "A time-boxed FOLD reward for ciphernode operators. 12,000,000 FOLD (1.0% of the 1.2B supply) from the Foundation treasury, paid in six biweekly batches on a backloaded Fibonacci schedule (pools 600,000 → 4,800,000 FOLD across the six epochs), in proportion to each operator’s ticket-block accrual (tickets × blocks held across the epoch; max 5 accrual tickets per node). Paid as VE-locked FOLD via createLockFor(), so rewards immediately count as voting power and carry a 30-day unlock. Tracking is manual — no new contracts, no new emissions.",
    motivation:
      "The network — including its own CRISP governance rounds — needs ciphernodes online. E3 requests are currently paused or minimal, so the existing fee-share rewards (BondingRegistry.distributeRewards) pay almost nothing. This program closes that availability gap bounded in time and budget.",
    conclusion:
      "The network needs ciphernodes online now, and usage revenue can’t pay for that yet. This proposal spends 1% of supply over 12 weeks, run on existing tooling and on-chain reads, with audit via IPFS-pinned settlement sheets. Parameters are fixed at execution; changes go through the normal governance path.",
    metrics: [
      { id: "pool", label: "Reward pool", value: "12,000,000", unit: "FOLD", hint: "1.0% of 1.2B supply" },
      { id: "epochs", label: "Epochs", value: "6", unit: "× 14 days", hint: "Fibonacci 1:1:2:3:5:8" },
      { id: "batch", label: "Epoch pools", value: "600k→4.8M", unit: "FOLD", hint: "Backloaded schedule" },
      { id: "cap", label: "Accrual cap", value: "5", unit: "tickets / node", hint: "Lottery weight uncapped" },
      { id: "lock", label: "VE lock", value: "30", unit: "days", hint: "createLockFor() on receipt" },
    ],
    design: [
      {
        title: "Program window",
        body: "12 weeks from T0 — the protocol’s mainnet launch (Interfold mainnet deployment block, verifiable on-chain; not the FOLD mint/TGE block) — in 6 epochs of 14 days. Retroactive by design: operators who stood up ciphernodes at launch with no subsidy promised are rewarded. Epochs already elapsed at execution settle in sequence as distinct published events; remaining epochs then run on the biweekly cadence.",
      },
      {
        title: "Epoch schedule (Fibonacci backload)",
        body: "The 12,000,000 FOLD pool is split by Fibonacci weights 1:1:2:3:5:8 (20 units; 1 unit = 600,000 FOLD) → 600k / 600k / 1.2M / 1.8M / 3M / 4.8M. Early epochs reward operators who stood up ciphernodes before any subsidy was promised; later epochs backload the pool to pull in new capacity as the program becomes known.",
      },
      {
        title: "Eligibility (“active”)",
        body: "An operator is active at a given block if it is registered in the CiphernodeRegistry; bonded at or above the active-maintenance floor (isCiphernodeBonded); holds the minimum sortition tickets; and is not banned by the SlashingManager. Predicate failures at a given block cost 0 for that block’s accrual.",
      },
      {
        title: "Accrual (ticket-blocks, capped at 5 / node)",
        body: "That epoch’s pool is split in proportion to each operator’s ticket-block total: the sum, over every block of the epoch, of the credited ticket balance — the lesser of on-chain balance and 5 — with inactive blocks contributing 0. A credited ticket held the whole epoch earns ~40,320 ticket-blocks (30s blocks); one staked only at the final block earns 1. The cap bounds a single node’s share at most 5/5N of the pool, so capturing most of the program means registering many nodes (each with its own 32,000 FOLD bond and slashing exposure) rather than stacking one. Tickets above 5 keep full Draw/committee lottery weight; only program accrual is capped. A node holding 100 tickets accrues at 5; one holding 3 accrues at 3.",
      },
      {
        title: "Transparency",
        body: "Each epoch the Foundation publishes a settlement sheet on IPFS and posts its CID: epoch start/end blocks; each operator’s per-block ticket series (or at least ticket-block total and 24h boundary state); on-chain balance and credited (capped) balance; effective counts; the pool total; and each entitlement. Corrected sheets are allowed before settlement; network-state disputes settle by the on-chain record.",
      },
      {
        title: "Settlement",
        body: "Six batches — that epoch’s Fibonacci-weighted pool — each after that sheet’s 48h dispute window. Payouts are VE-locked FOLD: treasury createLockFor() for each recipient (30-day lock). Locked FOLD counts as voting power on distribution; no recipient can sell until unlock. No claim flow and no new contract.",
      },
      {
        title: "Why biweekly batches",
        body: "The 30-day VE lock is the primary sell-pressure control. Batching keeps six sheets and six payments small and legible, and bounds treasury ops. Weekly would double settlement cost with the same income per period. Schedule parameters can tweak; the accrual rule does not.",
      },
    ],
    budget: {
      poolFold: PROGRAM_POOL,
      supplyShare: 0.01,
      source: "Foundation treasury — no new emissions, no mint.",
      buyNote:
        "The Foundation will need to purchase ~$250k–$300k of FOLD on the open market for liquid funding. The treasury holds 39.06% of supply with linear unlock from Sep 1, 2026; remaining requirement comes from that supply as it unlocks.",
      ticketStake: "1,000 sUSDS per ticket",
      bondNote:
        "A node that fully stacks its 5 accrual tickets has 5,000 sUSDS at risk on top of the 32,000 FOLD bond. sUSDS beyond 5 tickets buys lottery weight only, not program income.",
    },
    accrualFormula: "credited = min(ticketBalance, 5); rewardᵢ = epochPool × creditedBlocksᵢ ÷ Σ creditedBlocks",
    accrualFormulaHint:
      "epochPool follows Fibonacci (600k→4.8M). creditedBlocksᵢ = Σ over epoch blocks of min(ticketsᵢ(b), 5) while active (else 0). Full-epoch credited ticket ≈ 40,320 ticket-blocks. Lottery/Draw weight is not capped.",
    parameters: [
      {
        label: "Window",
        value: "12 weeks from T0 (Interfold mainnet deployment block) in 6 × 14-day epochs",
      },
      {
        label: "Pool",
        value: "12,000,000 FOLD (1.0% of total supply), from the Foundation treasury",
      },
      {
        label: "Per epoch",
        value:
          "Fibonacci-weighted pool (1:1:2:3:5:8 → 600k / 600k / 1.2M / 1.8M / 3M / 4.8M FOLD), split in proportion to ticket-blocks accrued per credited node (tickets × blocks)",
      },
      {
        label: "Cap",
        value:
          "Max 5 accrual tickets per node per block (on-chain ticket balance above 5 does not accrue; lottery/Draw weight unaffected)",
      },
      {
        label: "“Active”",
        value: "Registered, bonded ≥ active-maintenance floor, minimum tickets, not banned (checked per block)",
      },
      {
        label: "Settlement",
        value:
          "Manual: IPFS-pinned sheet per epoch → 48h dispute window → treasury createLockFor() (30-day VE lock)",
      },
      {
        label: "Timeline",
        value: "Overdue epochs settle in sequence at execution; remaining epochs on cadence",
      },
      {
        label: "End",
        value: "Program ends after Epoch 6; any change after execution requires a new proposal",
      },
    ],
    risks: [
      {
        risk: "12M FOLD sold in one window",
        mitigation:
          "30-day VE lock (rewards can’t be sold on distribution date) plus six scheduled batches (600k → 4.8M FOLD), each with a public settlement sheet ahead of its payout.",
      },
      {
        risk: "Reward economy farmed by ticket sybils",
        mitigation:
          "Per-node 5-ticket cap: stacking sUSDS into one node accrues at most 5/5N of the pool, so no single node can capture a meaningful share. Separated nodes still cost their own 32,000 FOLD bond + 5,000 sUSDS per node and carry their own slashing exposure. Per-operator (bond-owner) caps are a later iteration if many-node separation becomes material.",
      },
      {
        risk: "Last-minute register / unregister",
        mitigation:
          "Credits tickets only from the block they exist — a last-block snipe earns 1/40,320 of a full-epoch share per ticket (~30s blocks); fully on-chain and retroactively verifiable.",
      },
      {
        risk: "Manual bookkeeping error",
        mitigation:
          "IPFS-pinned sheet (CID posted) recomputable from per-block on-chain state; 48h dispute window; payout txs recorded against the CID.",
      },
      {
        risk: "Rewards funding new voting power",
        mitigation:
          "Expected and intended: VE-locked FOLD counts as voting power on distribution (delegated to the recipient). 12M of new committed FOLD is a deliberate incentive.",
      },
      {
        risk: "Slow vote collapses epochs into one week of payments",
        mitigation:
          "Acceptable for a first iteration with no pool or rule changes; if it happens, publish the compressed batch schedule with dates so sell events stay individually visible.",
      },
      {
        risk: "Slashing during the program",
        mitigation:
          "Unchanged — a slashed or banned operator accrues 0 from the ban block onward; prior accruals stand.",
      },
    ],
    future: [
      "Mechanized on-chain delivery (claimable pool or settled credits).",
      "Continuous or duty-weighted accrual (uptime, DKG, decryption shares), ahead of where fee-share economics are heading.",
      "Concentration controls beyond the per-node cap: caps per bond-owner (de-sybilized) if many-node separation becomes material.",
      "Automatic sunset criteria (e.g., ends when sustained E3 throughput crosses a threshold).",
    ],
    stages: [
      { id: "draft", label: "Draft", hint: "Community review" },
      { id: "vote", label: "Community vote", hint: "IPP · CRISP ballot" },
      { id: "foundation", label: "Foundation", hint: "Board approval" },
      { id: "execute", label: "Execution", hint: "DAO Resolution" },
    ],
    currentStage: "draft",
  },
];

export function daoCounts(proposals = DAO_PROPOSALS) {
  const counts = { all: proposals.length, draft: 0, live: 0, passed: 0, rejected: 0, finalized: 0 };
  for (const p of proposals) {
    if (counts[p.status] != null) counts[p.status] += 1;
  }
  return counts;
}

export function getProposal(id) {
  return DAO_PROPOSALS.find((p) => p.id === id) || null;
}
