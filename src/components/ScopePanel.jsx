import { DEFAULT_SCOPE } from "../lib/format";
import { Pill } from "./Pill";

function Card({ item, later }) {
  return (
    <article className="card">
      <div className="card__row">
        <h3>{item.title}</h3>
        {later ? (
          item.dataReady ? (
            <Pill>ready later</Pill>
          ) : (
            <Pill kind="warn">no events yet</Pill>
          )
        ) : item.dataReady ? (
          <Pill>data ready</Pill>
        ) : (
          <Pill kind="bad">blocked</Pill>
        )}
      </div>
      <p>
        {later
          ? "Waits on mainnet E3 / sortition / slash activity."
          : item.officialGap || ""}
      </p>
      {!later && item.evidence ? (
        <p style={{ marginTop: 8 }}>
          Evidence:{" "}
          <span className="mono">
            {typeof item.evidence === "string" ? item.evidence : JSON.stringify(item.evidence)}
          </span>
        </p>
      ) : null}
    </article>
  );
}

export function ScopePanel({ scope }) {
  const s = scope || DEFAULT_SCOPE;
  return (
    <div className="scope-list">
      {(s.buildableNow || []).map((item) => (
        <Card key={item.title} item={item} later={false} />
      ))}
      {(s.later || []).map((item) => (
        <Card key={item.title} item={item} later />
      ))}
    </div>
  );
}
