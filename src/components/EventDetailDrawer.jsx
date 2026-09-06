import { useEffect, useId, useRef, useState } from "react";
import { Cancel01Icon, Copy01Icon, LinkSquare01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import { etherscanAddress, etherscanTx, num, shortAddr } from "../lib/format";
import { formatUnlockAt, formatUnlockCountdown } from "../lib/timeFormat";

const HEX_ADDR = /^0x[a-fA-F0-9]{40}$/;
const HEX_LONG = /^0x[a-fA-F0-9]{66,}$/;
const MORPH_MS = 430;

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
      {ok ? <Icon icon={Tick02Icon} size={13} /> : <Icon icon={Copy01Icon} size={13} />}
    </button>
  );
}

function UnlockAtValue({ value }) {
  const text = stringifyValue(value);
  const when = formatUnlockAt(value);
  const countdown = formatUnlockCountdown(value);
  return (
    <div className="drawer-arg__val">
      <div className="drawer-arg__tools">
        <CopyBtn text={text} />
      </div>
      <code className="drawer-arg__short mono">{text}</code>
      {when || countdown ? (
        <div className="drawer-arg__unlock mono">
          {when ? <span>{when}</span> : null}
          {countdown ? <span className="drawer-arg__countdown">{countdown}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function ArgValue({ value, sepolia, argKey }) {
  if (argKey === "unlockAt" || argKey?.endsWith(".unlockAt")) {
    return <UnlockAtValue value={value} />;
  }

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
 * Open/close uses a clip-path morph.
 * @param {{ event: object|null, onClose: () => void, network?: 'mainnet'|'sepolia' }} props
 */
export function EventDetailDrawer({ event, onClose, network = "mainnet" }) {
  const titleId = useId();
  const sepolia = network === "sepolia";
  const closeTimer = useRef(null);
  const [mounted, setMounted] = useState(Boolean(event));
  const [state, setState] = useState(event ? "open" : "closed");
  const [displayEvent, setDisplayEvent] = useState(event);

  useEffect(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    if (event) {
      setDisplayEvent(event);
      setMounted(true);
      // Next frame so closed → open clip-path transition runs
      const raf = requestAnimationFrame(() => setState("open"));
      return () => cancelAnimationFrame(raf);
    }

    if (mounted) {
      setState("closing");
      closeTimer.current = setTimeout(() => {
        setMounted(false);
        setState("closed");
        setDisplayEvent(null);
        closeTimer.current = null;
      }, MORPH_MS);
    }

    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [event]); // eslint-disable-line react-hooks/exhaustive-deps -- mount driven by event presence

  useEffect(() => {
    if (state !== "open") return undefined;
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
  }, [state, onClose]);

  if (!mounted || !displayEvent) return null;

  const open = state === "open";
  const txHref = sepolia
    ? `https://sepolia.etherscan.io/tx/${displayEvent.txHash}`
    : etherscanTx(displayEvent.txHash);
  const argRows = flattenArgs(displayEvent.args || {});

  return (
    <div
      className="drawer-root"
      data-state={open ? "open" : "closing"}
      role="presentation"
    >
      <button
        type="button"
        className="drawer-backdrop"
        aria-label="Close details"
        onClick={onClose}
      />
      <aside
        className="drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="drawer-head">
          <div className="drawer-head__text">
            <p className="drawer-kicker mono">{displayEvent.contract}</p>
            <h2 id={titleId}>{displayEvent.event}</h2>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Close">
            <Icon icon={Cancel01Icon} size={18} />
          </button>
        </header>

        <div className="drawer-body">
          <section className="drawer-meta">
            <div className="drawer-meta__row">
              <span>Block</span>
              <strong className="mono">{num(displayEvent.blockNumber)}</strong>
            </div>
            <div className="drawer-meta__row">
              <span>Log index</span>
              <strong className="mono">{displayEvent.logIndex ?? "—"}</strong>
            </div>
            <div className="drawer-meta__row">
              <span>Time</span>
              <strong className="mono">{formatWhen(displayEvent.blockTimestamp)}</strong>
            </div>
            <div className="drawer-meta__row">
              <span>Tx</span>
              <strong className="drawer-meta__tx">
                <a className="addr" href={txHref} target="_blank" rel="noreferrer">
                  {shortAddr(displayEvent.txHash)} <Icon icon={LinkSquare01Icon} size={12} />
                </a>
                <CopyBtn text={displayEvent.txHash || ""} />
              </strong>
            </div>
            {displayEvent.network ? (
              <div className="drawer-meta__row">
                <span>Network</span>
                <strong className="mono">{displayEvent.network}</strong>
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
                    <ArgValue value={value} sepolia={sepolia} argKey={key} />
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
