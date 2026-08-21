export function SetupPanel({ supabaseConfigured }) {
  return (
    <div className="scope-list">
      <article className="card">
        <h3>1. New Supabase project</h3>
        <p>
          Create a dedicated InterFold project. Run{" "}
          <code>supabase/migrations/001_interfold_schema.sql</code> then{" "}
          <code>002_realtime_safe.sql</code>.
        </p>
      </article>
      <article className="card">
        <h3>
          2. Indexer <code>indexer/.env</code>
        </h3>
        <p>
          <code>SUPABASE_URL</code>
          <br />
          <code>SUPABASE_SERVICE_ROLE_KEY</code>
          <br />
          <code>RPC_URL</code> (publicnode or Alchemy)
        </p>
        <p style={{ marginTop: 8 }}>
          Then <code>npm run seed-json</code> and <code>npm start</code>.
        </p>
      </article>
      <article className="card">
        <h3>
          3. Frontend <code>.env</code>
        </h3>
        <p>
          <code>VITE_SUPABASE_URL</code>
          <br />
          <code>VITE_SUPABASE_ANON_KEY</code>
        </p>
        <p style={{ marginTop: 8 }}>
          Restart <code>npm run dev</code>. Status:{" "}
          <strong>{supabaseConfigured ? "configured" : "using JSON fallback"}</strong>.
        </p>
      </article>
    </div>
  );
}
