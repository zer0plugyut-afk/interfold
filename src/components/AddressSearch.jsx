import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { etherscanAddress, etherscanTx, num, shortAddr } from "../lib/format";
import { searchAddressActivity } from "../lib/supabaseData";

function normalizeQuery(raw) {
  const q = String(raw || "").trim();
  if (!q) return "";
  return q.startsWith("0x") ? q : `0x${q}`;
}

function looksLikeAddress(q) {
  return /^0x[a-fA-F0-9]{6,40}$/.test(q);
}

function summarizeArgs(args) {
  if (!args || typeof args !== "object") return "—";
  const entries = Object.entries(args)
    .filter(([k]) => k !== "encryptedVote")
    .slice(0, 4);
  if (!entries.length) return "—";
  return entries.map(([k, v]) => `${k}=${String(v).slice(0, 28)}`).join(" · ");
}

export function AddressSearch({ boardData, onOpenResults, active }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e?.preventDefault?.();
    const q = normalizeQuery(value);
    if (!looksLikeAddress(q)) {
      setErr("Paste a 0x address (at least 6 hex chars).");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const results = await searchAddressActivity(q, boardData);
      onOpenResults({ query: q, ...results });
    } catch (ex) {
      setErr(ex.message || String(ex));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={`addr-search${active ? " is-active" : ""}`} onSubmit={submit}>
      <Search size={14} className="addr-search__icon" aria-hidden />
      <input
        className="addr-search__input"
        type="search"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setErr(null);
        }}
        placeholder="Search address…"
        aria-label="Search address activity"
        autoComplete="off"
        spellCheck={false}
      />
      {value ? (
        <button
          type="button"
          className="addr-search__clear"
          aria-label="Clear"
          onClick={() => {
            setValue("");
            setErr(null);
          }}
        >
          <X size={14} />
        </button>
      ) : null}
      <button type="submit" className="addr-search__go" disabled={busy}>
        {busy ? "…" : "Go"}
      </button>
      {err ? <p className="addr-search__err">{err}</p> : null}
    </form>
  );
}

export function AddressSearchResults({ payload, onClose }) {
  const { query, operators, events, crispEvents } = payload || {};
  const total =
    (operators?.length || 0) + (events?.length || 0) + (crispEvents?.length || 0);

  const title = useMemo(() => shortAddr(query), [query]);

  return (
    <section className="panel is-active panel--fill search-results">
      <div className="section-head section-head--row">
        <div>
          <h2>Address activity</h2>
          <p>
            Matches for{" "}
            <a className="addr" href={etherscanAddress(query)} target="_blank" rel="noreferrer">
              {title}
            </a>{" "}
            across operators, mainnet events, and CRISP (Sepolia).
          </p>
        </div>
        <button type="button" className="theme-btn" onClick={onClose}>
          Close
        </button>
      </div>

      <p className="search-results__sum mono">
        {total} hit{total === 1 ? "" : "s"} · operators {operators?.length || 0} · events{" "}
        {events?.length || 0} · crisp {crispEvents?.length || 0}
      </p>

      {!total ? (
        <div className="empty">No activity found for this address in indexed data.</div>
      ) : (
        <div className="search-results__cols">
          {operators?.length ? (
            <div className="search-block">
              <h3>Operators</h3>
              <ul className="event-cards">
                {operators.map((o) => (
                  <li key={o.address} className="event-card">
                    <strong className="event-card__event">
                      <a
                        className="addr"
                        href={etherscanAddress(o.address)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {shortAddr(o.address)}
                      </a>
                    </strong>
                    <p className="event-card__args mono">
                      bondOwner={shortAddr(o.bondOwner)} · bonded {num(o.ciphernodeBond)} FOLD ·
                      tickets {o.availableTickets} ·{" "}
                      {o.isActive ? "active" : o.isRegistered ? "registered" : "inactive"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {events?.length ? (
            <div className="search-block">
              <h3>Mainnet events</h3>
              <ul className="event-cards">
                {events.map((e) => (
                  <li key={`${e.txHash}-${e.logIndex}`} className="event-card">
                    <div className="event-card__top">
                      <span className="event-card__contract mono">{e.contract}</span>
                      <span className="event-card__meta mono">#{num(e.blockNumber)}</span>
                    </div>
                    <strong className="event-card__event">{e.event}</strong>
                    <p className="event-card__args mono">{summarizeArgs(e.args)}</p>
                    <a
                      className="event-card__tx addr"
                      href={etherscanTx(e.txHash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Tx {shortAddr(e.txHash)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {crispEvents?.length ? (
            <div className="search-block">
              <h3>CRISP (Sepolia)</h3>
              <ul className="event-cards">
                {crispEvents.map((e) => (
                  <li key={`${e.txHash}-${e.logIndex}`} className="event-card">
                    <div className="event-card__top">
                      <span className="event-card__contract mono">{e.contract}</span>
                      <span className="event-card__meta mono">#{num(e.blockNumber)}</span>
                    </div>
                    <strong className="event-card__event">{e.event}</strong>
                    <p className="event-card__args mono">{summarizeArgs(e.args)}</p>
                    <a
                      className="event-card__tx addr"
                      href={`https://sepolia.etherscan.io/tx/${e.txHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Tx {shortAddr(e.txHash)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
