import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatUsd } from "../lib/foldPrice";
import { formatFold } from "../lib/foldTokenomics";
import { BarChart3, LineChart as LineChartIcon } from "lucide-react";

const FILTERS = [
  { id: "all", label: "All events", contract: null },
  { id: "bonding", label: "Bonding", contract: "BondingRegistry" },
  { id: "registry", label: "Registry", contract: "CiphernodeRegistry" },
  { id: "interfold", label: "Interfold", contract: "Interfold" },
  { id: "slash", label: "Slashing", contract: "SlashingManager" },
];

const CONTRACT_SERIES = [
  { key: "Bonding", contract: "BondingRegistry" },
  { key: "Registry", contract: "CiphernodeRegistry" },
  { key: "Interfold", contract: "Interfold" },
  { key: "Slashing", contract: "SlashingManager" },
];

/** Cap event-level series so the chart stays readable (Zama-style). */
const MAX_EVENT_SERIES = 5;

function dayKey(isoOrNull, blockNumber) {
  if (isoOrNull) {
    const d = new Date(isoOrNull);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return `blk-${Math.floor(Number(blockNumber) / 7200)}`;
}

function shortDay(isoDay) {
  if (!isoDay || isoDay.startsWith("blk-")) return isoDay;
  const d = new Date(`${isoDay}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDay;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function useIsDarkTheme() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute("data-theme") !== "light"
  );
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setDark(root.getAttribute("data-theme") !== "light");
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function palette(dark) {
  // Distinct, theme-aware — brighter on dark, deeper on light
  if (dark) {
    return [
      "#b6ff3b",
      "#5ec8ff",
      "#ff9f43",
      "#ff6b9d",
      "#c4a7ff",
      "#3dffb0",
      "#ffd166",
      "#7af0ff",
      "#ffa8a8",
      "#9ad1ff",
    ];
  }
  return [
    "#1f7a3a",
    "#1a6fa8",
    "#c45c12",
    "#b8326a",
    "#6b3fa0",
    "#0d8a6a",
    "#a67c00",
    "#0e7c8a",
    "#b33a3a",
    "#2f5f8a",
  ];
}

function colorFor(i, dark) {
  const p = palette(dark);
  return p[i % p.length];
}

/**
 * All → 4 contract series (clean vertical groups / lines).
 * Contract filter → top event names for that contract (+ Other).
 */
function buildChartModel(timeline, filterContract) {
  const rows = timeline || [];
  const filtered = filterContract
    ? rows.filter((e) => e.contract === filterContract)
    : rows;

  if (!filterContract) {
    const byDay = new Map();
    for (const e of filtered) {
      const day = dayKey(e.blockTimestamp, e.blockNumber);
      const row = byDay.get(day) || {
        day,
        label: shortDay(day),
        Bonding: 0,
        Registry: 0,
        Interfold: 0,
        Slashing: 0,
      };
      const meta = CONTRACT_SERIES.find((c) => c.contract === e.contract);
      if (meta) row[meta.key] = (row[meta.key] || 0) + 1;
      byDay.set(day, row);
    }
    return {
      data: [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day)),
      keys: CONTRACT_SERIES.map((c) => c.key),
      mode: "contract",
    };
  }

  const totals = new Map();
  for (const e of filtered) {
    totals.set(e.event, (totals.get(e.event) || 0) + 1);
  }
  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked.slice(0, MAX_EVENT_SERIES).map(([k]) => k);
  const topSet = new Set(top);
  const hasOther = ranked.length > MAX_EVENT_SERIES;
  const keys = hasOther ? [...top, "Other"] : top;

  const byDay = new Map();
  for (const e of filtered) {
    const day = dayKey(e.blockTimestamp, e.blockNumber);
    let row = byDay.get(day);
    if (!row) {
      row = { day, label: shortDay(day) };
      for (const k of keys) row[k] = 0;
      byDay.set(day, row);
    }
    const k = topSet.has(e.event) ? e.event : "Other";
    row[k] = (row[k] || 0) + 1;
  }

  const data = [...byDay.values()]
    .map((row) => ({ ...row, _sort: row.day }))
    .sort((a, b) => String(a._sort).localeCompare(String(b._sort)));
  // Chronological: oldest LEFT → newest (current) RIGHT
  return { data, keys, mode: "event" };
}

function asNum(v) {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function buildFeeRewardStats(timeline) {
  const stats = {
    rewardClaimedCount: 0,
    rewardClaimedAmount: 0,
    rewardCreditedCount: 0,
    rewardCreditedAmount: 0,
    rewardsDistributedCount: 0,
    rewardsDistributedAmount: 0,
    treasuryClaimedCount: 0,
    treasuryClaimedAmount: 0,
    treasuryCreditedCount: 0,
    treasuryCreditedAmount: 0,
    feeConfigUpdates: 0,
    feeTokenAllowed: 0,
  };

  for (const e of timeline || []) {
    if (e.contract !== "Interfold") continue;
    const a = e.args || {};
    switch (e.event) {
      case "RewardClaimed":
        stats.rewardClaimedCount += 1;
        stats.rewardClaimedAmount += asNum(a.amount);
        break;
      case "RewardCredited":
        stats.rewardCreditedCount += 1;
        stats.rewardCreditedAmount += asNum(a.amount);
        break;
      case "RewardsDistributed": {
        stats.rewardsDistributedCount += 1;
        const amounts = Array.isArray(a.amounts) ? a.amounts : [];
        stats.rewardsDistributedAmount += amounts.reduce((s, x) => s + asNum(x), 0);
        break;
      }
      case "TreasuryClaimed":
        stats.treasuryClaimedCount += 1;
        stats.treasuryClaimedAmount += asNum(a.amount);
        break;
      case "TreasuryCredited":
        stats.treasuryCreditedCount += 1;
        stats.treasuryCreditedAmount += asNum(a.amount);
        break;
      case "FeeAssetConfigUpdated":
        stats.feeConfigUpdates += 1;
        break;
      case "FeeTokenAllowed":
        stats.feeTokenAllowed += 1;
        break;
      default:
        break;
    }
  }
  return stats;
}

function fmtTokenAmount(raw) {
  const n = asNum(raw);
  if (!n) return { fold: 0, amountLabel: "0" };
  const fold = n / 1e18;
  return { fold, amountLabel: formatFold(fold) };
}

function weiToFold(raw) {
  return asNum(raw) / 1e18;
}

function sumAmounts(list) {
  if (!Array.isArray(list)) return 0;
  return list.reduce((s, x) => s + asNum(x), 0);
}

const REWARD_AMOUNT_SERIES = [
  {
    key: "Distributed",
    event: "RewardsDistributed",
    amount: (a) => weiToFold(sumAmounts(a.amounts)),
  },
  {
    key: "Credited",
    event: "RewardCredited",
    amount: (a) => weiToFold(a.amount),
  },
  {
    key: "Claimed",
    event: "RewardClaimed",
    amount: (a) => weiToFold(a.amount),
  },
];

const TREASURY_AMOUNT_SERIES = [
  {
    key: "Credited",
    event: "TreasuryCredited",
    amount: (a) => weiToFold(a.amount),
  },
  {
    key: "Claimed",
    event: "TreasuryClaimed",
    amount: (a) => weiToFold(a.amount),
  },
];

const FEE_COUNT_SERIES = [
  { key: "Config", event: "FeeAssetConfigUpdated", amount: () => 1 },
  { key: "Allowlist", event: "FeeTokenAllowed", amount: () => 1 },
];

/** Daily stacked series from Interfold events (amounts in FOLD, or counts). */
export function buildDailySeries(timeline, seriesDefs) {
  const byEvent = new Map(seriesDefs.map((s) => [s.event, s]));
  const byDay = new Map();
  let hits = 0;

  for (const e of timeline || []) {
    if (e.contract !== "Interfold") continue;
    const def = byEvent.get(e.event);
    if (!def) continue;
    hits += 1;
    const day = dayKey(e.blockTimestamp, e.blockNumber);
    let row = byDay.get(day);
    if (!row) {
      row = { day, label: shortDay(day) };
      for (const s of seriesDefs) row[s.key] = 0;
      byDay.set(day, row);
    }
    row[def.key] = (row[def.key] || 0) + def.amount(e.args || {});
  }

  const data = [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
  return {
    data,
    keys: seriesDefs.map((s) => s.key),
    hasData: hits > 0,
    eventNames: seriesDefs.map((s) => s.event),
  };
}

function EventTooltip({ active, payload, label, colorMap, valueKind = "count" }) {
  if (!active || !payload?.length) return null;
  const items = payload
    .filter((p) => Number(p.value) > 0)
    .sort((a, b) => Number(b.value) - Number(a.value));
  if (!items.length) return null;
  const total = items.reduce((s, p) => s + Number(p.value), 0);
  const fmt = (v) =>
    valueKind === "fold" ? `${formatFold(Number(v))} FOLD` : String(v);

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__day">{label}</p>
      <ul className="chart-tooltip__list">
        {items.map((p) => (
          <li key={p.dataKey}>
            <span
              className="chart-tooltip__swatch"
              style={{ background: colorMap[p.dataKey] || p.color }}
            />
            <span className="chart-tooltip__name">{p.dataKey}</span>
            <span className="chart-tooltip__val mono">{fmt(p.value)}</span>
          </li>
        ))}
      </ul>
      <p className="chart-tooltip__total">
        Total <strong>{fmt(total)}</strong>
      </p>
    </div>
  );
}

function ChartPlaceholder({ title, body, events }) {
  return (
    <div className="chart-placeholder" role="status">
      <strong>{title}</strong>
      <p>{body}</p>
      {events?.length ? (
        <p className="chart-placeholder__events mono">{events.join(" · ")}</p>
      ) : null}
    </div>
  );
}

function SeriesChart({
  data,
  keys,
  style,
  dark,
  colorMap,
  valueKind = "count",
  height = 320,
  gradPrefix = "if-amt",
}) {
  const tickFill = dark ? "#8eaa9a" : "#4d6a5a";
  const gridStroke = dark ? "rgba(156, 220, 188, 0.18)" : "rgba(16, 48, 36, 0.12)";
  const yFormatter =
    valueKind === "fold"
      ? (v) => (Number(v) >= 1000 ? formatFold(Number(v)) : Number(v).toFixed(2))
      : undefined;

  return (
    <div className="charts-frame charts-frame--tvs charts-frame--compact">
      <ResponsiveContainer width="100%" height={height}>
        {style === "bar" ? (
          <BarChart
            data={data}
            margin={{ top: 12, right: 12, left: 4, bottom: 4 }}
            barCategoryGap="28%"
            barGap={4}
          >
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: tickFill, fontSize: 11 }}
              axisLine={{ stroke: gridStroke }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={valueKind === "fold"}
              tick={{ fill: tickFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={valueKind === "fold" ? 56 : 36}
              tickFormatter={yFormatter}
            />
            <Tooltip
              content={<EventTooltip colorMap={colorMap} valueKind={valueKind} />}
              cursor={{ fill: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}
            />
            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => (
                <span style={{ color: "var(--muted)" }}>{value}</span>
              )}
            />
            {keys.map((k) => (
              <Bar
                key={k}
                dataKey={k}
                fill={colorMap[k]}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            ))}
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
            <defs>
              {keys.map((k) => {
                const c = colorMap[k];
                const id = `${gradPrefix}-${k.replace(/[^a-zA-Z0-9_-]/g, "")}`;
                return (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c} stopOpacity={dark ? 0.55 : 0.45} />
                    <stop offset="72%" stopColor={c} stopOpacity={dark ? 0.12 : 0.1} />
                    <stop offset="100%" stopColor={c} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>
            <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: tickFill, fontSize: 11 }}
              axisLine={{ stroke: gridStroke }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={valueKind === "fold"}
              tick={{ fill: tickFill, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={valueKind === "fold" ? 56 : 36}
              tickFormatter={yFormatter}
            />
            <Tooltip
              content={<EventTooltip colorMap={colorMap} valueKind={valueKind} />}
              cursor={{
                stroke: dark ? "rgba(182,255,59,0.35)" : "rgba(31,122,58,0.35)",
                strokeWidth: 1,
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={32}
              iconType="circle"
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              formatter={(value) => (
                <span style={{ color: "var(--muted)" }}>{value}</span>
              )}
            />
            {keys.map((k) => {
              const gradId = `${gradPrefix}-${k.replace(/[^a-zA-Z0-9_-]/g, "")}`;
              return (
                <Area
                  key={k}
                  type="monotone"
                  dataKey={k}
                  stackId="flow"
                  stroke={colorMap[k]}
                  strokeWidth={2.25}
                  fill={`url(#${gradId})`}
                  fillOpacity={1}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: colorMap[k] }}
                  connectNulls
                />
              );
            })}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function FlowChartBlock({
  heading,
  blurb,
  emptyTitle,
  emptyBody,
  model,
  style,
  dark,
  valueKind,
  gradPrefix,
}) {
  const colorMap = useMemo(() => {
    const map = {};
    model.keys.forEach((k, i) => {
      map[k] = colorFor(i, dark);
    });
    return map;
  }, [model.keys, dark]);

  return (
    <section className="chart-section">
      <div className="chart-section__head">
        <h3>{heading}</h3>
        <p>{blurb}</p>
      </div>
      {!model.hasData ? (
        <ChartPlaceholder title={emptyTitle} body={emptyBody} events={model.eventNames} />
      ) : (
        <SeriesChart
          data={model.data}
          keys={model.keys}
          style={style}
          dark={dark}
          colorMap={colorMap}
          valueKind={valueKind}
          gradPrefix={gradPrefix}
        />
      )}
    </section>
  );
}

export function ChartsPanel({ timeline, priceUsd }) {
  const [style, setStyle] = useState("bar");
  const [filterId, setFilterId] = useState("all");
  const dark = useIsDarkTheme();
  const filter = FILTERS.find((f) => f.id === filterId) || FILTERS[0];

  const { data, keys, mode } = useMemo(
    () => buildChartModel(timeline, filter.contract),
    [timeline, filter.contract]
  );

  const colorMap = useMemo(() => {
    const map = {};
    keys.forEach((k, i) => {
      map[k] = k === "Other" ? (dark ? "#6b7c74" : "#8a9a90") : colorFor(i, dark);
    });
    return map;
  }, [keys, dark]);

  const fees = useMemo(() => buildFeeRewardStats(timeline), [timeline]);

  const rewardFlow = useMemo(
    () => buildDailySeries(timeline, REWARD_AMOUNT_SERIES),
    [timeline]
  );
  const treasuryFlow = useMemo(
    () => buildDailySeries(timeline, TREASURY_AMOUNT_SERIES),
    [timeline]
  );
  const feeFlow = useMemo(
    () => buildDailySeries(timeline, FEE_COUNT_SERIES),
    [timeline]
  );

  const boxes = [
    {
      label: "Rewards claimed",
      count: fees.rewardClaimedCount,
      ...fmtTokenAmount(fees.rewardClaimedAmount),
      hint: "RewardClaimed",
    },
    {
      label: "Rewards credited",
      count: fees.rewardCreditedCount,
      ...fmtTokenAmount(fees.rewardCreditedAmount),
      hint: "RewardCredited",
    },
    {
      label: "Rewards distributed",
      count: fees.rewardsDistributedCount,
      ...fmtTokenAmount(fees.rewardsDistributedAmount),
      hint: "RewardsDistributed",
    },
    {
      label: "Treasury claimed",
      count: fees.treasuryClaimedCount,
      ...fmtTokenAmount(fees.treasuryClaimedAmount),
      hint: "TreasuryClaimed",
    },
    {
      label: "Treasury credited",
      count: fees.treasuryCreditedCount,
      ...fmtTokenAmount(fees.treasuryCreditedAmount),
      hint: "TreasuryCredited",
    },
    {
      label: "Fee config events",
      count: fees.feeConfigUpdates + fees.feeTokenAllowed,
      fold: null,
      amountLabel: `${fees.feeConfigUpdates} config · ${fees.feeTokenAllowed} allow`,
      hint: "Fee*",
    },
  ];

  const tickFill = dark ? "#8eaa9a" : "#4d6a5a";
  const gridStroke = dark ? "rgba(156, 220, 188, 0.18)" : "rgba(16, 48, 36, 0.12)";

  return (
    <div className="charts-panel">
      <div className="fee-boxes">
        {boxes.map((b) => (
          <div key={b.label} className="fee-box">
            <p className="fee-box__hint">{b.hint}</p>
            <strong className="fee-box__label">{b.label}</strong>
            <p className="fee-box__count">{b.count}</p>
            <p className="fee-box__detail mono">{b.amountLabel}</p>
            {b.fold != null && priceUsd != null ? (
              <p className="fee-box__usd">{formatUsd(b.fold, priceUsd)}</p>
            ) : null}
          </div>
        ))}
      </div>

      <div className="charts-toolbar">
        <div className="dash-tab-bar" role="group" aria-label="Chart style">
          <button
            type="button"
            className={`dash-tab ${style === "line" ? "is-active" : ""}`}
            onClick={() => setStyle("line")}
          >
            <LineChartIcon size={14} /> Line
          </button>
          <button
            type="button"
            className={`dash-tab ${style === "bar" ? "is-active" : ""}`}
            onClick={() => setStyle("bar")}
          >
            <BarChart3 size={14} /> Bar
          </button>
        </div>
        <div className="event-filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`filter-chip ${filterId === f.id ? "is-active" : ""}`}
              onClick={() => setFilterId(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <p className="charts-hint">
        {style === "line"
          ? "Time runs left → right (oldest → current). Gradient area under the curve."
          : mode === "contract"
            ? "Grouped vertical bars — oldest day on the left, latest on the right."
            : `Grouped vertical bars — one series per ${filter.label} event type.`}
      </p>
      <div className="charts-axis-legend" aria-hidden>
        <span>Past</span>
        <span className="charts-axis-legend__line" />
        <span>Current →</span>
      </div>

      {!data.length ? (
        <div className="empty">No event series yet.</div>
      ) : (
        <div className="charts-frame charts-frame--tvs">
          <ResponsiveContainer width="100%" height={520}>
            {style === "bar" ? (
              <BarChart
                data={data}
                margin={{ top: 16, right: 16, left: 4, bottom: 8 }}
                barCategoryGap="28%"
                barGap={4}
              >
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickFill, fontSize: 12 }}
                  axisLine={{ stroke: gridStroke }}
                  tickLine={false}
                  reversed={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: tickFill, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  content={<EventTooltip colorMap={colorMap} />}
                  cursor={{ fill: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  formatter={(value) => (
                    <span style={{ color: "var(--muted)" }}>{value}</span>
                  )}
                />
                {keys.map((k) => (
                  <Bar
                    key={k}
                    dataKey={k}
                    fill={colorMap[k]}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                ))}
              </BarChart>
            ) : (
              <AreaChart data={data} margin={{ top: 16, right: 16, left: 4, bottom: 8 }}>
                <defs>
                  {keys.map((k) => {
                    const c = colorMap[k];
                    const id = `if-grad-${k.replace(/[^a-zA-Z0-9_-]/g, "")}`;
                    return (
                      <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={dark ? 0.55 : 0.45} />
                        <stop offset="72%" stopColor={c} stopOpacity={dark ? 0.12 : 0.1} />
                        <stop offset="100%" stopColor={c} stopOpacity={0} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickFill, fontSize: 12 }}
                  axisLine={{ stroke: gridStroke }}
                  tickLine={false}
                  reversed={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: tickFill, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
                />
                <Tooltip
                  content={<EventTooltip colorMap={colorMap} />}
                  cursor={{
                    stroke: dark ? "rgba(182,255,59,0.35)" : "rgba(31,122,58,0.35)",
                    strokeWidth: 1,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  formatter={(value) => (
                    <span style={{ color: "var(--muted)" }}>{value}</span>
                  )}
                />
                {keys.map((k) => {
                  const gradId = `if-grad-${k.replace(/[^a-zA-Z0-9_-]/g, "")}`;
                  return (
                    <Area
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stackId="tvs"
                      stroke={colorMap[k]}
                      strokeWidth={2.25}
                      fill={`url(#${gradId})`}
                      fillOpacity={1}
                      dot={false}
                      activeDot={{
                        r: 5,
                        strokeWidth: 0,
                        fill: colorMap[k],
                      }}
                      connectNulls
                    />
                  );
                })}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      <div className="chart-sections">
        <FlowChartBlock
          heading="Reward flows"
          blurb="Daily FOLD amounts from RewardsDistributed, RewardCredited, and RewardClaimed. Ready as soon as rewards start landing on-chain."
          emptyTitle="No reward events yet"
          emptyBody="When the protocol distributes or credits rewards, this chart will plot daily FOLD amounts automatically from indexed Interfold logs."
          model={rewardFlow}
          style={style}
          dark={dark}
          valueKind="fold"
          gradPrefix="if-reward"
        />
        <FlowChartBlock
          heading="Treasury flows"
          blurb="Daily FOLD credited to and claimed from the treasury."
          emptyTitle="No treasury events yet"
          emptyBody="TreasuryCredited and TreasuryClaimed will appear here as amount series once those transactions fire."
          model={treasuryFlow}
          style={style}
          dark={dark}
          valueKind="fold"
          gradPrefix="if-treasury"
        />
        <FlowChartBlock
          heading="Fee config activity"
          blurb="Count of fee asset config updates and allowlist changes over time."
          emptyTitle="No fee config events yet"
          emptyBody="FeeAssetConfigUpdated and FeeTokenAllowed will populate this chart when fee parameters change."
          model={feeFlow}
          style={style}
          dark={dark}
          valueKind="count"
          gradPrefix="if-fee"
        />
      </div>
    </div>
  );
}
