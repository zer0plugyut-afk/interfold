import { useEffect, useMemo, useState } from "react";
import { etherscanAddress, num, shortAddr } from "../lib/format";
import { formatUsd } from "../lib/foldPrice";
import { formatUnlockCountdown } from "../lib/timeFormat";
import { useEnsNames } from "../hooks/useEnsNames";
import { Pill } from "./Pill";

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
          className={`addr${ens ? " addr--ens" : ""}`}
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

export function OperatorsTable({ operators, priceUsd }) {
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

  if (!operators?.length) {
    return <div className="empty">No operators yet. Seed JSON or run the indexer.</div>;
  }

  const sorted = [...operators].sort((a, b) => {
    const ae = a.hasExitInProgress ? 1 : 0;
    const be = b.hasExitInProgress ? 1 : 0;
    if (ae !== be) return be - ae;
    return 0;
  });

  return (
    <div className="table-wrap">
      <table>
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
            opSubParts.push(`added @ block ${num(o.addedBlock)}`);

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
