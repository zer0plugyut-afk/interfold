import { useState } from "react";
import { CRISP_FILTER_META } from "../lib/icons";
import { etherscanTx, num, shortAddr } from "../lib/format";

function summarizeArgs(args) {
  if (!args || typeof args !== "object") return "—";
  const entries = Object.entries(args)
    .filter(([k]) => k !== "encryptedVote")
    .slice(0, 4);
  if (!entries.length) return "—";
  return entries.map(([k, v]) => `${k}=${String(v).slice(0, 36)}`).join(" · ");
}

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function sepoliaTx(hash) {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}

export function CrispPanel({ events, network }) {
  const [filter, setFilter] = useState("all");
  const list = events || [];
  const counts = { all: list.length };
  for (const meta of CRISP_FILTER_META) {
    if (meta.id === "all") continue;
    counts[meta.id] = list.filter((e) => e.contract === meta.id).length;
  }
  const filtered = filter === "all" ? list : list.filter((e) => e.contract === filter);
  const showContract = filter === "all";
  const txHref = network === "mainnet" ? etherscanTx : sepoliaTx;

  return (
    <div className="events-panel">
      <div className="crisp-banner">
        <strong>{network === "mainnet" ? "Mainnet" : "Sepolia"}</strong>
        <span>
          Encrypted ballot (CRISP) demo data. When production CRISP ships on mainnet, wipe Sepolia
          rows and point the indexer env at the new contract.
        </span>
      </div>

      <div className="event-filters">
        {CRISP_FILTER_META.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`filter-chip filter-chip--icon ${filter ===id ? "is-active" : ""}`}
            onClick={() => setFilter(id)}
          >
            <Icon size={16} strokeWidth={2} />
            <span>{label}</span>
            <span className="filter-chip__n">{counts[id] || 0}</span>
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div className="empty" style={{ marginTop: 12 }}>
          No CRISP events yet (indexer needs CRISP_RPC_URL + migration 004).
        </div>
      ) : (
        <div className="table-wrap events-table-wrap">
          <table className="events-table">
            <thead>
              <tr>
                {showContract ? <th>Contract</th> : null}
                <th>Block</th>
                <th>Event</th>
                <th>Details</th>
                <th>Time</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={`${e.txHash}-${e.logIndex}`}>
                  {showContract ? (
                    <td className="mono events-table__contract">{e.contract}</td>
                  ) : null}
                  <td className="mono">{num(e.blockNumber)}</td>
                  <td className="events-table__event">{e.event}</td>
                  <td className="events-table__args mono">{summarizeArgs(e.args)}</td>
                  <td className="mono events-table__time">{formatWhen(e.blockTimestamp)}</td>
                  <td>
                    <a
                      className="addr"
                      href={txHref(e.txHash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {shortAddr(e.txHash)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
