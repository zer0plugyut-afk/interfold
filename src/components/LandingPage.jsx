import { useEffect } from "react";
import { ArrowRight01Icon, Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { DonateButton } from "./DonateModal";
import { FoldIcon } from "./FoldIcon";
import { Icon } from "./Icon";

/**
 * Full-page entry — outside the dashboard shell.
 */
export function LandingPage({
  counts,
  live,
  priceLabel,
  theme,
  onToggleTheme,
  onEnterBoard,
  onDonate,
}) {
  useEffect(() => {
    document.documentElement.classList.add("landing-open");
    document.body.classList.add("landing-open");
    return () => {
      document.documentElement.classList.remove("landing-open");
      document.body.classList.remove("landing-open");
    };
  }, []);

  const block = live?.latestBlock;

  return (
    <div className="landing-page">
      <header className="landing-page__nav">
        <div className="landing-page__brand">
          <img src="/favicon.svg" width={36} height={36} alt="" />
          <span>Interfold Board</span>
        </div>
        <div className="landing-page__nav-actions">
          <DonateButton onClick={onDonate} className="donate-btn--nav" />
          <button
            type="button"
            className="theme-btn theme-btn--icon"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <Icon icon={Sun03Icon} size={18} />
            ) : (
              <Icon icon={Moon02Icon} size={18} />
            )}
          </button>
          <button
            type="button"
            className="landing-page__nav-enter"
            onClick={() => onEnterBoard("operators")}
          >
            Open board
          </button>
        </div>
      </header>

      <section className="landing-page__hero">
        <img className="landing-page__hero-mark" src="/favicon.svg" width={72} height={72} alt="" />
        <h1 className="landing-page__name">Interfold Board</h1>
        <p className="landing-page__headline">
          See the confidential coordination network as it runs.
        </p>
        <p className="landing-page__support">
          A community analytics layer for The Interfold — live operators, protocol events,
          FOLD tokenomics, DAO drafts, and apps like CRISP.
        </p>
        <div className="landing-page__cta-row">
          <button
            type="button"
            className="landing-page__cta landing-page__cta--primary"
            onClick={() => onEnterBoard("operators")}
          >
            Enter the board
            <Icon icon={ArrowRight01Icon} size={16} />
          </button>
          <button
            type="button"
            className="landing-page__cta"
            onClick={() => onEnterBoard("events")}
          >
            Jump to events
          </button>
        </div>
      </section>

      <section className="landing-page__section" aria-labelledby="about-board">
        <p className="landing-page__eyebrow">What this is</p>
        <h2 id="about-board">A public window into Interfold activity</h2>
        <p className="landing-page__copy">
          Interfold Board indexes on-chain state so anyone can follow ciphernodes, bonding,
          fees, rewards, and application traffic without running their own indexer. It is
          built for the community: clear numbers, decoded logs, and charts that stay close
          to the contracts.
        </p>
        <ul className="landing-page__pulse" aria-label="Live snapshot">
          <li>
            <span>Operators</span>
            <strong className="mono">{counts.operators ?? "—"}</strong>
          </li>
          <li>
            <span>Indexed events</span>
            <strong className="mono">{counts.events ?? "—"}</strong>
          </li>
          <li>
            <span>FOLD</span>
            <strong className="mono landing-page__price">
              <FoldIcon size={16} />
              {priceLabel || "—"}
            </strong>
          </li>
          <li>
            <span>Latest block</span>
            <strong className="mono">
              {block != null ? Number(block).toLocaleString() : "—"}
            </strong>
          </li>
        </ul>
      </section>

      <section className="landing-page__section" aria-labelledby="about-interfold">
        <p className="landing-page__eyebrow">The protocol</p>
        <h2 id="about-interfold">Confidential coordination on Ethereum</h2>
        <p className="landing-page__copy">
          The Interfold is infrastructure for encrypted computation among operators — so
          groups can coordinate without exposing private inputs on a public ledger.
          Ciphernodes stake and serve; programs like CRISP run encrypted ballots and other
          workflows through the same stack.
        </p>
        <p className="landing-page__copy">
          This board does not operate the network. It watches it: who is bonded, what the
          contracts emit, how FOLD is allocated, and which apps are live — so the community
          can stay oriented as the protocol moves.
        </p>
      </section>

      <section className="landing-page__section" aria-labelledby="explore">
        <p className="landing-page__eyebrow">Inside the board</p>
        <h2 id="explore">Where to start</h2>
        <ul className="landing-page__paths">
          {[
            {
              id: "operators",
              title: "Operators",
              body: "The ciphernode set — tickets, bonds, and who is serving the network.",
            },
            {
              id: "events",
              title: "Events",
              body: "Decoded logs from Bonding, Registry, Interfold, and Slashing as they land.",
            },
            {
              id: "charts",
              title: "Charts",
              body: "Fees, rewards, treasury signals, and protocol activity over time.",
            },
            {
              id: "tokenomics",
              title: "Tokenomics",
              body: "FOLD supply, allocations, and the unlock schedule in one place.",
            },
            {
              id: "dao",
              title: "DAO",
              body: "Draft IPPs and finalized resolutions — starting with ciphernode rewards.",
            },
            {
              id: "apps",
              title: "DApps",
              body: "Applications on Interfold — including CRISP encrypted ballots on mainnet.",
            },
          ].map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="landing-page__path"
                onClick={() => onEnterBoard(item.id)}
              >
                <span className="landing-page__path-title">{item.title}</span>
                <span className="landing-page__path-body">{item.body}</span>
                <span className="landing-page__path-go" aria-hidden>
                  <Icon icon={ArrowRight01Icon} size={14} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <footer className="landing-page__footer">
        <div className="landing-page__footer-brand">
          <img src="/favicon.svg" width={22} height={22} alt="" />
          <div>
            <strong>Interfold Board</strong>
            <p>Not affiliated with the Interfold Foundation.</p>
          </div>
        </div>
        <p className="landing-page__footer-note">
          Independent community analytics. Not an official product of the foundation.
        </p>
      </footer>
    </div>
  );
}
