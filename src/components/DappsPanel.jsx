import { useState } from "react";
import { ArrowLeft01Icon, BrowserIcon } from "@hugeicons/core-free-icons";
import { Icon } from "./Icon";
import { DAPPS } from "../lib/dapps";
import { CrispPanel } from "./CrispPanel";

function DappIcon({ dapp }) {
  const [broken, setBroken] = useState(false);
  if (dapp.icon && !broken) {
    return (
      <img
        className="dapp-card__logo"
        src={dapp.icon}
        alt=""
        width={40}
        height={40}
        onError={() => setBroken(true)}
      />
    );
  }
  return (
    <span className="dapp-card__logo dapp-card__logo--fallback" aria-hidden>
      <Icon icon={BrowserIcon} size={22} strokeWidth={1.6} />
    </span>
  );
}

export function DappsPanel({ dappId, onSelectDapp, crispEvents, crispNetwork }) {
  if (dappId === "crisp") {
    return (
      <div className="dapps-panel">
        <button type="button" className="dapps-back" onClick={() => onSelectDapp(null)}>
          <Icon icon={ArrowLeft01Icon} size={14} />
          All dapps
        </button>
        <div className="section-head">
          <h2>CRISP</h2>
          <p>
            Encrypted ballot program on{" "}
            <span className="hint">{crispNetwork || "mainnet"}</span>.
          </p>
        </div>
        <CrispPanel events={crispEvents || []} network={crispNetwork || "mainnet"} />
      </div>
    );
  }

  return (
    <div className="dapps-panel">
      <div className="section-head">
        <h2>DApps</h2>
        <p>
          Applications built on InterFold. Pick one to explore indexed activity — more apps land
          here as they ship.
        </p>
      </div>

      <ul className="dapp-grid">
        {DAPPS.map((dapp) => (
          <li key={dapp.id}>
            <button
              type="button"
              className="dapp-card"
              onClick={() => onSelectDapp(dapp.id)}
            >
              <DappIcon dapp={dapp} />
              <div className="dapp-card__body">
                <div className="dapp-card__row">
                  <strong>{dapp.name}</strong>
                  <span className="dapp-card__net">{dapp.networkLabel}</span>
                </div>
                <p className="dapp-card__tagline">{dapp.tagline}</p>
                <p className="dapp-card__desc">{dapp.description}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
