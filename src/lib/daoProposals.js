/**
 * Community-tracked Interfold DAO proposals.
 * Update an entry here when a draft is revised or finalized on-chain.
 */

export const DAO_SOURCE_FILEVERSE =
  "https://docs.fileverse.io/document/324KnxwAfRGJQ9hzsGDeuV#k=yySI3Bg6m0KBUAHKJ07m_obE1bVWuYBwyKpX-VSXRIA";

export const DAO_GOV_DOCS = "https://docs.theinterfold.com/governance";
export const DAO_GOV_APP = "https://gov.theinterfold.com";

export const DAO_RULES = [
  { id: "propose", label: "Create proposal", value: "12K FOLD" },
  { id: "vote", label: "Vote duration", value: "5 days" },
  { id: "quorum", label: "Quorum", value: "2%" },
  { id: "threshold", label: "Approval", value: ">50%" },
  { id: "path", label: "Lifecycle", value: "Vote → Foundation → Execute" },
];

/** Ticket-weighted split of a 2,000,000 FOLD epoch pool. */
export const EPOCH_POOL = 2_000_000;
export const PROGRAM_POOL = 12_000_000;
export const TOTAL_SUPPLY = 1_200_000_000;

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
    wordCount: 1266,
    summary:
      "A time-boxed FOLD reward for ciphernode operators. 12,000,000 FOLD (1.0% of the 1.2B supply) from the Foundation treasury, paid in 6 biweekly batches to operators active at each epoch’s end-snapshot, as 30-day VE-locked FOLD via createLockFor(). Rewards count as voting power. Manual tracking — no new contracts or emissions.",
    motivation:
      "The network — including its own CRISP governance rounds — needs ciphernodes online. E3 requests are currently paused or minimal, so the existing fee-share rewards (BondingRegistry.distributeRewards) cannot pay for availability. This program bridges that gap on a fixed clock and budget.",
    conclusion:
      "The network needs ciphernodes online now, and usage revenue cannot pay for that yet. This proposal spends 1% of supply over 12 weeks, run on existing tooling and on-chain reads, with audit via IPFS-pinned settlement sheets.",
    metrics: [
      { id: "pool", label: "Reward pool", value: "12,000,000", unit: "FOLD", hint: "1.0% of 1.2B supply" },
      { id: "epochs", label: "Epochs", value: "6", unit: "× 14 days", hint: "12 weeks from T0" },
      { id: "batch", label: "Per epoch", value: "2,000,000", unit: "FOLD", hint: "Ticket-weighted split" },
      { id: "lock", label: "VE lock", value: "30", unit: "days", hint: "createLockFor() on receipt" },
    ],
    design: [
      {
        title: "Program window",
        body: "12 weeks from T0 — the protocol’s mainnet launch: the deployment block of the Interfold mainnet contract, verifiable on-chain. The earlier FOLD mint / TGE block is not the reference.",
      },
      {
        title: "Eligibility (“active”)",
        body: "An operator accrues an epoch if, at the epoch’s end block, it is registered in the CiphernodeRegistry; bonded at or above the active-maintenance floor (isCiphernodeBonded); holds the minimum sortition tickets; and is not banned by the SlashingManager.",
      },
      {
        title: "Accrual (ticket-weighted)",
        body: "An epoch’s 2,000,000 FOLD is divided by the total tickets held across all active operators. Each active operator receives 2,000,000 ÷ Σ tickets × own tickets, floored to whole FOLD.",
      },
      {
        title: "Transparency",
        body: "Each epoch the Foundation publishes a settlement sheet on IPFS and posts its CID: snapshot block, active operators with ticket balances and predicate values. The sheet is recomputable from the on-chain snapshot.",
      },
      {
        title: "Settlement",
        body: "6 batches of 2,000,000 FOLD, each after that sheet’s 48h dispute window. Payouts are VE-locked FOLD: the treasury calls createLockFor() on the Vote Escrow contract for each recipient. Unlock dates stagger as receipts land.",
      },
      {
        title: "Why biweekly batches",
        body: "The 30-day VE lock is the primary sell-pressure control — no reward can be sold on its distribution date. Six public sheets keep each sell event individually visible instead of one lump sum.",
      },
    ],
    budget: {
      poolFold: PROGRAM_POOL,
      supplyShare: 0.01,
      source: "Foundation treasury — no new emissions, no mint.",
      buyNote:
        "It will be necessary for the Foundation to purchase ~$250k–$300k worth of FOLD from the market to fund the program.",
      ticketStake: "1,000 sUSDS per ticket",
      bondNote: "Each ticket sits on top of the 32,000 FOLD bond (both slashable).",
    },
    parameters: [
      { label: "Window", value: "12 weeks from T0 (Interfold mainnet deployment block) in 6 × 14-day epochs" },
      { label: "Pool", value: "12,000,000 FOLD (1.0% of total supply), from the Foundation treasury" },
      { label: "Per epoch", value: "2,000,000 FOLD, split proportionally to tickets among operators active at the epoch end-block" },
      { label: "“Active”", value: "Registered, bonded ≥ active-maintenance floor, minimum tickets, not banned" },
      { label: "Settlement", value: "Manual: IPFS-pinned sheet → 48h dispute window → treasury createLockFor() (30-day VE lock)" },
      { label: "Timeline", value: "Overdue epochs settle in sequence at execution; remaining epochs on cadence" },
      { label: "End", value: "Program ends after Epoch 6; any change after execution requires a new proposal" },
    ],
    risks: [
      {
        risk: "12M FOLD sold in one window",
        mitigation:
          "30-day VE lock (rewards cannot be sold on the distribution date) plus 6 × 2M batches, each with a public settlement sheet ahead of its payout.",
      },
      {
        risk: "Reward economy farmed by ticket sybils",
        mitigation:
          "Tickets are the expensive input: each requires 1,000 sUSDS at risk, on top of the 32,000 FOLD bond (both slashable). Proportional accrual means cheap low-stake sybils earn tiny shares by construction.",
      },
      {
        risk: "Register / unregister around the snapshot",
        mitigation:
          "Epoch-end snapshot gives ~2 weeks of notice; a single-block game is accepted rather than fought with new machinery.",
      },
      {
        risk: "Manual bookkeeping error",
        mitigation:
          "IPFS-pinned sheet (CID posted) is recomputable from the on-chain snapshot; 48h dispute window; payout txs recorded against the CID.",
      },
      {
        risk: "Rewards funding new voting power",
        mitigation:
          "Expected and intended: rewards are VE-locked FOLD and count as voting power on distribution (delegated to the recipient). 12M of new committed FOLD is a deliberate increase in governance weight.",
      },
      {
        risk: "Slow vote collapses epochs into one week of payments",
        mitigation:
          "Acceptable for a first iteration and no pool or rule changes; if it happens, publish the compressed batch schedule with dates so the sell events stay individually visible.",
      },
      {
        risk: "Slashing during the program",
        mitigation:
          "Unchanged — a slashed or banned operator is excluded from the next snapshot onward; prior accruals stand.",
      },
    ],
    future: [
      "Mechanized on-chain delivery (claimable pool or settled credits).",
      "Continuous or duty-weighted accrual (uptime, DKG, decryption shares), ahead of where fee-share economics are heading.",
      "Concentration and soul-splitting controls: caps on share per operator (or per bond-owner cohort) and de-sybilizing adjustments, if concentration materializes.",
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
