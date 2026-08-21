import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { etherscanAddress, etherscanTx, num, shortAddr } from "../lib/format";
import { searchAddressActivity } from "../lib/supabaseData";
import { EventDetailDrawer } from "./EventDetailDrawer";
import { FoldIcon } from "./FoldIcon";
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
    .slice(0, 5);
  if (!entries.length) return "—";
  return entries.map(([k, v]) => `${k}=${String(v).slice(0, 40)}`).join(" · ");
}

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
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
  const [selected, setSelected] = useState(null);
  const [drawerNetwork, setDrawerNetwork] = useState("mainnet");
  const total =
    (operators?.length || 0) + (events?.length || 0) + (crispEvents?.length || 0);

  const title = useMemo(() => shortAddr(query), [query]);

  const openEvent = (e, network) => {
    setDrawerNetwork(network);
    setSelected(e);
  };

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
            across operators, mainnet events, and CRISP (Sepolia). Click an event for full args.
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
              <div className="search-table-wrap">
                <table className="search-table">
                  <thead>
                    <tr>
                      <th>Operator</th>
                      <th>Bond owner</th>
                      <th>Bonded</th>
                      <th>Tickets</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operators.map((o) => (
                      <tr key={o.address}>
                        <td>
                          <a
                            className="addr"
                            href={etherscanAddress(o.address)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shortAddr(o.address)}
                          </a>
                        </td>
                        <td className="mono">
                          <a
                            className="addr"
                            href={etherscanAddress(o.bondOwner)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {shortAddr(o.bondOwner)}
                          </a>
                        </td>
                        <td className="mono">
                          <span className="search-fold">
                            <FoldIcon size={16} />
                            {num(o.ciphernodeBond)} FOLD
                          </span>
                        </td>
                        <td className="mono">{o.availableTickets}</td>
                        <td>
                          {o.isActive ? "active" : o.isRegistered ? "registered" : "inactive"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="search-hit-list">
                {operators.map((o) => (
                  <li key={`m-${o.address}`} className="search-hit">
                    <a
                      className="addr"
                      href={etherscanAddress(o.address)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {shortAddr(o.address)}
                    </a>
                    <p className="search-hit__meta mono">
                      <span className="search-fold">
                        <FoldIcon size={14} />
                        {num(o.ciphernodeBond)} FOLD
                      </span>
                      {" · "}
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
              <div className="search-table-wrap">
                <table className="search-table">
                  <thead>
                    <tr>
                      <th>Contract</th>
                      <th>Event</th>
                      <th>Block</th>
                      <th>Details</th>
                      <th>Time</th>
                      <th>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => (
                      <tr
                        key={`${e.txHash}-${e.logIndex}`}
                        className="events-table__row"
                        tabIndex={0}
                        onClick={() => openEvent(e, "mainnet")}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            openEvent(e, "mainnet");
                          }
                        }}
                      >
                        <td className="mono search-table__contract">{e.contract}</td>
                        <td className="search-table__event">{e.event}</td>
                        <td className="mono">{num(e.blockNumber)}</td>
                        <td className="mono search-table__args">{summarizeArgs(e.args)}</td>
                        <td className="mono">{formatWhen(e.blockTimestamp)}</td>
                        <td>
                          <a
                            className="addr"
                            href={etherscanTx(e.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            {shortAddr(e.txHash)}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="search-hit-list">
                {events.map((e) => (
                  <li key={`m-${e.txHash}-${e.logIndex}`}>
                    <button
                      type="button"
                      className="search-hit search-hit--btn"
                      onClick={() => openEvent(e, "mainnet")}
                    >
                      <div className="search-hit__top">
                        <span className="search-hit__contract mono">{e.contract}</span>
                        <span className="search-hit__block mono">#{num(e.blockNumber)}</span>
                      </div>
                      <strong className="search-hit__event">{e.event}</strong>
                      <p className="search-hit__args mono">{summarizeArgs(e.args)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {crispEvents?.length ? (
            <div className="search-block">
              <h3>CRISP (Sepolia)</h3>
              <div className="search-table-wrap">
                <table className="search-table">
                  <thead>
                    <tr>
                      <th>Contract</th>
                      <th>Event</th>
                      <th>Block</th>
                      <th>Details</th>
                      <th>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crispEvents.map((e) => (
                      <tr
                        key={`${e.txHash}-${e.logIndex}`}
                        className="events-table__row"
                        tabIndex={0}
                        onClick={() => openEvent(e, "sepolia")}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault();
                            openEvent(e, "sepolia");
                          }
                        }}
                      >
                        <td className="mono search-table__contract">{e.contract}</td>
                        <td className="search-table__event">{e.event}</td>
                        <td className="mono">{num(e.blockNumber)}</td>
                        <td className="mono search-table__args">{summarizeArgs(e.args)}</td>
                        <td>
                          <a
                            className="addr"
                            href={`https://sepolia.etherscan.io/tx/${e.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            {shortAddr(e.txHash)}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="search-hit-list">
                {crispEvents.map((e) => (
                  <li key={`m-${e.txHash}-${e.logIndex}`}>
                    <button
                      type="button"
                      className="search-hit search-hit--btn"
                      onClick={() => openEvent(e, "sepolia")}
                    >
                      <div className="search-hit__top">
                        <span className="search-hit__contract mono">{e.contract}</span>
                        <span className="search-hit__block mono">#{num(e.blockNumber)}</span>
                      </div>
                      <strong className="search-hit__event">{e.event}</strong>
                      <p className="search-hit__args mono">{summarizeArgs(e.args)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <EventDetailDrawer
        event={selected}
        onClose={() => setSelected(null)}
        network={drawerNetwork}
      />
    </section>
  );
}