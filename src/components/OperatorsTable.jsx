import { etherscanAddress, num, shortAddr } from "../lib/format";
import { formatUsd } from "../lib/foldPrice";
import { Pill } from "./Pill";

export function OperatorsTable({ operators, priceUsd }) {
  if (!operators?.length) {
    return <div className="empty">No operators yet. Seed JSON or run the indexer.</div>;
  }

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
          {operators.map((o) => {
            const tickets = Number(o.availableTickets);
            const bond = Number(o.ciphernodeBond) || 0;
            const status = o.isActive ? (
              <Pill>active</Pill>
            ) : o.isRegistered ? (
              <Pill kind="warn">registered</Pill>
            ) : (
              <Pill kind="bad">inactive</Pill>
            );

            return (
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
                  <div className="ticket-cell__sub mono">added @ block {num(o.addedBlock)}</div>
                </td>
                <td>
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
                  {o.hasExitInProgress ? (
                    <>
                      {" "}
                      <Pill kind="warn">exit pending</Pill>
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
