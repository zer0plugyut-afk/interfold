import { NAV_ICONS } from "../lib/icons";
import { SidebarFoldPriceWidget } from "./SidebarFoldPriceWidget";

export function Sidebar({ panel, onNavigate, counts, onToggleTheme }) {
  const items = [
    { id: "operators", label: "Operators", count: counts.operators },
    { id: "events", label: "Events", count: counts.events },
    { id: "charts", label: "Charts", count: null },
    { id: "tokenomics", label: "Tokenomics", count: null },
    { id: "crisp", label: "CRISP", count: counts.crisp, tag: "Sepolia" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="brand__mark">IF</span>
        <div>
          <p className="brand__kicker">Community board</p>
          <strong>InterFold</strong>
        </div>
      </div>

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
                {item.tag ? <span className="nav-btn__tag">{item.tag}</span> : null}
                {item.count != null ? <span className="nav-btn__count">{item.count}</span> : null}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar__foot">
        <SidebarFoldPriceWidget />
        <button type="button" className="theme-btn" onClick={onToggleTheme}>
          Theme
        </button>
      </div>
    </aside>
  );
}
