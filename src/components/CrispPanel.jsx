import { useEffect, useMemo, useState } from "react";
import { CRISP_FILTER_META } from "../lib/icons";
import { Icon } from "./Icon";
import { etherscanTx, num, shortAddr } from "../lib/format";
import { EventDetailDrawer } from "./EventDetailDrawer";

const PAGE_SIZE = 40;

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

function formatWhenShort(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sepoliaTx(hash) {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}

function rowKey(e) {
  return `${e.txHash}-${e.logIndex}`;
}

function EventCards({ rows, showContract, txHref, onSelect, selectedKey }) {
  return (
    <ul className="event-cards">
      {rows.map((e) => {
        const key = rowKey(e);
        return (
          <li key={key}>
            <button
              type="button"
              className={`event-card event-card--btn${selectedKey === key ? " is-selected" : ""}`}
              onClick={() => onSelect(e)}
            >
              <div className="event-card__top">
                {showContract ? (
                  <span className="event-card__contract mono">{e.contract}</span>
                ) : null}
                <span className="event-card__meta mono">
                  #{num(e.blockNumber)} · {formatWhenShort(e.blockTimestamp)}
                </span>
              </div>
              <strong className="event-card__event">{e.event}</strong>
              <p className="event-card__args mono">{summarizeArgs(e.args)}</p>
              <a
                className="event-card__tx addr"
                href={txHref(e.txHash)}
                target="_blank"
                rel="noreferrer"
                onClick={(ev) => ev.stopPropagation()}
              >
                Tx {shortAddr(e.txHash)}
              </a>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Pagination({ page, pageCount, total, pageSize, onPage }) {
  if (pageCount <= 1) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="pager">
      <button
        type="button"
        className="pager__btn"
        disabled={page <= 0}
        onClick={() => onPage(page - 1)}
      >
        Prev
      </button>
      <span className="pager__label mono">
        {from}–{to} of {total}
      </span>
      <button
        type="button"
        className="pager__btn"
        disabled={page >= pageCount - 1}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

export function CrispPanel({
  events,
  network,
  programAddress,
  programDeployBlock,
  etherscan,
}) {
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);
  const list = events || [];

  const counts = useMemo(() => {
    const c = { all: list.length };
    for (const meta of CRISP_FILTER_META) {
      if (meta.id === "all") continue;
      c[meta.id] = list.filter((e) => e.contract === meta.id).length;
    }
    return c;
  }, [list]);

  const filtered = useMemo(
    () => (filter === "all" ? list : list.filter((e) => e.contract === filter)),
    [list, filter]
  );
  const showContract = filter === "all";
  const txHref = network === "sepolia" ? sepoliaTx : etherscanTx;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const drawerNetwork = network === "sepolia" ? "sepolia" : "mainnet";

  useEffect(() => {
    setPage(0);
    setSelected(null);
  }, [filter]);

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const pageRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const goPage = (p) => {
    setPage(p);
    setSelected(null);
    document.querySelector(".workspace")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectedKey = selected ? rowKey(selected) : null;

  return (
    <div className="events-panel">
      <div className="crisp-banner">
        <strong>Mainnet</strong>
        <span>
          Encrypted ballot (CRISP) on Ethereum mainnet — CRISPProgram, SelfRegistry, and InterFold
          E3 lifecycle from the CRISP deploy block
          {programDeployBlock ? ` #${num(programDeployBlock)}` : ""}.
          {programAddress ? (
            <>
              {" "}
              Program{" "}
              <a
                className="addr mono"
                href={etherscan || `https://etherscan.io/address/${programAddress}`}
                target="_blank"
                rel="noreferrer"
              >
                {shortAddr(programAddress)}
              </a>
            </>
          ) : null}
        </span>
      </div>

      <div className="event-filters" role="tablist" aria-label="CRISP contract filter">
        {CRISP_FILTER_META.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            className={`filter-chip filter-chip--icon ${filter === id ? "is-active" : ""}`}
            onClick={() => setFilter(id)}
          >
            <Icon icon={icon} size={16} strokeWidth={2} />
            <span>{label}</span>
            <span className="filter-chip__n">{counts[id] || 0}</span>
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div className="empty" style={{ marginTop: 12 }}>
          No CRISP events yet. Run SQL 005, then start the indexer against mainnet.
        </div>
      ) : (
        <>
          <p className="events-hint">Click a row for full decoded args.</p>
          <Pagination
            page={page}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPage={goPage}
          />
          <div className="table-wrap events-table-wrap events-desktop">
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
                {pageRows.map((e) => {
                  const key = rowKey(e);
                  return (
                    <tr
                      key={key}
                      className={`events-table__row${selectedKey === key ? " is-selected" : ""}`}
                      tabIndex={0}
                      onClick={() => setSelected(e)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" || ev.key === " ") {
                          ev.preventDefault();
                          setSelected(e);
                        }
                      }}
                    >
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
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          {shortAddr(e.txHash)}
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <EventCards
            rows={pageRows}
            showContract={showContract}
            txHref={txHref}
            onSelect={setSelected}
            selectedKey={selectedKey}
          />
          <Pagination
            page={page}
            pageCount={pageCount}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPage={goPage}
          />
        </>
      )}

      <EventDetailDrawer
        event={selected}
        onClose={() => setSelected(null)}
        network={drawerNetwork}
      />
    </div>
  );
}
