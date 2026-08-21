import { Pill } from "./Pill";

export function Banner({ live }) {
  if (!live) {
    return (
      <section className="banner">
        <div className="empty">No network stats yet. Run the indexer.</div>
      </section>
    );
  }

  const paused = live.requestsPaused;

  return (
    <section className="banner">
      <div>
        <strong>Mainnet status:</strong> E3 requests are {paused ? "PAUSED" : "OPEN"}.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Pill kind={paused ? "warn" : "ok"}>
          {paused ? "requestsPaused = true" : "requests live"}
        </Pill>
        <Pill>
          {live.numActiveOperators} active / {live.numRegisteredOperators} registered
        </Pill>
        <Pill kind={live.activeE3Count === "0" ? "warn" : "ok"}>
          {live.activeE3Count} active E3s
        </Pill>
        <Pill>{live.slashProposals} slash proposals</Pill>
      </div>
    </section>
  );
}
