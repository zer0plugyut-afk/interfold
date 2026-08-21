import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useFoldPrice } from "../hooks/useFoldPrice";
import { formatPriceUsd, formatUsd } from "../lib/foldPrice";
import {
  buildDailyUnlockSeries,
  buildMonthlyUnlockBars,
  buildUnlockScheduleSeries,
  computeFoldSnapshot,
  exactFold,
  FOLD_ALLOCATIONS,
  FOLD_TGE_DATE,
  FOLD_TOTAL_SUPPLY,
  FOLD_VESTING_START,
  formatFold,
  unlockInNextDays,
  unlockPerDay,
} from "../lib/foldTokenomics";

function AllocationBottle({ rows, activeId, onActiveIdChange, priceUsd }) {
  const [local, setLocal] = useState(null);
  const active = onActiveIdChange ? activeId : local;
  const setActive = onActiveIdChange ?? setLocal;
  const current = rows.find((r) => r.id === active) ?? null;

  return (
    <div className="tok-bottle">
      <div className="tok-bottle__meta">
        <p className="tok-bottle__kicker">Total supply</p>
        <strong className="tok-bottle__total">{formatFold(FOLD_TOTAL_SUPPLY)}</strong>
        <p className="tok-bottle__sub">
          1.2B FOLD
          {priceUsd != null ? ` · ${formatUsd(FOLD_TOTAL_SUPPLY, priceUsd)}` : ""}
        </p>
      </div>

      <div className="tok-bottle__frame">
        <div className="tok-bottle__shadow" aria-hidden />
        <div className="tok-bottle__cylinder" role="img" aria-label="FOLD allocation bottle">
          <div className="tok-bottle__rim" aria-hidden />
          <div className="tok-bottle__stack">
            {[...rows].reverse().map((s) => {
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`tok-bottle__band ${isActive ? "is-active" : ""}`}
                  style={{
                    height: `${s.percent}%`,
                    background: `linear-gradient(90deg, color-mix(in srgb, black 22%, ${s.color}) 0%, ${s.color} 32%, ${s.color} 68%, color-mix(in srgb, white 14%, ${s.color}) 100%)`,
                    opacity: active && !isActive ? 0.38 : 1,
                  }}
                  title={`${s.name} (${s.percent}%): ${exactFold(s.allocation)} FOLD`}
                  onMouseEnter={() => setActive(s.id)}
                  onFocus={() => setActive(s.id)}
                  onMouseLeave={() => setActive(null)}
                  onBlur={() => setActive(null)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="tok-bottle__hint">
        {current ? (
          <>
            <strong>{current.name}</strong>
            <span>
              {formatFold(current.allocation)}
              {priceUsd != null ? ` (${formatUsd(current.allocation, priceUsd)})` : ""} ·{" "}
              {formatFold(current.unlocked)} unlocked ({current.unlockedPctOfBucket.toFixed(1)}%)
            </span>
          </>
        ) : (
          <span>Hover a band to inspect</span>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, hint, usd }) {
  return (
    <div className="tok-tile">
      <p className="tok-tile__label">{label}</p>
      <strong className="tok-tile__value">{value}</strong>
      {usd ? <p className="tok-tile__usd">{usd}</p> : null}
      {hint ? <p className="tok-tile__hint">{hint}</p> : null}
    </div>
  );
}

function UnlockTooltip({ active, payload, label, priceUsd }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__day">{label}</p>
      {payload.map((p) => (
        <p
          key={p.dataKey}
          className="chart-tooltip__total"
          style={{ border: 0, padding: 0, margin: "4px 0" }}
        >
          {p.name || p.dataKey}: <strong>{formatFold(Number(p.value))}</strong>
          {priceUsd != null ? (
            <span className="tok-tile__usd"> · {formatUsd(Number(p.value), priceUsd)}</span>
          ) : null}
        </p>
      ))}
    </div>
  );
}

export function TokenomicsPanel() {
  const asOf = useMemo(() => new Date(), []);
  const snap = useMemo(() => computeFoldSnapshot(asOf), [asOf]);
  const schedule = useMemo(() => buildUnlockScheduleSeries(asOf), [asOf]);
  const monthly = useMemo(() => buildMonthlyUnlockBars(asOf), [asOf]);
  const daily = useMemo(() => buildDailyUnlockSeries(asOf), [asOf]);
  const [activeId, setActiveId] = useState(null);
  const [chartMode, setChartMode] = useState("cumulative");
  const { priceUsd, change24h, loading: priceLoading } = useFoldPrice();

  const perDay = unlockPerDay(asOf);
  const next7 = unlockInNextDays(7, asOf);
  const next30 = unlockInNextDays(30, asOf);
  const next90 = unlockInNextDays(90, asOf);
  const vestingStarted = asOf.getTime() >= FOLD_VESTING_START.getTime();

  const nowLabel = asOf.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  // Daily chart: show ~120 days window around now for readability, or first 120 from vesting if before start
  const dailyWindow = useMemo(() => {
    if (!daily.length) return [];
    const vest = FOLD_VESTING_START.getTime();
    const focus = Math.max(asOf.getTime(), vest);
    const start = focus - 14 * 86400000;
    const end = focus + 106 * 86400000;
    const sliced = daily.filter((p) => p.t >= start && p.t <= end);
    return sliced.length >= 30 ? sliced : daily.slice(0, 120);
  }, [daily, asOf]);

  return (
    <div className="tok-panel">
      <div className="tok-head">
        <div>
          <p className="brand__kicker">From docs.theinterfold.com/tokenomics</p>
          <h2>FOLD Tokenomics</h2>
          <p className="tok-head__lede">
            Pure unlock model — recalculated on refresh. Linear unlocks start{" "}
            <span className="hint">1 Sep 2026</span> (official docs). TGE / transferability{" "}
            <span className="hint">
              {FOLD_TGE_DATE.toLocaleDateString("en-US", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: "UTC",
              })}
            </span>
            .
          </p>
        </div>
        <div className="tok-asof">
          <div>As of {nowLabel} UTC</div>
          <div className="tok-price">
            FOLD {priceLoading && priceUsd == null ? "…" : formatPriceUsd(priceUsd)}
            {change24h != null ? (
              <span className={change24h >= 0 ? "tok-price--up" : "tok-price--down"}>
                {" "}
                {change24h >= 0 ? "+" : ""}
                {change24h.toFixed(1)}%
              </span>
            ) : null}
            <span className="tok-price__src">CoinGecko · 5m cache</span>
          </div>
        </div>
      </div>

      <section className="tok-hero">
        <div>
          <p className="tok-tile__label">In circulation (model)</p>
          <p className="tok-hero__circ">{formatFold(snap.circulating)}</p>
          <p className="tok-hero__sub">
            {snap.circulatingPct.toFixed(2)}% of {formatFold(snap.totalSupply)}
            {priceUsd != null ? ` · ${formatUsd(snap.circulating, priceUsd)}` : ""} · docs TGE cap ≤{" "}
            {snap.tgeCirculatingCapPct}%
          </p>
        </div>

        <div className="tok-hero__mkt">
          <div className="tok-mkt-card">
            <p className="tok-tile__label">Market cap</p>
            <strong className="tok-mkt-card__value">
              {priceUsd != null
                ? formatUsd(snap.circulating, priceUsd)
                : "—"}
            </strong>
            <p className="tok-tile__hint">Circulating × spot (updates as unlocks land)</p>
          </div>
          <div className="tok-mkt-card">
            <p className="tok-tile__label">FDV</p>
            <strong className="tok-mkt-card__value">
              {priceUsd != null ? formatUsd(snap.totalSupply, priceUsd) : "—"}
            </strong>
            <p className="tok-tile__hint">1.2B × spot (fully diluted)</p>
          </div>
        </div>

        <div className="tok-hero__tiles">
          <Tile
            label="Still locked"
            value={formatFold(snap.locked)}
            usd={priceUsd != null ? formatUsd(snap.locked, priceUsd) : null}
            hint="Not yet released"
          />
          <Tile
            label="Total supply"
            value={formatFold(snap.totalSupply)}
            usd={priceUsd != null ? formatUsd(snap.totalSupply, priceUsd) : null}
            hint="Fixed 1.2B"
          />
          <Tile label="TGE unlocked" value="≤ 25.21%" hint="Investors + Unsold CCA" />
        </div>
      </section>

      <div className="tok-layout">
        <AllocationBottle
          rows={snap.rows}
          activeId={activeId}
          onActiveIdChange={setActiveId}
          priceUsd={priceUsd}
        />

        <div className="tok-alloc-list">
          <h3>Distribution</h3>
          <p className="tok-alloc-list__hint">
            Community{" "}
            {FOLD_ALLOCATIONS.filter((a) => a.group === "community")
              .reduce((s, a) => s + a.percent, 0)
              .toFixed(2)}
            % · Other{" "}
            {FOLD_ALLOCATIONS.filter((a) => a.group === "other")
              .reduce((s, a) => s + a.percent, 0)
              .toFixed(2)}
            %
          </p>
          <ul>
            {snap.rows.map((r) => (
              <li
                key={r.id}
                className={activeId === r.id ? "is-active" : ""}
                onMouseEnter={() => setActiveId(r.id)}
                onMouseLeave={() => setActiveId(null)}
              >
                <span className="tok-swatch" style={{ background: r.color }} />
                <div className="tok-alloc-row">
                  <strong>{r.name}</strong>
                  <span className="mono">
                    {r.percent}% · {formatFold(r.allocation)}
                    {priceUsd != null ? ` · ${formatUsd(r.allocation, priceUsd)}` : ""}
                  </span>
                  <span className="tok-alloc-note">{r.note}</span>
                  <div className="tok-progress">
                    <div
                      className="tok-progress__fill"
                      style={{ width: `${r.unlockedPctOfBucket}%`, background: r.color }}
                    />
                  </div>
                  <span className="tok-alloc-unlocked">
                    {formatFold(r.unlocked)} unlocked ({r.unlockedPctOfBucket.toFixed(1)}%)
                    {priceUsd != null ? ` · ${formatUsd(r.unlocked, priceUsd)}` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="tok-card">
        <h3>What gets released next</h3>
        <p className="tok-alloc-list__hint">
          Daily linear unlock begins <strong>1 Sep 2026</strong> (docs). Until then “Every day” is
          0. Investors & Unsold CCA are already unlocked from TGE.
        </p>
        <div className="tok-next-grid">
          <Tile
            label="Every day"
            value={formatFold(perDay)}
            usd={priceUsd != null ? formatUsd(perDay, priceUsd) : null}
            hint={vestingStarted ? "FOLD / day" : "Starts 1 Sep 2026"}
          />
          <Tile
            label="Next 7 days"
            value={formatFold(next7)}
            usd={priceUsd != null ? formatUsd(next7, priceUsd) : null}
          />
          <Tile
            label="Next 30 days"
            value={formatFold(next30)}
            usd={priceUsd != null ? formatUsd(next30, priceUsd) : null}
          />
          <Tile
            label="Next 90 days"
            value={formatFold(next90)}
            usd={priceUsd != null ? formatUsd(next90, priceUsd) : null}
          />
        </div>
      </section>

      <section className="tok-card">
        <div className="tok-card__head">
          <div>
            <h3>Unlock schedule</h3>
            <p className="tok-alloc-list__hint">
              Time left → right. Monthly labels are <strong>month + year</strong> (e.g. Sep 2026),
              not day-of-month. Daily tab uses real calendar dates from 1 Sep 2026.
            </p>
          </div>
          <div className="dash-tab-bar" role="group" aria-label="Unlock chart">
            <button
              type="button"
              className={`dash-tab ${chartMode === "cumulative" ? "is-active" : ""}`}
              onClick={() => setChartMode("cumulative")}
            >
              Circulating
            </button>
            <button
              type="button"
              className={`dash-tab ${chartMode === "monthly" ? "is-active" : ""}`}
              onClick={() => setChartMode("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`dash-tab ${chartMode === "daily" ? "is-active" : ""}`}
              onClick={() => setChartMode("daily")}
            >
              Daily
            </button>
          </div>
        </div>

        <div className="charts-frame charts-frame--tvs tok-chart">
          <ResponsiveContainer width="100%" height={360}>
            {chartMode === "cumulative" ? (
              <AreaChart data={schedule} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="fold-circ-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--line)" }}
                  reversed={false}
                  interval="preserveStartEnd"
                  minTickGap={36}
                />
                <YAxis
                  tickFormatter={(v) => formatFold(v, 1)}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<UnlockTooltip priceUsd={priceUsd} />} />
                <ReferenceLine
                  x="Now"
                  stroke="var(--accent)"
                  strokeDasharray="4 4"
                  label={{ value: "Now", fill: "var(--accent)", fontSize: 11 }}
                />
                <Area
                  type="monotone"
                  dataKey="circulating"
                  name="Circulating"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  fill="url(#fold-circ-grad)"
                  dot={false}
                  activeDot={{ r: 5, fill: "var(--accent)", strokeWidth: 0 }}
                />
              </AreaChart>
            ) : chartMode === "monthly" ? (
              <BarChart data={monthly} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--line)" }}
                  reversed={false}
                  interval="preserveStartEnd"
                  minTickGap={36}
                />
                <YAxis
                  tickFormatter={(v) => formatFold(v, 1)}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<UnlockTooltip priceUsd={priceUsd} />} />
                <Bar dataKey="unlock" name="New unlock" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart data={dailyWindow} margin={{ top: 12, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--line)" }}
                  reversed={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v) => formatFold(v, 1)}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip
                  content={<UnlockTooltip priceUsd={priceUsd} />}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.label || ""}
                />
                <Bar dataKey="unlock" name="Daily unlock" fill="var(--accent)" radius={[2, 2, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        <p className="tok-foot">
          Vesting start {FOLD_VESTING_START.toISOString().slice(0, 10)} (1 Sep 2026 per docs) ·
          Source:{" "}
          <a href="https://docs.theinterfold.com/tokenomics" target="_blank" rel="noreferrer">
            Interfold Tokenomics
          </a>
          {chartMode === "daily"
            ? " · Daily view shows ~4 months of calendar days (linear unlock ÷ days in each vesting window)."
            : ""}
        </p>
      </section>
    </div>
  );
}
