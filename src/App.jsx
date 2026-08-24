import { useEffect, useMemo, useState } from "react";
import { Banner } from "./components/Banner";
import { BoardDisclaimer } from "./components/BoardDisclaimer";
import { ChartsPanel } from "./components/ChartsPanel";
import { DappsPanel } from "./components/DappsPanel";
import { AddressSearch, AddressSearchResults } from "./components/AddressSearch";
import { EventTimeline } from "./components/EventTimeline";
import { Gauges } from "./components/Gauges";
import { InstallPrompt } from "./components/InstallPrompt";
import { LandingPage } from "./components/LandingPage";
import { OperatorsTable } from "./components/OperatorsTable";
import { TokenomicsPanel } from "./components/TokenomicsPanel";
import { Sidebar } from "./components/Sidebar";
import { SidebarFoldPriceWidget } from "./components/SidebarFoldPriceWidget";
import { useBoardData } from "./hooks/useBoardData";
import { useFoldPrice } from "./hooks/useFoldPrice";
import { useTheme } from "./hooks/useTheme";
import { getDapp } from "./lib/dapps";
import { formatPriceUsd } from "./lib/foldPrice";
import { num } from "./lib/format";
import { Moon, Sun } from "lucide-react";
import { FoldIcon } from "./components/FoldIcon";

const TITLES = {
  operators: ["Operators", "Network-wide ciphernode set"],
  events: ["Events", "Decoded protocol logs"],
  charts: ["Charts", "Fees, rewards & activity"],
  tokenomics: ["Tokenomics", "FOLD supply & unlock schedule"],
  apps: ["DApps", "Applications on InterFold"],
  search: ["Search", "Address activity"],
};

function parseHash() {
  const raw = location.hash.replace(/^#/, "");
  if (!raw || raw === "home" || raw === "scope" || raw === "counts") {
    return { view: "landing", panel: "operators", dappId: null };
  }
  if (raw === "crisp" || raw === "apps/crisp") {
    return { view: "board", panel: "apps", dappId: "crisp" };
  }
  if (raw.startsWith("apps/")) {
    const id = raw.slice(5);
    return { view: "board", panel: "apps", dappId: getDapp(id) ? id : null };
  }
  if (TITLES[raw]) return { view: "board", panel: raw, dappId: null };
  return { view: "landing", panel: "operators", dappId: null };
}

export default function App() {
  const { data, error, loading } = useBoardData();
  const { priceUsd, change24h } = useFoldPrice();
  const { theme, toggle } = useTheme();
  const initial = parseHash();
  const [view, setView] = useState(initial.view);
  const [panel, setPanel] = useState(initial.panel);
  const [dappId, setDappId] = useState(initial.dappId);
  const [eventFilter, setEventFilter] = useState("all");
  const [searchPayload, setSearchPayload] = useState(null);

  useEffect(() => {
    if (view === "landing") {
      history.replaceState(null, "", "#home");
      return;
    }
    if (panel === "apps" && dappId) {
      history.replaceState(null, "", `#apps/${dappId}`);
    } else if (panel === "search") {
      history.replaceState(null, "", "#search");
    } else {
      history.replaceState(null, "", `#${panel}`);
    }
  }, [view, panel, dappId]);

  const counts = useMemo(
    () => ({
      operators: data?.operators?.length ?? 0,
      events: data?.timeline?.length ?? 0,
    }),
    [data]
  );

  const goHome = () => {
    setSearchPayload(null);
    setDappId(null);
    setView("landing");
  };

  const enterBoard = (id = "operators") => {
    setSearchPayload(null);
    setDappId(null);
    setPanel(id);
    setView("board");
  };

  const navigate = (id) => {
    setSearchPayload(null);
    setDappId(null);
    setPanel(id);
    setView("board");
  };

  const openSearch = (payload) => {
    setSearchPayload(payload);
    setPanel("search");
    setDappId(null);
    setView("board");
  };

  if (loading && !data) {
    return <div className="empty" style={{ margin: 24 }}>Loading board…</div>;
  }

  if (error && !data) {
    return <div className="empty" style={{ margin: 24 }}>Failed to load: {error}</div>;
  }

  if (view === "landing") {
    return (
      <>
        <div className="bg" />
        <LandingPage
          counts={counts}
          live={data?.live}
          priceLabel={formatPriceUsd(priceUsd)}
          theme={theme}
          onToggleTheme={toggle}
          onEnterBoard={enterBoard}
        />
        <InstallPrompt />
      </>
    );
  }

  const dapp = dappId ? getDapp(dappId) : null;
  const [title, kicker] =
    panel === "apps" && dapp
      ? [dapp.name, dapp.tagline]
      : TITLES[panel] || TITLES.operators;

  return (
    <>
      <div className="bg" />
      <div className="shell">
        <Sidebar
          panel={panel === "search" ? "" : panel}
          onNavigate={navigate}
          onGoHome={goHome}
          counts={counts}
          onToggleTheme={toggle}
        />

        <div className="workspace">
          <div className="mobile-bar">
            <button
              type="button"
              className="mobile-bar__brand"
              onClick={goHome}
              aria-label="Back to Interfold Board landing"
            >
              <img className="brand__logo brand__logo--sm" src="/favicon.svg" width={36} height={36} alt="" />
              <div>
                <p className="brand__kicker">Community board</p>
                <strong>Interfold Board</strong>
              </div>
            </button>
            <div className="mobile-bar__actions">
              <SidebarFoldPriceWidget compact />
              <button
                type="button"
                className="theme-btn theme-btn--mobile theme-btn--icon"
                onClick={toggle}
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                title={theme === "dark" ? "Light mode" : "Dark mode"}
              >
                {theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
              </button>
            </div>
          </div>

          <header className="top">
            <div className="top__title">
              <p className="brand__kicker">{kicker}</p>
              <h1>{title}</h1>
            </div>
            <div className="top__search">
              <AddressSearch
                boardData={data}
                onOpenResults={openSearch}
                active={panel === "search"}
              />
            </div>
            <div className="top__meta">
              <div className="top__badge">Community analytics layer</div>
              <div className="top__price" title="CoinGecko">
                <FoldIcon size={18} />
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
              panel === "apps" ||
              panel === "search" ||
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
                    Boxes tally Interfold fee/treasury/reward events. Activity chart below,
                    then dedicated reward, treasury, and fee-config charts — placeholders
                    until those on-chain events land.
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

            {panel === "apps" && (
              <section className="panel is-active panel--fill">
                <DappsPanel
                  dappId={dappId}
                  onSelectDapp={setDappId}
                  crispEvents={data?.crisp?.events || []}
                  crispNetwork={data?.crisp?.network || "mainnet"}
                />
              </section>
            )}

            {panel === "search" && searchPayload ? (
              <AddressSearchResults
                payload={searchPayload}
                onClose={() => {
                  setSearchPayload(null);
                  setPanel("operators");
                }}
              />
            ) : null}
          </main>

          <BoardDisclaimer />
        </div>
      </div>
      <InstallPrompt />
    </>
  );
}
