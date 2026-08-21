import { useEffect, useMemo, useState } from "react";
import { Banner } from "./components/Banner";
import { ChartsPanel } from "./components/ChartsPanel";
import { CrispPanel } from "./components/CrispPanel";
import { EventTimeline } from "./components/EventTimeline";
import { Gauges } from "./components/Gauges";
import { OperatorsTable } from "./components/OperatorsTable";
import { TokenomicsPanel } from "./components/TokenomicsPanel";
import { Sidebar } from "./components/Sidebar";
import { useBoardData } from "./hooks/useBoardData";
import { useFoldPrice } from "./hooks/useFoldPrice";
import { useTheme } from "./hooks/useTheme";
import { formatPriceUsd } from "./lib/foldPrice";
import { num } from "./lib/format";

const TITLES = {
  operators: ["Operators", "Network-wide ciphernode set"],
  events: ["Events", "Decoded protocol logs"],
  charts: ["Charts", "Fees, rewards & activity"],
  tokenomics: ["Tokenomics", "FOLD supply & unlock schedule"],
  crisp: ["CRISP", "Encrypted ballot (Sepolia today)"],
};

export default function App() {
  const { data, error, loading } = useBoardData();
  const { priceUsd, change24h } = useFoldPrice();
  const { toggle } = useTheme();
  const [panel, setPanel] = useState(() => {
    const hash = location.hash.replace("#", "");
    if (hash === "scope" || hash === "counts") return "operators";
    return TITLES[hash] ? hash : "operators";
  });
  const [eventFilter, setEventFilter] = useState("all");

  useEffect(() => {
    history.replaceState(null, "", `#${panel}`);
  }, [panel]);

  const counts = useMemo(
    () => ({
      operators: data?.operators?.length ?? 0,
      events: data?.timeline?.length ?? 0,
      crisp: data?.crisp?.events?.length ?? 0,
    }),
    [data]
  );

  if (loading && !data) {
    return <div className="empty" style={{ margin: 24 }}>Loading board…</div>;
  }

  if (error && !data) {
    return <div className="empty" style={{ margin: 24 }}>Failed to load: {error}</div>;
  }

  const [title, kicker] = TITLES[panel] || TITLES.operators;

  return (
    <>
      <div className="bg" />
      <div className="shell">
        <Sidebar
          panel={panel}
          onNavigate={setPanel}
          counts={counts}
          onToggleTheme={toggle}
        />

        <div className="workspace">
          <header className="top">
            <div>
              <p className="brand__kicker">{kicker}</p>
              <h1>{title}</h1>
            </div>
            <div className="top__meta">
              <div className="top__badge">Community analytics layer</div>
              <div className="top__price" title="CoinGecko · cached 5 min">
                FOLD {formatPriceUsd(priceUsd)}
                {change24h != null ? (
                  <span className={change24h >= 0 ? "tok-price--up" : "tok-price--down"}>
                    {" "}
                    {change24h >= 0 ? "+" : ""}
                    {change24h.toFixed(1)}%
                  </span>
                ) : null}
              </div>
              <div>
                {data?.meta?.generatedAt
                  ? new Date(data.meta.generatedAt).toLocaleString()
                  : ""}
              </div>
              <div>Block {num(data?.meta?.latestBlock || data?.live?.latestBlock)}</div>
            </div>
          </header>

          <Banner live={data?.live} />
          <Gauges live={data?.live} priceUsd={priceUsd} />

          <main
            className={`main-panel ${
              panel === "events" ||
              panel === "charts" ||
              panel === "crisp" ||
              panel === "tokenomics"
                ? "main-panel--fill"
                : ""
            }`}
          >
            {panel === "operators" && (
              <section className="panel is-active panel--fill">
                <div className="section-head">
                  <h2>Operator board</h2>
                  <p>
                    Tickets = sortition entries from{" "}
                    <span className="hint">tFOLD balance ÷ ticket price (1,000)</span>.
                  </p>
                </div>
                <OperatorsTable operators={data?.operators || []} priceUsd={priceUsd} />
              </section>
            )}

            {panel === "events" && (
              <section className="panel is-active panel--fill">
                <div className="section-head">
                  <h2>Event timeline</h2>
                  <p>Live on-chain logs (Bonding, Registry, Interfold, Slashing).</p>
                </div>
                <EventTimeline
                  timeline={data?.timeline || []}
                  filter={eventFilter}
                  onFilterChange={setEventFilter}
                />
              </section>
            )}

            {panel === "charts" && (
              <section className="panel is-active panel--fill">
                <div className="section-head">
                  <h2>Fees, rewards & activity</h2>
                  <p>
                    Boxes tally Interfold fee/treasury/reward events (0 until they fire). Chart
                    below toggles line / bar.
                  </p>
                </div>
                <ChartsPanel timeline={data?.timeline || []} priceUsd={priceUsd} />
              </section>
            )}

            {panel === "tokenomics" && (
              <section className="panel is-active panel--fill">
                <TokenomicsPanel />
              </section>
            )}

            {panel === "crisp" && (
              <section className="panel is-active panel--fill">
                <div className="section-head">
                  <h2>CRISP ballots</h2>
                  <p>
                    Encrypted ballot program on{" "}
                    <span className="hint">{data?.crisp?.network || "sepolia"}</span>. Indexed via{" "}
                    <span className="hint">crisp.js</span>.
                  </p>
                </div>
                <CrispPanel
                  events={data?.crisp?.events || []}
                  network={data?.crisp?.network || "sepolia"}
                />
              </section>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
