import { useMemo } from "react";
import { Bar, BarChart, ResponsiveContainer, Cell } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { formatPriceUsd } from "../lib/foldPrice";
import { useFoldPrice } from "../hooks/useFoldPrice";
import { FoldIcon } from "./FoldIcon";

function formatPct(pct) {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function SparkBars({ values, up }) {
  const data = useMemo(() => values.map((price, i) => ({ i, price })), [values]);
  if (!data.length) {
    return <span className="fold-price-widget__empty">No chart</span>;
  }
  const fill = up ? "var(--accent)" : "#ff8fab";
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <Bar dataKey="price" radius={[1, 1, 0, 0]} isAnimationActive={false}>
          {data.map((_, i) => (
            <Cell key={i} fill={fill} fillOpacity={0.35 + (i / data.length) * 0.65} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Zama-style sidebar price widget: spot + 24h % + mini bar sparkline.
 * @param {{ compact?: boolean }} props
 */
export function SidebarFoldPriceWidget({ compact = false }) {
  const { priceUsd, change24h, spark, loading } = useFoldPrice();
  const up = change24h == null || change24h >= 0;

  return (
    <div
      className={`fold-price-widget${compact ? " fold-price-widget--compact" : ""}`}
      title="FOLD · CoinGecko"
    >
      <div className="fold-price-widget__head">
        <span className="fold-price-widget__ticker">
          <FoldIcon size={compact ? 14 : 16} />
          FOLD
        </span>
        <span className={`fold-price-widget__pct ${up ? "is-up" : "is-down"}`}>
          {up ? <TrendingUp size={11} aria-hidden /> : <TrendingDown size={11} aria-hidden />}
          {loading && priceUsd == null ? "—" : formatPct(change24h)}
        </span>
      </div>
      <div className="fold-price-widget__price">
        {loading && priceUsd == null ? "…" : formatPriceUsd(priceUsd)}
      </div>
      <div className="fold-price-widget__spark" aria-hidden>
        {loading && !spark.length ? (
          <div className="fold-price-widget__skel" />
        ) : (
          <SparkBars values={spark} up={up} />
        )}
      </div>
      {compact ? null : <p className="fold-price-widget__src">7d · CoinGecko</p>}
    </div>
  );
}
