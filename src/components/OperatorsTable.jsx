import { useEffect, useMemo, useState } from "react";
import { Sorting01Icon } from "@hugeicons/core-free-icons";
import { etherscanAddress, num, shortAddr } from "../lib/format";
import { formatUsd } from "../lib/foldPrice";
import { formatUnlockCountdown, formatWhenShort } from "../lib/timeFormat";
import { useEnsNames } from "../hooks/useEnsNames";
import { Icon } from "./Icon";
import { Pill } from "./Pill";

/** Clear sort modes — not every column header. */
const SORT_OPTIONS = [
  { id: "tickets-desc", label: "Tickets · high → low" },
  { id: "tickets-asc", label: "Tickets · low → high" },
  { id: "share-desc", label: "Sortition share · high → low" },
  { id: "share-asc", label: "Sortition share · low → high" },
  { id: "bond-desc", label: "Bonded FOLD · high → low" },
  { id: "bond-asc", label: "Bonded FOLD · low → high" },
  { id: "added-desc", label: "Time added · newest first" },
  { id: "added-asc", label: "Time added · oldest first" },
  { id: "status", label: "Status · exiting / active first" },
];

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function AddrCell({ address, ens, trailing, sub }) {
  return (
    <>
      <div className="op-addr-row">
        <a
          className={`addr addr--op${ens ? " addr--ens" : ""}`}
          href={etherscanAddress(address)}
          target="_blank"
          rel="noreferrer"
          title={address}
        >
          {ens || shortAddr(address)}
        </a>
        {trailing}
      </div>
      {sub}
    </>
  );
}

function statusRank(o) {
  if (o.hasExitInProgress) return 3;
  if (o.isActive) return 2;
  if (o.isRegistered) return 1;
  return 0;
}

function addedMs(o) {
  if (o.addedTimestamp) {
    const t = new Date(o.addedTimestamp).getTime();
    if (Number.isFinite(t)) return t;
  }
  const block = Number(o.addedBlock);
  return Number.isFinite(block) ? block : 0;
}

function compareOps(a, b, sortId) {
  let cmp = 0;
  switch (sortId) {
    case "tickets-desc":
      cmp = (Number(b.availableTickets) || 0) - (Number(a.availableTickets) || 0);
      break;
    case "tickets-asc":
      cmp = (Number(a.availableTickets) || 0) - (Number(b.availableTickets) || 0);
      break;
    case "share-desc":
      cmp = (Number(b.ticketSharePct) || 0) - (Number(a.ticketSharePct) || 0);
      break;
    case "share-asc":
      cmp = (Number(a.ticketSharePct) || 0) - (Number(b.ticketSharePct) || 0);
      break;
    case "bond-desc":
      cmp = (Number(b.ciphernodeBond) || 0) - (Number(a.ciphernodeBond) || 0);
      break;
    case "bond-asc":
      cmp = (Number(a.ciphernodeBond) || 0) - (Number(b.ciphernodeBond) || 0);
      break;
    case "added-desc":
      cmp = addedMs(b) - addedMs(a);
      break;
    case "added-asc":
      cmp = addedMs(a) - addedMs(b);
      break;
    case "status":
      cmp = statusRank(b) - statusRank(a);
      break;
    default:
      cmp = (Number(b.availableTickets) || 0) - (Number(a.availableTickets) || 0);
  }
  if (cmp === 0) {
    cmp = String(a.address || "").localeCompare(String(b.address || ""));
  }
  return cmp;
}

export function OperatorSortSelect({ value, onChange, id = "op-sort-select" }) {
  return (
    <div className="op-sort-bar">
      <label className="op-sort-bar__label" htmlFor={id}>
        <Icon icon={Sorting01Icon} size={14} />
        Sort by
      </label>
      <select
        id={id}
        className="op-sort-bar__select mono"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function OperatorsTable({ operators, priceUsd, sortId = "tickets-desc" }) {
  const nowMs = useNow();

  const ensAddresses = useMemo(() => {
    const out = [];
    for (const o of operators || []) {
      if (o.address) out.push(o.address);
      if (o.bondOwner) out.push(o.bondOwner);
    }
    return out;
  }, [operators]);

  const ens = useEnsNames(ensAddresses);

  const sorted = useMemo(() => {
    if (!operators?.length) return [];
    return [...operators].sort((a, b) => compareOps(a, b, sortId));
  }, [operators, sortId]);

  if (!operators?.length) {
    return <div className="empty">No operators yet. Seed JSON or run the indexer.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="ops-table">
        <thead>
          <tr>
            <th>Operator</th>
            <th>Bond owner</th>
            <th>Bonded FOLD</th>
            <th>Tickets</th>
            <th>Sortition share</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((o) => {
            const tickets = Number(o.availableTickets);
            const bond = Number(o.ciphernodeBond) || 0;
            const exiting = Boolean(o.hasExitInProgress);
            const unlockCd = exiting ? formatUnlockCountdown(o.exitUnlockAt, nowMs) : null;
            const opEns = ens[String(o.address || "").toLowerCase()] || null;
            const ownerEns = ens[String(o.bondOwner || "").toLowerCase()] || null;
            const status = o.isActive ? (
              <Pill>active</Pill>
            ) : o.isRegistered ? (
              <Pill kind="warn">registered</Pill>
            ) : (
              <Pill kind="bad">inactive</Pill>
            );

            const opSubParts = [];
            if (opEns) opSubParts.push(shortAddr(o.address));
            if (exiting && unlockCd) opSubParts.push(unlockCd);
            const addedWhen = formatWhenShort(o.addedTimestamp);
            if (addedWhen) opSubParts.push(`added ${addedWhen}`);
            else if (o.addedBlock != null) opSubParts.push(`added @ block ${num(o.addedBlock)}`);

            return (
              <tr key={o.address} className={exiting ? "op-row is-exiting" : undefined}>
                <td>
                  <AddrCell
                    address={o.address}
                    ens={opEns}
                    trailing={exiting ? <span className="op-exit-badge">exit</span> : null}
                    sub={<div className="ticket-cell__sub mono">{opSubParts.join(" · ")}</div>}
                  />
                </td>
                <td>
                  <AddrCell
                    address={o.bondOwner}
                    ens={ownerEns}
                    sub={
                      ownerEns ? (
                        <div className="ticket-cell__sub mono">{shortAddr(o.bondOwner)}</div>
                      ) : null
                    }
                  />
                </td>
                <td className="mono">
                  {num(o.ciphernodeBond)} FOLD
                  {priceUsd != null ? (
                    <div className="ticket-cell__sub">{formatUsd(bond, priceUsd)}</div>
                  ) : null}
                </td>
                <td>
                  <div className="ticket-cell">
                    <div className="mono">
                      {tickets} {tickets === 1 ? "ticket" : "tickets"}
                    </div>
                    <div className="ticket-cell__sub">
                      tFOLD balance {num(o.ticketBalance)} · price 1,000 each
                    </div>
                  </div>
                </td>
                <td style={{ minWidth: 120 }}>
                  <div className="mono">{num(o.ticketSharePct, 1)}%</div>
                  <div className="bar">
                    <span style={{ width: `${Math.min(100, Number(o.ticketSharePct) || 0)}%` }} />
                  </div>
                </td>
                <td>
                  {status}
                  {exiting ? (
                    <>
                      {" "}
                      <Pill kind="bad">exit pending</Pill>
                    </>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
