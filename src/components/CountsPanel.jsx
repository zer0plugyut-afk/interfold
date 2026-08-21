export function CountsPanel({ summary }) {
  const blocks = Object.entries(summary || {}).filter(([k]) => k !== "totals");

  return (
    <div className="counts">
      {blocks.map(([name, counts]) => {
        const rows = Object.entries(counts || {}).sort((a, b) => b[1] - a[1]);
        return (
          <article key={name} className="card">
            <h3>{name}</h3>
            {rows.length ? (
              rows.map(([ev, n]) => (
                <div key={ev} className="mono">
                  {ev}: {n}
                </div>
              ))
            ) : (
              <div className="mono">(none)</div>
            )}
          </article>
        );
      })}
    </div>
  );
}
