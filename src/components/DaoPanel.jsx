import { useMemo, useState } from "react";
import {
  ArrowUpRight01Icon,
  BalanceScaleIcon,
  Calendar03Icon,
  ChartBarLineIcon,
  CheckmarkCircle02Icon,
  Coins01Icon,
  DocumentValidationIcon,
  FileEditIcon,
  HierarchySquare01Icon,
  JusticeScale01Icon,
  LinkSquare01Icon,
  QuillWrite01Icon,
  ShieldEnergyIcon,
  Tick02Icon,
  UserMultiple02Icon,
  VoteIcon,
} from "@hugeicons/core-free-icons";
import { formatUsd } from "../lib/foldPrice";
import { exactFold } from "../lib/foldTokenomics";
import {
  DAO_GOV_DOCS,
  DAO_PROPOSALS,
  DAO_RULES,
  EPOCH_POOL,
  EPOCH_SCHEDULE,
  TICKET_SCENARIOS,
  daoCounts,
} from "../lib/daoProposals";
import { Icon } from "./Icon";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "live", label: "Live vote" },
  { id: "finalized", label: "Finalized" },
];

const STATUS_ICON = {
  draft: FileEditIcon,
  live: VoteIcon,
  passed: Tick02Icon,
  rejected: ShieldEnergyIcon,
  finalized: CheckmarkCircle02Icon,
};

function statusClass(status) {
  return `dao-status dao-status--${status}`;
}

/**
 * @param {{ priceUsd?: number | null, onOpenGovernance?: () => void }} props
 */
export function DaoPanel({ priceUsd, onOpenGovernance }) {
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(DAO_PROPOSALS[0]?.id ?? null);
  const counts = useMemo(() => daoCounts(), []);

  const list = useMemo(() => {
    if (filter === "all") return DAO_PROPOSALS;
    return DAO_PROPOSALS.filter((p) => p.status === filter);
  }, [filter]);

  const selected = list.find((p) => p.id === selectedId) ?? list[0] ?? null;

  return (
    <div className="dao-page">
      <div className="section-head">
        <h2>DAO drafts & resolutions</h2>
        <p>
          Community preview of Interfold Protocol Proposals. Drafts are transcribed from
          published sources; when a proposal is finalized on-chain we update the same card.
          Not an official voting interface.
          {onOpenGovernance ? (
            <>
              {" "}
              Locked FOLD &amp; delegates live under{" "}
              <button type="button" className="gov-inline-link" onClick={onOpenGovernance}>
                Governance
              </button>
              .
            </>
          ) : null}
        </p>
      </div>

      <div className="dao-rules" aria-label="Live governance parameters">
        {DAO_RULES.map((r) => (
          <div key={r.id} className="dao-rule">
            <span className="dao-rule__label mono">{r.label}</span>
            <strong>{r.value}</strong>
          </div>
        ))}
        <a className="dao-rule dao-rule--link" href={DAO_GOV_DOCS} target="_blank" rel="noreferrer">
          <span className="dao-rule__label mono">Reference</span>
          <strong>
            Governance docs <Icon icon={LinkSquare01Icon} size={13} />
          </strong>
        </a>
      </div>

      <div className="dao-kpis" aria-label="Proposal inventory">
        <div className="dao-kpi">
          <Icon icon={FileEditIcon} size={18} />
          <div>
            <span className="mono">Drafts</span>
            <strong>{counts.draft}</strong>
          </div>
        </div>
        <div className="dao-kpi">
          <Icon icon={VoteIcon} size={18} />
          <div>
            <span className="mono">Live votes</span>
            <strong>{counts.live}</strong>
          </div>
        </div>
        <div className="dao-kpi">
          <Icon icon={CheckmarkCircle02Icon} size={18} />
          <div>
            <span className="mono">Finalized</span>
            <strong>{counts.finalized + counts.passed}</strong>
          </div>
        </div>
        <div className="dao-kpi">
          <Icon icon={JusticeScale01Icon} size={18} />
          <div>
            <span className="mono">Tracked</span>
            <strong>{counts.all}</strong>
          </div>
        </div>
      </div>

      <div className="event-filters dao-filters" role="tablist" aria-label="Proposal status">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`filter-chip ${filter === f.id ? "is-active" : ""}`}
            onClick={() => {
              setFilter(f.id);
              const next = (f.id === "all" ? DAO_PROPOSALS : DAO_PROPOSALS.filter((p) => p.status === f.id))[0];
              if (next) setSelectedId(next.id);
            }}
          >
            {f.label}
            <span className="filter-chip__n">{f.id === "all" ? counts.all : counts[f.id] || 0}</span>
          </button>
        ))}
      </div>

      <div className="dao-layout">
        <aside className="dao-rail" aria-label="Proposal list">
          {list.length === 0 ? (
            <p className="dao-empty">No proposals in this state yet.</p>
          ) : (
            list.map((p) => {
              const active = selected?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`dao-card${active ? " is-active" : ""}`}
                  onClick={() => setSelectedId(p.id)}
                  aria-current={active ? "true" : undefined}
                >
                  <div className="dao-card__top">
                    <span className="dao-card__code mono">{p.code}</span>
                    <span className={statusClass(p.status)}>
                      <Icon icon={STATUS_ICON[p.status] || FileEditIcon} size={12} />
                      {p.statusLabel}
                    </span>
                  </div>
                  <strong className="dao-card__title">{p.title}</strong>
                  <p className="dao-card__meta mono">
                    {p.author} · {p.dateLabel}
                  </p>
                </button>
              );
            })
          )}
        </aside>

        {selected ? <DaoDetail proposal={selected} priceUsd={priceUsd} /> : null}
      </div>
    </div>
  );
}

function DaoDetail({ proposal: p, priceUsd }) {
  const poolUsd = formatUsd(p.budget.poolFold, priceUsd);
  const epochUsd = formatUsd(EPOCH_POOL, priceUsd);

  return (
    <article className="dao-detail">
      <header className="dao-detail__head">
        <div className="dao-detail__mark" aria-hidden>
          <Icon icon={BalanceScaleIcon} size={22} />
        </div>
        <div className="dao-detail__titles">
          <p className="dao-detail__kicker mono">
            {p.type} · {p.sourceLabel}
          </p>
          <h3>
            {p.code}: {p.title}
          </h3>
          <div className="dao-detail__byline">
            <span className={statusClass(p.status)}>
              <Icon icon={STATUS_ICON[p.status] || FileEditIcon} size={12} />
              {p.statusLabel}
            </span>
            <a className="dao-author" href={p.authorUrl} target="_blank" rel="noreferrer">
              <Icon icon={QuillWrite01Icon} size={13} />
              {p.author}
            </a>
            <span className="mono">
              <Icon icon={Calendar03Icon} size={13} /> {p.dateLabel}
            </span>
          </div>
          {p.revisedNote ? <p className="dao-revised mono">{p.revisedNote}</p> : null}
        </div>
        <a className="dao-source" href={p.sourceUrl} target="_blank" rel="noreferrer">
          Open draft
          <Icon icon={ArrowUpRight01Icon} size={14} />
        </a>
      </header>

      <ol className="dao-stages" aria-label="Proposal lifecycle">
        {p.stages.map((s, i) => {
          const current = p.stages.findIndex((x) => x.id === p.currentStage);
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={s.id}
              className={`dao-stage${done ? " is-done" : ""}${active ? " is-current" : ""}`}
            >
              <span className="dao-stage__dot" aria-hidden>
                {done ? <Icon icon={Tick02Icon} size={12} /> : i + 1}
              </span>
              <strong>{s.label}</strong>
              <em>{s.hint}</em>
            </li>
          );
        })}
      </ol>

      <div className="dao-metrics">
        {p.metrics.map((m) => (
          <div key={m.id} className="dao-metric">
            <span className="dao-metric__label mono">{m.label}</span>
            <strong>
              {m.value}
              <small>{m.unit}</small>
            </strong>
            <p>{m.hint}</p>
          </div>
        ))}
      </div>

      {priceUsd != null ? (
        <p className="dao-spot mono">
          Spot estimate at current FOLD price — pool {poolUsd} · avg epoch {epochUsd} (actual
          epochs 600k→4.8M). Not a figure from the draft; the author cites a ~$250k–$300k treasury
          buy.
        </p>
      ) : null}

      <section className="dao-block">
        <h4>
          <Icon icon={DocumentValidationIcon} size={16} /> Summary
        </h4>
        <p>{p.summary}</p>
      </section>

      <section className="dao-block">
        <h4>
          <Icon icon={HierarchySquare01Icon} size={16} /> Motivation
        </h4>
        <p>{p.motivation}</p>
      </section>

      <section className="dao-block">
        <h4>
          <Icon icon={Calendar03Icon} size={16} /> Fibonacci epoch schedule
        </h4>
        <p className="dao-note">
          Weights 1:1:2:3:5:8 (20 units × 600,000 FOLD). Early epochs reward launch operators;
          later epochs backload the pool to attract new capacity.
        </p>
        <div className="dao-table-wrap">
          <table className="dao-table">
            <thead>
              <tr>
                <th>Epoch</th>
                <th>Weight</th>
                <th>Pool (FOLD)</th>
                <th>Spot</th>
              </tr>
            </thead>
            <tbody>
              {EPOCH_SCHEDULE.map((row) => (
                <tr key={row.epoch}>
                  <td className="mono">{row.epoch}</td>
                  <td className="mono">{row.weight}</td>
                  <td className="mono">{exactFold(row.pool)}</td>
                  <td className="mono">{formatUsd(row.pool, priceUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dao-block">
        <h4>
          <Icon icon={ChartBarLineIcon} size={16} /> Ticket-block accrual
        </h4>
        <p className="dao-formula mono">
          {p.accrualFormula || "rewardᵢ = epochPool × ticketBlocksᵢ ÷ Σ ticketBlocks"}
        </p>
        {p.accrualFormulaHint ? <p className="dao-note">{p.accrualFormulaHint}</p> : null}
        <div className="dao-table-wrap">
          <table className="dao-table">
            <caption className="mono">
              Illustrative at the 2M FOLD average epoch pool — actual per-ticket payout scales with
              that epoch’s Fibonacci pool (600k → 4.8M)
            </caption>
            <thead>
              <tr>
                <th>Active ticket pool (full epoch)</th>
                <th>Payout / full-epoch ticket</th>
                <th>10-ticket node</th>
                <th>Spot / ticket</th>
              </tr>
            </thead>
            <tbody>
              {TICKET_SCENARIOS.map((row) => (
                <tr key={row.tickets}>
                  <td className="mono">{exactFold(row.tickets)}</td>
                  <td className="mono">{exactFold(row.perTicket)} FOLD</td>
                  <td className="mono">{exactFold(row.perTicket * 10)} FOLD</td>
                  <td className="mono">{formatUsd(row.perTicket, priceUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="dao-note">
          At {p.budget.ticketStake}, doubling sUSDS at stake doubles the reward share.{" "}
          {p.budget.bondNote} A ticket held only part of the epoch earns that fraction of a
          full-epoch share. The 30-day VE lock means settlement rewards cannot be recycled into
          tickets before unlock (~2 epochs later).
        </p>
      </section>

      <section className="dao-block">
        <h4>
          <Icon icon={Coins01Icon} size={16} /> Budget & funding
        </h4>
        <ul className="dao-bullets">
          <li>
            <strong>Source.</strong> {p.budget.source}
          </li>
          <li>
            <strong>Market buy.</strong> {p.budget.buyNote}
          </li>
        </ul>
      </section>

      <section className="dao-block">
        <h4>
          <Icon icon={UserMultiple02Icon} size={16} /> Design
        </h4>
        <div className="dao-design">
          {p.design.map((d) => (
            <div key={d.title} className="dao-design__item">
              <strong>{d.title}</strong>
              <p>{d.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="dao-block">
        <h4>
          <Icon icon={JusticeScale01Icon} size={16} /> The ask
        </h4>
        <div className="dao-table-wrap">
          <table className="dao-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {p.parameters.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dao-block">
        <h4>
          <Icon icon={ShieldEnergyIcon} size={16} /> Risks & mitigations
        </h4>
        <div className="dao-table-wrap">
          <table className="dao-table">
            <thead>
              <tr>
                <th>Risk</th>
                <th>Mitigation</th>
              </tr>
            </thead>
            <tbody>
              {p.risks.map((row) => (
                <tr key={row.risk}>
                  <td>{row.risk}</td>
                  <td>{row.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="dao-block">
        <h4>
          <Icon icon={FileEditIcon} size={16} /> Future iterations (out of scope)
        </h4>
        <ul className="dao-bullets">
          {p.future.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="dao-block">
        <h4>
          <Icon icon={Tick02Icon} size={16} /> Conclusion
        </h4>
        <p>{p.conclusion}</p>
      </section>

      <p className="dao-footnote mono">
        Unofficial community breakdown of the published draft. Source of truth:{" "}
        <a href={p.sourceUrl} target="_blank" rel="noreferrer">
          Fileverse · {p.code}
        </a>
        {p.wordCount ? ` · ${p.wordCount.toLocaleString()} words` : ""}.
      </p>
    </article>
  );
}
