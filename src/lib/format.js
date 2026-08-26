export function shortAddr(a) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
}

export function num(v, d = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? "—");
  return n.toLocaleString(undefined, { maximumFractionDigits: d });
}

export function etherscanAddress(a) {
  return `https://etherscan.io/address/${a}`;
}

export function etherscanTx(h) {
  return `https://etherscan.io/tx/${h}`;
}

export const CONTRACT_FILTERS = [
  "BondingRegistry",
  "CiphernodeRegistry",
  "Interfold",
  "SlashingManager",
  "E3RefundManager",
];

export const DEFAULT_SCOPE = {
  buildableNow: [
    {
      title: "Operator / bonding board",
      officialGap: "Official UI is a per-wallet setup guide, not a network table",
      dataReady: true,
      evidence: "Live operators from BondingRegistry + CiphernodeRegistry",
    },
    {
      title: "Bonded FOLD + ticket TVL",
      officialGap: "No TVL / share-of-tickets metrics",
      dataReady: true,
      evidence: "if_network_stats + if_operators",
    },
    {
      title: "Event timeline + realtime",
      officialGap: "No historical / live event feed",
      dataReady: true,
      evidence: "if_events + Supabase realtime",
    },
  ],
  later: [
    { title: "E3 lifecycle explorer", dataReady: false },
    { title: "Sortition fairness auditor", dataReady: false },
    { title: "Slashing & refund explorer", dataReady: false },
  ],
};
