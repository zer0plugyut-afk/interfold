import { CONTRACT_FILTER_META } from "../lib/icons";
import { etherscanTx, num, shortAddr } from "../lib/format";

function summarizeArgs(args) {
  if (!args || typeof args !== "object") return "—";
  const entries = Object.entries(args).slice(0, 4);
  if (!entries.length) return "—";
  return entries.map(([k, v]) => `${k}=${String(v).slice(0, 36)}`).join(" · ");
}

function formatWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function EventTimeline({ timeline, filter, onFilterChange }) {
  const counts = { all: timeline.length };
  for (const meta of CONTRACT_FILTER_META) {
    if (meta.id === "all") continue;
    counts[meta.id] = timeline.filter((e) => e.contract === meta.id).length;
  }

  const filtered = filter === "all" ? timeline : timeline.filter((e) => e.contract === filter);
  const showContractCol = filter === "all";

  return (
    <div className="events-panel">
      <div className="event-filters">
        {CONTRACT_FILTER_META.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`filter-chip filter-chip--icon ${filter === id ? "is-active" : ""}`}
            onClick={() => onFilterChange(id)}
          >
            <Icon size={16} strokeWidth={2} />
            <span>{label}</span>
            <span className="filter-chip__n">{counts[id] || 0}</span>
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div className="empty" style={{ marginTop: 12 }}>
          No events for this filter.
        </div>
      ) : (
        <div className="table-wrap events-table-wrap">
          <table className="events-table">
            <thead>
              <tr>
                {showContractCol ? <th>Contract</th> : null}
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
                  {showContractCol ? (
                    <td className="mono events-table__contract">{e.contract}</td>
                  ) : null}
                  <td className="mono">{num(e.blockNumber)}</td>
                  <td className="events-table__event">{e.event}</td>
                  <td className="events-table__args mono">{summarizeArgs(e.args)}</td>
                  <td className="mono events-table__time">{formatWhen(e.blockTimestamp)}</td>
                  <td>
                    <a
                      className="addr"
                      href={etherscanTx(e.txHash)}
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
