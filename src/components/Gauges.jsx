import { num } from "../lib/format";
import { formatUsd } from "../lib/foldPrice";
import { FoldIcon } from "./FoldIcon";

export function Gauges({ live, priceUsd }) {
  if (!live) return null;

  const bond = Number(live.totalCiphernodeBondLiability) || 0;
  const foldSupply = Number(live.foldTotalSupply) || 0;

  const items = [
    {
      label: "Bonded FOLD liability",
      value: num(live.totalCiphernodeBondLiability),
      usd: priceUsd != null ? formatUsd(bond, priceUsd) : null,
      hint: `floor ${num(live.requiredCiphernodeBond)} / node`,
      foldIcon: true,
    },
    {
      label: "Ticket supply (tFOLD)",
      value: num(live.tfoldTotalSupply),
      hint: `price ${num(live.ticketPrice)} per ticket`,
    },
    {
      label: "Ciphernodes",
      value: live.numCiphernodes,
      hint: `window ${live.sortitionSubmissionWindow}s`,
    },
    {
      label: "Exit delay",
      value: `${live.exitDelayDays}d`,
      hint: `active floor ${Number(live.ciphernodeBondActiveBps) / 100}%`,
    },
    {
      label: "FOLD supply",
      value: num(live.foldTotalSupply),
      usd: priceUsd != null ? formatUsd(foldSupply, priceUsd) : null,
      hint: "InterfoldToken",
      foldIcon: true,
    },
    {
      label: "Unreleased committees",
      value: live.unreleasedCommitteeCount,
      hint: "CiphernodeRegistry",
    },
  ];

  return (
    <section className="gauges">
      {items.map((g) => (
        <article key={g.label} className="gauge">
          <p className="gauge__label">
            {g.foldIcon ? <FoldIcon size={18} /> : null}
            {g.label}
          </p>
          <p className="gauge__value">
            {g.foldIcon ? <FoldIcon className="gauge__fold" size={22} /> : null}
            {g.value}
          </p>
          {g.usd ? <p className="gauge__usd">{g.usd}</p> : null}
          <p className="gauge__hint">{g.hint}</p>
        </article>
      ))}
    </section>
  );
}
