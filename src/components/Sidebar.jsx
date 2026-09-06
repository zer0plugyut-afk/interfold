import { Moon, Sun } from "lucide-react";
import { NAV_ICONS } from "../lib/icons";
import { DAPPS } from "../lib/dapps";
import { DonateButton } from "./DonateModal";
import { SidebarFoldPriceWidget } from "./SidebarFoldPriceWidget";

export function Sidebar({ panel, onNavigate, onGoHome, counts, theme, onToggleTheme, onDonate }) {
  const items = [
    { id: "operators", label: "Operators", count: counts.operators },
    { id: "events", label: "Events", count: counts.events },
    { id: "charts", label: "Charts", count: null },
    { id: "tokenomics", label: "Tokenomics", count: null },
    { id: "apps", label: "DApps", count: DAPPS.length },
  ];

  return (
    <aside className="sidebar">
      <button
        type="button"
        className="sidebar__brand"
        onClick={onGoHome}
        aria-label="Back to Interfold Board landing"
      >
        <img className="brand__logo" src="/favicon.svg" width={42} height={42} alt="" />
        <div className="sidebar__brand-text">
          <p className="brand__kicker">Community board</p>
          <strong>Interfold Board</strong>
          <p className="brand__disclaimer">Not affiliated with the Interfold Foundation.</p>
        </div>
      </button>

      <nav className="sidebar__nav" aria-label="Sections">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.id];
          const active = panel === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-btn nav-btn--icon ${active ? "is-active" : ""}`}
              onClick={() => onNavigate(item.id)}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={`nav-icon-svg ${active ? "is-active" : ""}`}
                size={40}
                strokeWidth={1.6}
                aria-hidden
              />
              <span className="nav-btn__label">
                <span className="nav-btn__title">{item.label}</span>
                {item.count != null ? <span className="nav-btn__count">{item.count}</span> : null}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar__foot">
        <DonateButton onClick={onDonate} />
        <SidebarFoldPriceWidget />
        <button
          type="button"
          className="theme-btn theme-btn--icon"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
        </button>
      </div>
    </aside>
  );
}
