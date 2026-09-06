import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ExternalLink, Network, X } from "lucide-react";
import { shortAddr } from "../lib/format";
import { useEnsNames } from "../hooks/useEnsNames";

const KEYWORDS = [
  { label: "Confidential coordination", href: "https://docs.theinterfold.com/constitution" },
  { label: "Encrypted Execution (E3)", href: "https://docs.theinterfold.com/introduction" },
  { label: "Ciphernodes", href: "https://docs.theinterfold.com/ciphernode-operators" },
  { label: "Sortition", href: "https://docs.theinterfold.com/constitution" },
  { label: "FHE", href: "https://docs.theinterfold.com/cryptography" },
  { label: "Zero-knowledge proofs", href: "https://docs.theinterfold.com/cryptography" },
  { label: "Threshold decryption", href: "https://docs.theinterfold.com/cryptography" },
  { label: "No custody", href: "https://docs.theinterfold.com/introduction" },
  { label: "Private inputs", href: "https://docs.theinterfold.com/introduction" },
  { label: "Verifiable outcomes", href: "https://docs.theinterfold.com/introduction" },
];

const RING = { active: 33, reg: 23.5, exit: 40.5, idle: 28 };

function nodeKind(o) {
  if (o.hasExitInProgress) return "exit";
  if (o.isActive) return "active";
  if (o.isRegistered) return "reg";
  return "idle";
}

function kindClass(kind) {
  if (kind === "exit") return " is-exit";
  if (kind === "active") return " is-active";
  if (kind === "reg") return " is-reg";
  return "";
}

/**
 * Full-screen visualization of bonded ciphernodes around confidential coordination.
 * @param {{ operators: object[], onClose: () => void }} props
 */
export function OperatorNetworkViz({ operators, onClose }) {
  const titleId = useId();
  const uid = useId().replace(/:/g, "");
  const [mounted, setMounted] = useState(false);
  const [focus, setFocus] = useState(null);
  const closeTimer = useRef(null);

  const addresses = useMemo(
    () => (operators || []).flatMap((o) => [o.address, o.bondOwner].filter(Boolean)),
    [operators]
  );
  const ens = useEnsNames(addresses);

  const nodes = useMemo(() => {
    const list = [...(operators || [])].sort(
      (a, b) => Number(b.availableTickets || 0) - Number(a.availableTickets || 0)
    );
    const byKind = { active: [], exit: [], reg: [], idle: [] };
    for (const o of list) byKind[nodeKind(o)].push(o);

    const placed = [];
    for (const [kind, ring] of Object.entries(RING)) {
      const group = byKind[kind];
      const n = group.length || 1;
      const offset = kind === "active" ? -Math.PI / 2 : kind === "exit" ? 0.35 : 0.8;
      group.forEach((o, i) => {
        const angle = (Math.PI * 2 * i) / n + offset;
        const share = Math.max(0, Number(o.ticketSharePct) || 0);
        const r = 3.6 + Math.min(2.8, share / 9);
        placed.push({
          ...o,
          kind,
          angle,
          ring,
          x: 50 + Math.cos(angle) * ring,
          y: 50 + Math.sin(angle) * ring,
          r,
          delay: `${(placed.length % 12) * 0.22}s`,
          flowDur: `${4.2 + (i % 5) * 0.55}s`,
          pulseDur: `${4.8 + (i % 4) * 0.7}s`,
          label: ens[String(o.address || "").toLowerCase()] || shortAddr(o.address),
        });
      });
    }
    return placed;
  }, [operators, ens]);

  const counts = useMemo(
    () => ({
      all: nodes.length,
      active: nodes.filter((n) => n.kind === "active").length,
      reg: nodes.filter((n) => n.kind === "reg").length,
      exit: nodes.filter((n) => n.kind === "exit").length,
    }),
    [nodes]
  );

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close on escape only
  }, []);

  function requestClose() {
    setMounted(false);
    closeTimer.current = setTimeout(onClose, 220);
  }

  const focusing = Boolean(focus);

  return (
    <div className={`op-viz-root${mounted ? " is-open" : ""}`} role="presentation">
      <button
        type="button"
        className="op-viz-backdrop"
        aria-label="Close visualization"
        onClick={requestClose}
      />
      <aside className="op-viz-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="op-viz-head">
          <div>
            <p className="op-viz-kicker mono">Ciphernode network</p>
            <h2 id={titleId}>Confidential coordination</h2>
            <p className="op-viz-lede">
              Bonded node runners form committees via sortition to run Encrypted Execution
              Environments — private inputs, threshold decryption, publicly verifiable
              outcomes. No custody of plaintext.
            </p>
          </div>
          <button type="button" className="op-viz-close" onClick={requestClose} aria-label="Close">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="op-viz-stats mono" aria-label="Network status">
          <span>{counts.all} runners</span>
          <span className="op-viz-stats--active">{counts.active} active</span>
          <span className="op-viz-stats--reg">{counts.reg} registered</span>
          {counts.exit ? <span className="op-viz-stats--exit">{counts.exit} exiting</span> : null}
        </div>

        <div className="op-viz-stage">
          <div className="op-viz-map">
            <svg
              className={`op-viz-svg${focusing ? " is-focusing" : ""}`}
              viewBox="0 0 100 100"
              role="img"
              aria-label="Operator network map"
            >
              <defs>
                <radialGradient id={`${uid}-core`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.42" />
                  <stop offset="55%" stopColor="var(--ok)" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="transparent" stopOpacity="0" />
                </radialGradient>
                <filter id={`${uid}-soft`} x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="0.55" />
                </filter>
              </defs>

              <circle
                className="op-viz-core-glow"
                cx="50"
                cy="50"
                r="17"
                fill={`url(#${uid}-core)`}
              />
              <circle className="op-viz-core" cx="50" cy="50" r="7.5" />
              <text className="op-viz-core-label" x="50" y="49.2" textAnchor="middle">
                E3
              </text>
              <text className="op-viz-core-sub" x="50" y="54.2" textAnchor="middle">
                encrypted
              </text>

              {nodes.map((n, i) => {
                const focused = focus === n.address;
                const cls = kindClass(n.kind);
                return (
                  <g
                    key={n.address}
                    className={`op-viz-node-g${cls}${focused ? " is-focus" : ""}`}
                    style={{
                      "--i": i,
                      "--delay": n.delay,
                      "--flow": n.flowDur,
                      "--pulse": n.pulseDur,
                    }}
                    onMouseEnter={() => setFocus(n.address)}
                    onMouseLeave={() => setFocus(null)}
                  >
                    <line
                      className={`op-viz-spoke${cls}`}
                      x1="50"
                      y1="50"
                      x2={n.x}
                      y2={n.y}
                    />
                    {n.kind === "active" || n.kind === "exit" ? (
                      <line
                        className={`op-viz-flow${cls}`}
                        x1="50"
                        y1="50"
                        x2={n.x}
                        y2={n.y}
                      />
                    ) : null}
                    <circle
                      className={`op-viz-halo${cls}`}
                      cx={n.x}
                      cy={n.y}
                      r={n.r + 2.4}
                      filter={`url(#${uid}-soft)`}
                    />
                    <circle
                      className={`op-viz-node${cls}`}
                      cx={n.x}
                      cy={n.y}
                      r={n.r}
                    >
                      <title>
                        {n.label}
                        {"\n"}
                        {n.address}
                        {"\n"}
                        {numTickets(n)} · {Number(n.ticketSharePct || 0).toFixed(1)}% sortition
                        {n.kind === "exit" ? " · exit pending" : ""}
                      </title>
                    </circle>
                  </g>
                );
              })}
            </svg>

            <ul className="op-viz-key" aria-label="Node status key">
              <li className="is-active">Active — coordinating</li>
              <li className="is-reg">Registered — standing by</li>
              <li className="is-exit">Exiting — unlock delay</li>
            </ul>
          </div>

          <ul className="op-viz-legend">
            {nodes.map((n) => (
              <li
                key={n.address}
                className={`op-viz-legend__item${kindClass(n.kind)}${focus === n.address ? " is-focus" : ""}`}
                onMouseEnter={() => setFocus(n.address)}
                onMouseLeave={() => setFocus(null)}
              >
                <span className="op-viz-legend__dot" aria-hidden />
                <span className="op-viz-legend__name">{n.label}</span>
                <span className="op-viz-legend__meta mono">
                  {n.kind === "exit" ? "exit · " : n.kind === "reg" ? "standby · " : ""}
                  {numTickets(n)} · {Number(n.ticketSharePct || 0).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="op-viz-keywords">
          {KEYWORDS.map((k) => (
            <a
              key={k.label}
              className="op-viz-chip"
              href={k.href}
              target="_blank"
              rel="noreferrer"
            >
              {k.label}
            </a>
          ))}
        </div>

        <footer className="op-viz-foot">
          <a
            className="op-viz-docs"
            href="https://docs.theinterfold.com/"
            target="_blank"
            rel="noreferrer"
          >
            docs.theinterfold.com <ExternalLink size={12} aria-hidden />
          </a>
        </footer>
      </aside>
    </div>
  );
}

function numTickets(o) {
  const t = Number(o.availableTickets) || 0;
  return `${t} ${t === 1 ? "ticket" : "tickets"}`;
}

export function VisualizeNetworkButton({ onClick }) {
  return (
    <button type="button" className="op-viz-btn" onClick={onClick}>
      <Network size={15} aria-hidden />
      Visualize network
    </button>
  );
}
