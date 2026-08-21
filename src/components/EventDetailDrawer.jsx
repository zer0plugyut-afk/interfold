import { useEffect, useId, useState } from "react";
import { Copy, Check, ExternalLink, X } from "lucide-react";
import { etherscanAddress, etherscanTx, num, shortAddr } from "../lib/format";

const PREVIEW_LEN = 28;
const HEX_ADDR = /^0x[a-fA-F0-9]{40}$/;
const HEX_LONG = /^0x[a-fA-F0-9]{66,}$/;

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function stringifyValue(v) {
  if (v == null) return "null";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean" || typeof v === "bigint") return String(v);
  try {
    return JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x), 2);
  } catch {
    return String(v);
  }
}

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="drawer-copy"
      title="Copy"
      aria-label="Copy value"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        } catch {
          /* ignore */
        }
      }}
    >
      {ok ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
    </button>
  );
}

function ArgValue({ value, sepolia }) {
  const text = stringifyValue(value);
  const addrHref = (a) =>
    sepolia ? `https://sepolia.etherscan.io/address/${a}` : etherscanAddress(a);

  if (typeof value === "string" && HEX_ADDR.test(value)) {
    return (
      <div className="drawer-arg__val">
        <div className="drawer-arg__addr">
          <a className="addr" href={addrHref(value)} target="_blank" rel="noreferrer">
            {shortAddr(value)}
          </a>
          <CopyBtn text={value} />
        </div>
        <code className="drawer-arg__blob mono">{value}</code>
      </div>
    );
  }

  if (Array.isArray(value) || isPlainObject(value)) {
    return (
      <div className="drawer-arg__val">
        <div className="drawer-arg__tools">
          <CopyBtn text={text} />
        </div>
        <pre className="drawer-arg__json mono">{text}</pre>
      </div>
    );
  }

  // Long hex, long decimals, or any long scalar — wrap inside the card
  if (text.length > 28 || HEX_LONG.test(text)) {
    return (
      <div className="drawer-arg__val">
        <div className="drawer-arg__tools">
          <CopyBtn text={text} />
        </div>
        <code className="drawer-arg__blob mono">{text}</code>
      </div>
    );
  }

  return (
    <div className="drawer-arg__val drawer-arg__val--inline">
      <code className="drawer-arg__short mono">{text}</code>
      <CopyBtn text={text} />
    </div>
  );
}

function flattenArgs(args, prefix = "") {
  if (!isPlainObject(args)) return [];
  const rows = [];
  for (const [k, v] of Object.entries(args)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v) && !Array.isArray(v)) {
      rows.push(...flattenArgs(v, key));
    } else {
      rows.push({ key, value: v });
    }
  }
  return rows;
}

/**
 * Right-side detail drawer for an indexed event row.
 * @param {{ event: object|null, onClose: () => void, network?: 'mainnet'|'sepolia' }} props
 */
export function EventDetailDrawer({ event, onClose, network = "mainnet" }) {
  const titleId = useId();
  const open = Boolean(event);
  const sepolia = network === "sepolia";
  const txHref = sepolia
    ? `https://sepolia.etherscan.io/tx/${event?.txHash}`
    : etherscanTx(event?.txHash);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const argRows = flattenArgs(event.args || {});

  return (
    <div className="drawer-root" role="presentation">
      <button type="button" className="drawer-backdrop" aria-label="Close details" onClick={onClose} />
      <aside
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="drawer-head">
          <div className="drawer-head__text">
            <p className="drawer-kicker mono">{event.contract}</p>
            <h2 id={titleId}>{event.event}</h2>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="drawer-body">
          <section className="drawer-meta">
            <div className="drawer-meta__row">
              <span>Block</span>
              <strong className="mono">{num(event.blockNumber)}</strong>
            </div>
            <div className="drawer-meta__row">
              <span>Log index</span>
              <strong className="mono">{event.logIndex ?? "—"}</strong>
            </div>
            <div className="drawer-meta__row">
              <span>Time</span>
              <strong className="mono">{formatWhen(event.blockTimestamp)}</strong>
            </div>
            <div className="drawer-meta__row">
              <span>Tx</span>
              <strong className="drawer-meta__tx">
                <a className="addr" href={txHref} target="_blank" rel="noreferrer">
                  {shortAddr(event.txHash)} <ExternalLink size={12} aria-hidden />
                </a>
                <CopyBtn text={event.txHash || ""} />
              </strong>
            </div>
            {event.network ? (
              <div className="drawer-meta__row">
                <span>Network</span>
                <strong className="mono">{event.network}</strong>
              </div>
            ) : null}
          </section>

          <section className="drawer-args">
            <h3>Decoded args</h3>
            {!argRows.length ? (
              <p className="drawer-empty">No args stored for this log.</p>
            ) : (
              <ul className="drawer-arg-list">
                {argRows.map(({ key, value }) => (
                  <li key={key} className="drawer-arg">
                    <span className="drawer-arg__key mono">{key}</span>
                    <ArgValue value={value} sepolia={sepolia} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
