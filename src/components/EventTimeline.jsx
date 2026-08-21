import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CONTRACT_FILTER_META } from "../lib/icons";
import {
  countByPhase,
  eventMatchesPhase,
  phasesForContract,
} from "../lib/eventPhaseFilters";
import { etherscanTx, num, shortAddr } from "../lib/format";
import { EventDetailDrawer } from "./EventDetailDrawer";

const PAGE_SIZE = 40;

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

const CONNECTOR_RADIUS = 10;

/** Path from parent chip bottom-center → active sub-chip edge (passes behind inactive pills). */
function buildConnectorPath(rootBox, parentBox, childBox) {
  const fromX = parentBox.left + parentBox.width / 2 - rootBox.left;
  const fromY = parentBox.bottom - rootBox.top;
  const midY = childBox.top + childBox.height / 2 - rootBox.top;
  const childLeft = childBox.left - rootBox.left;
  const childRight = childBox.right - rootBox.left;
  const childMid = childLeft + childBox.width / 2;
  const r = CONNECTOR_RADIUS;

  // Nearly under the parent: drop into the top of the chip
  if (Math.abs(childMid - fromX) <= r + 6) {
    const toY = childBox.top - rootBox.top;
    return `M ${fromX.toFixed(1)} ${fromY.toFixed(1)} L ${fromX.toFixed(1)} ${toY.toFixed(1)}`;
  }

  const goRight = childMid >= fromX;
  const toX = goRight ? childLeft : childRight;
  const turnY = midY - r;
  const qx = goRight ? fromX + r : fromX - r;

  if (turnY <= fromY + 2) {
    // Not enough room for a full elbow — horizontal at midY with a tight bend
    return [
      `M ${fromX.toFixed(1)} ${fromY.toFixed(1)}`,
      `L ${fromX.toFixed(1)} ${midY.toFixed(1)}`,
      `L ${toX.toFixed(1)} ${midY.toFixed(1)}`,
    ].join(" ");
  }

  return [
    `M ${fromX.toFixed(1)} ${fromY.toFixed(1)}`,
    `L ${fromX.toFixed(1)} ${turnY.toFixed(1)}`,
    `Q ${fromX.toFixed(1)} ${midY.toFixed(1)} ${qx.toFixed(1)} ${midY.toFixed(1)}`,
    `L ${toX.toFixed(1)} ${midY.toFixed(1)}`,
  ].join(" ");
}

/** hl.eco-style primary + connected phase sub-tabs (UI-only). */
function TreeEventFilters({ contract, phase, onContractChange, onPhaseChange, contractCounts, phaseCounts }) {
  const rootRef = useRef(null);
  const parentRowRef = useRef(null);
  const parentActiveRef = useRef(null);
  const subRowRef = useRef(null);
  const subActiveRef = useRef(null);
  const [connector, setConnector] = useState({ d: "", w: 0, h: 0, branchX: 0 });
  const phases = phasesForContract(contract);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const parentRow = parentRowRef.current;
    const subRow = subRowRef.current;

    const measure = () => {
      if (!root || !parentActiveRef.current || !phases) {
        setConnector({ d: "", w: 0, h: 0, branchX: 0 });
        return;
      }
      const rootBox = root.getBoundingClientRect();
      const parentBox = parentActiveRef.current.getBoundingClientRect();
      const branchX = Math.max(0, parentBox.left + parentBox.width / 2 - rootBox.left);

      // Apply indent before measuring the active sub chip so path targets the final layout
      root.style.setProperty("--branch-x", `${branchX}px`);

      const childEl = subActiveRef.current;
      if (!childEl) {
        setConnector({ d: "", w: root.offsetWidth, h: root.offsetHeight, branchX });
        return;
      }

      const d = buildConnectorPath(rootBox, parentBox, childEl.getBoundingClientRect());
      setConnector({ d, w: root.offsetWidth, h: root.offsetHeight, branchX });
    };

    measure();
    // Second pass after padding / wrap settles
    const raf = requestAnimationFrame(measure);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && root) ro.observe(root);
    window.addEventListener("resize", measure);
    parentRow?.addEventListener("scroll", measure, { passive: true });
    subRow?.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      parentRow?.removeEventListener("scroll", measure);
      subRow?.removeEventListener("scroll", measure);
    };
  }, [contract, phase, phases]);

  return (
    <div
      className="tree-filters"
      ref={rootRef}
      style={connector.branchX ? { "--branch-x": `${connector.branchX}px` } : undefined}
    >
      {phases && connector.d ? (
        <svg
          className="tree-filters__connector"
          width={connector.w}
          height={connector.h}
          viewBox={`0 0 ${connector.w} ${connector.h}`}
          aria-hidden
        >
          <path d={connector.d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : null}

      <div
        className="tree-filters__row event-filters"
        role="tablist"
        aria-label="Contract filter"
        ref={parentRowRef}
      >
        {CONTRACT_FILTER_META.map(({ id, label, Icon }) => {
          const active = contract === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              ref={active ? parentActiveRef : undefined}
              className={`filter-chip filter-chip--icon ${active ? "is-active" : ""}`}
              onClick={() => onContractChange(id)}
            >
              <Icon size={16} strokeWidth={2} aria-hidden />
              <span>{label}</span>
              <span className="filter-chip__n">{contractCounts[id] || 0}</span>
            </button>
          );
        })}
      </div>

      {phases ? (
        <div
          className="tree-filters__row tree-filters__row--sub event-filters"
          role="tablist"
          aria-label="Event phase filter"
          ref={subRowRef}
        >
          <button
            type="button"
            role="tab"
            aria-selected={phase === "all"}
            ref={phase === "all" ? subActiveRef : undefined}
            className={`filter-chip filter-chip--sub ${phase === "all" ? "is-active-path" : ""}`}
            onClick={() => onPhaseChange("all")}
          >
            All
            <span className="filter-chip__n">{phaseCounts.all || 0}</span>
          </button>
          {phases.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={phase === id}
              ref={phase === id ? subActiveRef : undefined}
              className={`filter-chip filter-chip--sub ${phase === id ? "is-active-path" : ""}`}
              onClick={() => onPhaseChange(id)}
            >
              {label}
              <span className="filter-chip__n">{phaseCounts[id] || 0}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function EventTimeline({ timeline, filter, onFilterChange }) {
  const [phase, setPhase] = useState("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(null);

  const contractCounts = useMemo(() => {
    const counts = { all: timeline.length };
    for (const meta of CONTRACT_FILTER_META) {
      if (meta.id === "all") continue;
      counts[meta.id] = timeline.filter((e) => e.contract === meta.id).length;
    }
    return counts;
  }, [timeline]);

  const phaseCounts = useMemo(
    () => (filter === "all" ? { all: 0 } : countByPhase(timeline, filter)),
    [timeline, filter]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return timeline;
    return timeline.filter(
      (e) => e.contract === filter && eventMatchesPhase(filter, phase, e.event)
    );
  }, [timeline, filter, phase]);

  const showContractCol = filter === "all";
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPhase("all");
    setPage(0);
    setSelected(null);
  }, [filter]);

  useEffect(() => {
    setPage(0);
    setSelected(null);
  }, [phase]);

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
      <TreeEventFilters
        contract={filter}
        phase={phase}
        onContractChange={onFilterChange}
        onPhaseChange={setPhase}
        contractCounts={contractCounts}
        phaseCounts={phaseCounts}
      />

      {!filtered.length ? (
        <div className="empty" style={{ marginTop: 12 }}>
          No events for this filter.
        </div>
      ) : (
        <>
          <p className="events-hint">Click a row for full decoded args (bytes, proofs, arrays).</p>
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
                  {showContractCol ? <th>Contract</th> : null}
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
            showContract={showContractCol}
            txHref={etherscanTx}
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

      <EventDetailDrawer event={selected} onClose={() => setSelected(null)} network="mainnet" />
    </div>
  );
}
