/**
 * FOLD tokenomics — pure schedule model from
 * https://docs.theinterfold.com/tokenomics
 *
 * No indexer. Recomputed on every page load from Date.now().
 *
 * Total supply: 1.2B
 * Circulating at TGE: ≤ 25.21%  (= Investors 18.85% + Unsold CCA ≤ 6.36%)
 * Linear vestings start: Sep 1, 2026
 * TGE / transferability: Aug 19, 2026 (official launch sequence)
 */

export const FOLD_TOTAL_SUPPLY = 1_200_000_000;

/** General transferability / TGE */
export const FOLD_TGE_DATE = new Date("2026-08-19T14:00:00.000Z");

/** Docs: linear unlocks begin Sep 1, 2026 */
export const FOLD_VESTING_START = new Date("2026-09-01T00:00:00.000Z");

/**
 * @typedef {'tge' | 'linear'} UnlockKind
 * @typedef {{
 *   id: string,
 *   name: string,
 *   group: 'community' | 'other',
 *   percent: number,
 *   color: string,
 *   unlock: UnlockKind,
 *   months?: number,
 *   note: string,
 * }} FoldAllocation
 */

/** Official distribution (docs table). Colors tuned for InterFold theme. */
export const FOLD_ALLOCATIONS = /** @type {FoldAllocation[]} */ ([
  {
    id: "foundation",
    name: "Foundation Treasury",
    group: "community",
    percent: 41.28,
    color: "#b6ff3b",
    unlock: "linear",
    months: 48,
    note: "48-month linear unlock from Sep 1, 2026",
  },
  {
    id: "unsold_cca",
    name: "Unsold CCA Tokens",
    group: "community",
    percent: 6.36,
    color: "#3dffb0",
    unlock: "tge",
    note: "No restrictions from TGE (returned to foundation if unsold)",
  },
  {
    id: "airdrop",
    name: "Airdrop",
    group: "community",
    percent: 4.0,
    color: "#7ec8ff",
    unlock: "linear",
    months: 24,
    note: "24-month linear unlock from Sep 1, 2026",
  },
  {
    id: "gnosis",
    name: "Gnosis Guild",
    group: "other",
    percent: 20.0,
    color: "#ffb454",
    unlock: "linear",
    months: 48,
    note: "48-month linear unlock from Sep 1, 2026",
  },
  {
    id: "investors",
    name: "Investors",
    group: "other",
    percent: 18.85,
    color: "#c4a7ff",
    unlock: "tge",
    note: "No restrictions from TGE",
  },
  {
    id: "team",
    name: "Team and Advisors",
    group: "other",
    percent: 9.51,
    color: "#ff8fab",
    unlock: "linear",
    months: 24,
    note: "24-month linear unlock from Sep 1, 2026",
  },
]);

function clamp01(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

function addMonthsUtc(date, months) {
  const d = new Date(date.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function daysBetween(a, b) {
  return (b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000);
}

/** Fraction of an allocation unlocked at `asOf` (UTC). */
export function unlockedFraction(alloc, asOf = new Date()) {
  if (alloc.unlock === "tge") {
    return asOf.getTime() >= FOLD_TGE_DATE.getTime() ? 1 : 0;
  }
  const months = alloc.months || 0;
  if (asOf.getTime() < FOLD_VESTING_START.getTime()) return 0;
  const end = addMonthsUtc(FOLD_VESTING_START, months);
  if (asOf.getTime() >= end.getTime()) return 1;
  const totalDays = daysBetween(FOLD_VESTING_START, end);
  const elapsed = daysBetween(FOLD_VESTING_START, asOf);
  return clamp01(elapsed / totalDays);
}

export function allocationAmount(alloc) {
  return (FOLD_TOTAL_SUPPLY * alloc.percent) / 100;
}

export function unlockedAmount(alloc, asOf = new Date()) {
  return allocationAmount(alloc) * unlockedFraction(alloc, asOf);
}

/**
 * Snapshot of circulating / locked / per-bucket at `asOf`.
 * Recalculated on refresh from the schedule (no chain indexer).
 */
export function computeFoldSnapshot(asOf = new Date()) {
  const rows = FOLD_ALLOCATIONS.map((a) => {
    const allocation = allocationAmount(a);
    const unlocked = unlockedAmount(a, asOf);
    return {
      ...a,
      allocation,
      unlocked,
      locked: Math.max(0, allocation - unlocked),
      unlockedPctOfBucket: unlockedFraction(a, asOf) * 100,
    };
  });

  const circulating = rows.reduce((s, r) => s + r.unlocked, 0);
  const locked = FOLD_TOTAL_SUPPLY - circulating;

  return {
    asOf: asOf.toISOString(),
    totalSupply: FOLD_TOTAL_SUPPLY,
    circulating,
    locked,
    circulatingPct: (circulating / FOLD_TOTAL_SUPPLY) * 100,
    tgeCirculatingCapPct: 25.21,
    rows,
  };
}

/** Daily unlock rate right now (only linear buckets still vesting). */
export function unlockPerDay(asOf = new Date()) {
  let perDay = 0;
  for (const a of FOLD_ALLOCATIONS) {
    if (a.unlock !== "linear") continue;
    const months = a.months || 0;
    const end = addMonthsUtc(FOLD_VESTING_START, months);
    if (asOf < FOLD_VESTING_START || asOf >= end) continue;
    const totalDays = daysBetween(FOLD_VESTING_START, end);
    perDay += allocationAmount(a) / totalDays;
  }
  return perDay;
}

export function unlockInNextDays(days, asOf = new Date()) {
  const end = new Date(asOf.getTime() + days * 24 * 60 * 60 * 1000);
  return computeFoldSnapshot(end).circulating - computeFoldSnapshot(asOf).circulating;
}

function utcYmd(d) {
  return d.toISOString().slice(0, 10);
}

/** Clear labels — never "Sep 26" (year) which looks like day 26. */
export function formatMonthLabel(d) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDayLabel(d) {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function startOfUtcDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUtc(d, days) {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

/**
 * Cumulative circulating: TGE, then each month on the 1st from vesting start → +48mo.
 * Labels like "Sep 2026" (month + year), not "Sep 26".
 */
export function buildUnlockScheduleSeries(asOf = new Date()) {
  const end = addMonthsUtc(FOLD_VESTING_START, 48);
  const points = [];

  // TGE point
  {
    const snap = computeFoldSnapshot(FOLD_TGE_DATE);
    points.push({
      t: FOLD_TGE_DATE.getTime(),
      date: utcYmd(FOLD_TGE_DATE),
      label: "TGE",
      circulating: snap.circulating,
      locked: snap.locked,
      isNow: false,
    });
  }

  // Month starts: Sep 1, Oct 1, … through vesting end
  let cursor = new Date(FOLD_VESTING_START.getTime());
  while (cursor.getTime() <= end.getTime()) {
    const snap = computeFoldSnapshot(cursor);
    points.push({
      t: cursor.getTime(),
      date: utcYmd(cursor),
      label: formatMonthLabel(cursor),
      circulating: snap.circulating,
      locked: snap.locked,
      isNow: false,
    });
    cursor = addMonthsUtc(cursor, 1);
  }

  const nowSnap = computeFoldSnapshot(asOf);
  points.push({
    t: asOf.getTime(),
    date: utcYmd(asOf),
    label: "Now",
    circulating: nowSnap.circulating,
    locked: nowSnap.locked,
    isNow: true,
  });

  const byDay = new Map();
  for (const p of points.sort((a, b) => a.t - b.t)) {
    const prev = byDay.get(p.date);
    if (!prev || p.isNow) byDay.set(p.date, p);
  }
  return [...byDay.values()].sort((a, b) => a.t - b.t);
}

/**
 * Monthly unlock flow between consecutive month-start samples.
 */
export function buildMonthlyUnlockBars(asOf = new Date()) {
  const series = buildUnlockScheduleSeries(asOf).filter((p) => !p.isNow || p.label === "Now");
  // Prefer month / TGE points for bars
  const anchors = series.filter((p) => p.label === "TGE" || p.label === "Now" || /^\w{3} \d{4}$/.test(p.label));
  const bars = [];
  for (let i = 1; i < anchors.length; i++) {
    const prev = anchors[i - 1];
    const cur = anchors[i];
    if (cur.label === "Now" && prev.label !== "TGE" && cur.t < FOLD_VESTING_START.getTime()) {
      continue;
    }
    bars.push({
      label: cur.label === "Now" ? formatMonthLabel(new Date(cur.t)) : cur.label,
      date: cur.date,
      unlock: Math.max(0, cur.circulating - prev.circulating),
      circulating: cur.circulating,
    });
  }
  return bars;
}

/**
 * Daily unlock amounts from vesting start through +48 months.
 * Each point = FOLD newly unlocked that calendar day (sum of all linear buckets).
 * Accurate calendar dates on the X axis (e.g. Sep 1, 2026).
 */
export function buildDailyUnlockSeries(asOf = new Date()) {
  const start = startOfUtcDay(FOLD_VESTING_START);
  const end = addMonthsUtc(FOLD_VESTING_START, 48);
  const points = [];
  let prevCirc = computeFoldSnapshot(addDaysUtc(start, -1)).circulating;
  let d = new Date(start.getTime());

  while (d.getTime() <= end.getTime()) {
    const circ = computeFoldSnapshot(d).circulating;
    const unlock = Math.max(0, circ - prevCirc);
    points.push({
      t: d.getTime(),
      date: utcYmd(d),
      label: formatDayLabel(d),
      shortLabel: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      unlock,
      circulating: circ,
      isNow: utcYmd(d) === utcYmd(asOf),
    });
    prevCirc = circ;
    d = addDaysUtc(d, 1);
  }
  return points;
}

export function formatFold(n, digits = 2) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(digits)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function exactFold(n) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
