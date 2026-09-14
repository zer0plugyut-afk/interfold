import { useMemo, useState } from "react";
import {
  Coins01Icon,
  HierarchySquare01Icon,
  LinkSquare01Icon,
  Sorting01Icon,
  UserMultiple02Icon,
  VoteIcon,
} from "@hugeicons/core-free-icons";
import { useEnsNames } from "../hooks/useEnsNames";
import { etherscanAddress, etherscanTx, num, shortAddr } from "../lib/format";
import { formatUsd } from "../lib/foldPrice";
import { formatUnlockCountdown, formatWhenShort } from "../lib/timeFormat";
import { FoldIcon } from "./FoldIcon";
import { Icon } from "./Icon";
import { Pill } from "./Pill";

/** veFOLD receipt NFT (VotingEscrow positions). */
const VE_FOLD_NFT = "0xF3eeE0f5E721b8c0073C8d85bf26A3d6EC293A0E";
const ESCROW = "0x71360F335e4Ec9c010e29bA7171bc62c9B4c1F12";
const OFFICIAL_GOV = "https://governance.theinterfold.com/";

/** Large vesting holders that do not cast votes (team FYI). */
const NON_VOTING = {
  "0x5429d8c7fd14023f3c414126f94bbe25a05fc018": {
    label: "Interfold Foundation",
    note: "Does not participate in votes",
  },
  "0x12beef35025841efccb77d6ee40df86400fdb4bb": {
    label: "Gnosis Guild",
    note: "Does not participate in votes",
  },
};

const LOCK_SORT = [
  { id: "amount-desc", label: "Locked · high → low" },
  { id: "amount-asc", label: "Locked · low → high" },
  { id: "newest", label: "Created · newest first" },
  { id: "oldest", label: "Created · oldest first" },
  { id: "status", label: "Status · exiting first" },
];

const DEL_SORT = [
  { id: "votes-desc", label: "Votes · high → low" },
  { id: "votes-asc", label: "Votes · low → high" },
];

function AddrLink({ address, ens }) {
  if (!address) return <span className="mono">—</span>;
  return (
    <>
      <a
        className={`addr addr--op${ens ? " addr--ens" : ""}`}
        href={etherscanAddress(address)}
        target="_blank"
        rel="noreferrer"
        title={address}
      >
        {ens || shortAddr(address)}
      </a>
      {ens ? <div className="ticket-cell__sub mono">{shortAddr(address)}</div> : null}
    </>
  );
}

function TxLink({ hash, label = "tx" }) {
  if (!hash) return null;
  return (
    <a
      className="addr mono gov-tx"
      href={etherscanTx(hash)}
      target="_blank"
      rel="noreferrer"
      title={hash}
    >
      {label} {shortAddr(hash)}
    </a>
  );
}

function nftUrl(tokenId) {
  return `https://etherscan.io/nft/${VE_FOLD_NFT}/${tokenId}`;
}

function lockStatus(lock) {
  if (!lock.isActive || Number(lock.amount) <= 0) return { label: "withdrawn", kind: "bad" };
  if (lock.isExiting) {
    const end = lock.exitDate ? new Date(lock.exitDate).getTime() : NaN;
    if (Number.isFinite(end) && end <= Date.now()) {
      return { label: "claimable", kind: "warn" };
    }
    return { label: "exiting", kind: "warn" };
  }
  if (lock.isDelegated) return { label: "delegated", kind: "ok" };
  return { label: "undelegated", kind: "warn" };
}

function exitSublabel(lock, nowMs) {
  if (!lock.isExiting) return null;
  if (!lock.exitDate) return "NFT held in escrow — voting power stopped";
  const end = new Date(lock.exitDate).getTime();
  if (!Number.isFinite(end)) return null;
  if (end <= nowMs) {
    return `cooldown ended ${formatWhenShort(lock.exitDate)} · ready to claim`;
  }
  const cd = formatUnlockCountdown(end, nowMs);
  return cd || `claim after ${formatWhenShort(lock.exitDate)}`;
}

function lockCreatedMs(l) {
  if (l.createdAt) {
    const t = new Date(l.createdAt).getTime();
    if (Number.isFinite(t)) return t;
  }
  return Number(l.createdBlock) || 0;
}

function compareLocks(a, b, sortId) {
  let cmp = 0;
  switch (sortId) {
    case "amount-asc":
      cmp = (Number(a.amount) || 0) - (Number(b.amount) || 0);
      break;
    case "newest":
      cmp = lockCreatedMs(b) - lockCreatedMs(a);
      break;
    case "oldest":
      cmp = lockCreatedMs(a) - lockCreatedMs(b);
      break;
    case "status": {
      const rank = (l) => (l.isExiting ? 3 : l.isDelegated ? 2 : l.isActive ? 1 : 0);
      cmp = rank(b) - rank(a);
      break;
    }
    default:
      cmp = (Number(b.amount) || 0) - (Number(a.amount) || 0);
  }
  if (cmp === 0) cmp = (Number(b.tokenId) || 0) - (Number(a.tokenId) || 0);
  return cmp;
}

function sharePct(votes, total) {
  const v = Number(votes) || 0;
  const t = Number(total) || 0;
  if (t <= 0 || v <= 0) return 0;
  return (v / t) * 100;
}

/** Sum ciphernode bond by economic owner (bond owner, else node address). */
function bondByOwner(operators) {
  const map = new Map();
  for (const op of operators || []) {
    const bond = Number(op.ciphernodeBond) || 0;
    if (bond <= 0) continue;
    const owner = String(op.bondOwner || op.address || "").toLowerCase();
    if (!owner || owner === "0x0000000000000000000000000000000000000000") continue;
    const prev = map.get(owner) || { account: op.bondOwner || op.address, bonded: 0, nodes: 0 };
    prev.bonded += bond;
    prev.nodes += 1;
    map.set(owner, prev);
  }
  return map;
}

function VotesBreakdown({ lockedVotes, bondedVotes, vestingVotes }) {
  const locked = Number(lockedVotes) || 0;
  const bonded = Number(bondedVotes) || 0;
  const vesting = Number(vestingVotes) || 0;
  if (locked <= 0 && bonded <= 0 && vesting <= 0) return null;
  return (
    <span className="gov-vp-break">
      {locked > 0 ? (
        <span className="gov-vp-chip gov-vp-chip--locked">{num(locked, 2)} locked</span>
      ) : null}
      {bonded > 0 ? (
        <span className="gov-vp-chip gov-vp-chip--bonded">{num(bonded, 2)} bonded</span>
      ) : null}
      {vesting > 0 ? (
        <span className="gov-vp-chip gov-vp-chip--vesting">{num(vesting, 2)} vesting</span>
      ) : null}
    </span>
  );
}

function NftChips({ tokenIds }) {
  if (!tokenIds?.length) return <span className="mono muted">—</span>;
  return (
    <div className="gov-nft-chips">
      {tokenIds.map((id) => (
        <a
          key={id}
          className="gov-nft-chip mono"
          href={nftUrl(id)}
          target="_blank"
          rel="noreferrer"
          title={`veFOLD #${id}`}
        >
          #{id}
        </a>
      ))}
    </div>
  );
}

/**
 * @param {{
 *   governance?: { stats?: object, locks?: object[], delegations?: object[] } | null,
 *   operators?: object[],
 *   priceUsd?: number | null,
 *   onOpenDao?: () => void,
 * }} props
 */
export function GovernancePanel({ governance, operators = [], priceUsd, onOpenDao }) {
  const [govTab, setGovTab] = useState("locks");
  const [lockSort, setLockSort] = useState("amount-desc");
  const [delSort, setDelSort] = useState("votes-desc");
  const [lockFilter, setLockFilter] = useState("active");
  const nowMs = Date.now();

  const stats = governance?.stats || null;
  const locks = governance?.locks || [];
  const delegations = governance?.delegations || [];

  const bondedByOwner = useMemo(() => bondByOwner(operators), [operators]);

  /** Active veFOLD NFTs keyed by lock owner (economic owner). */
  const nftsByOwner = useMemo(() => {
    const map = new Map();
    for (const l of locks) {
      if (!l.isActive || !(Number(l.amount) > 0)) continue;
      const owner = String(l.owner || "").toLowerCase();
      if (!owner) continue;
      const list = map.get(owner) || [];
      list.push(Number(l.tokenId));
      map.set(owner, list);
    }
    for (const list of map.values()) list.sort((a, b) => a - b);
    return map;
  }, [locks]);

  const ensAddresses = useMemo(() => {
    const out = [];
    for (const l of locks) {
      if (l.owner) out.push(l.owner);
      if (l.delegatee) out.push(l.delegatee);
      if (l.exitHolder) out.push(l.exitHolder);
    }
    for (const d of delegations) {
      if (d.account) out.push(d.account);
    }
    for (const row of bondedByOwner.values()) {
      if (row.account) out.push(row.account);
    }
    return out;
  }, [locks, delegations, bondedByOwner]);

  const ens = useEnsNames(ensAddresses);

  const filteredLocks = useMemo(() => {
    let list = locks;
    if (lockFilter === "active") {
      list = locks.filter((l) => l.isActive && Number(l.amount) > 0 && !l.isExiting);
    } else if (lockFilter === "exiting") {
      list = locks.filter((l) => l.isExiting);
    } else if (lockFilter === "delegated") {
      list = locks.filter((l) => l.isDelegated && l.isActive && !l.isExiting);
    } else if (lockFilter === "claimable") {
      list = locks.filter((l) => {
        if (!l.isExiting || !l.exitDate) return false;
        return new Date(l.exitDate).getTime() <= Date.now();
      });
    }
    return [...list].sort((a, b) => compareLocks(a, b, lockSort));
  }, [locks, lockFilter, lockSort]);

  /**
   * Prefer BondedVotes breakdown from indexer (locked + bonded + vesting).
   * Fallback: escrow votes + operator bonds (pre-migration).
   */
  const powerHolders = useMemo(() => {
    const hasBreakdown = delegations.some(
      (d) =>
        Number(d.lockedVotes) > 0 ||
        Number(d.bondedVotes) > 0 ||
        Number(d.vestingVotes) > 0
    );
    const byAddr = new Map();

    for (const d of delegations) {
      const key = String(d.account || "").toLowerCase();
      if (!key) continue;
      if (hasBreakdown) {
        const lockedVotes = Number(d.lockedVotes) || 0;
        const bondedVotes = Number(d.bondedVotes) || 0;
        const vestingVotes = Number(d.vestingVotes) || 0;
        const votes = Number(d.votes) || lockedVotes + bondedVotes + vestingVotes;
        if (votes <= 0) continue;
        byAddr.set(key, {
          account: d.account,
          lockedVotes,
          bondedVotes,
          vestingVotes,
          votes,
        });
      } else {
        const lockedVotes = Number(d.votes) || 0;
        if (lockedVotes <= 0) continue;
        byAddr.set(key, {
          account: d.account,
          lockedVotes,
          bondedVotes: 0,
          vestingVotes: 0,
          votes: lockedVotes,
        });
      }
    }

    if (!hasBreakdown) {
      for (const [key, row] of bondedByOwner) {
        const bondedVotes = Number(row.bonded) || 0;
        if (bondedVotes <= 0) continue;
        const prev = byAddr.get(key);
        if (prev) {
          prev.bondedVotes = bondedVotes;
          prev.votes = (Number(prev.lockedVotes) || 0) + bondedVotes;
        } else {
          byAddr.set(key, {
            account: row.account,
            lockedVotes: 0,
            bondedVotes,
            vestingVotes: 0,
            votes: bondedVotes,
          });
        }
      }
    }

    return [...byAddr.values()].filter((d) => Number(d.votes) > 0);
  }, [delegations, bondedByOwner]);

  const totalVotes = useMemo(
    () => powerHolders.reduce((s, d) => s + (Number(d.votes) || 0), 0),
    [powerHolders]
  );

  const totalBondedVotes = useMemo(
    () => powerHolders.reduce((s, d) => s + (Number(d.bondedVotes) || 0), 0),
    [powerHolders]
  );

  const totalVestingVotes = useMemo(
    () => powerHolders.reduce((s, d) => s + (Number(d.vestingVotes) || 0), 0),
    [powerHolders]
  );

  const sortedDelegates = useMemo(() => {
    const list = [...powerHolders];
    list.sort((a, b) => {
      const cmp =
        delSort === "votes-asc"
          ? (Number(a.votes) || 0) - (Number(b.votes) || 0)
          : (Number(b.votes) || 0) - (Number(a.votes) || 0);
      return cmp || String(a.account || "").localeCompare(String(b.account || ""));
    });
    return list;
  }, [powerHolders, delSort]);

  const totalLocked = Number(stats?.totalLocked) || 0;
  const exiting = Number(stats?.currentExiting) || 0;

  return (
    <div className="gov-page">
      <div className="section-head">
        <h2>Governance voting power</h2>
        <p>
          Active votes from{" "}
          <a
            className="gov-inline-link"
            href="https://etherscan.io/address/0x028deEA644258c78b1B5B2eacF469F5D781Fb43E"
            target="_blank"
            rel="noreferrer"
          >
            BondedVotes
          </a>
          : <strong>delegated locked</strong> (veFOLD) + <strong>bonded</strong> ciphernode FOLD +{" "}
          <strong>vesting</strong> schedule-locked FOLD (airdrop / claim allocations still locked in
          wallet). To vote or create proposals, use the{" "}
          <a className="gov-inline-link" href={OFFICIAL_GOV} target="_blank" rel="noreferrer">
            official governance app
          </a>
          . See{" "}
          <a
            className="gov-inline-link"
            href="https://docs.theinterfold.com/governance"
            target="_blank"
            rel="noreferrer"
          >
            docs · Voting power
          </a>
          {" · "}
          <a
            className="gov-inline-link"
            href={`https://etherscan.io/token/${VE_FOLD_NFT}`}
            target="_blank"
            rel="noreferrer"
          >
            veFOLD NFT
          </a>
          {onOpenDao ? (
            <>
              {" · "}
              <button type="button" className="gov-inline-link" onClick={onOpenDao}>
                DAO proposals
              </button>
            </>
          ) : null}
        </p>
      </div>

      <div className="gov-howto" aria-label="How voting power works">
        <div>
          <strong>1. Lock</strong>
          <span>FOLD enters escrow, you get veFOLD NFT</span>
        </div>
        <div>
          <strong>2. Delegate / bond / vest</strong>
          <span>Locks need a delegate; bond + vesting count automatically</span>
        </div>
        <div>
          <strong>3. Exit</strong>
          <span>Begin withdraw → NFT moves to escrow, votes stop, then claim after cooldown</span>
        </div>
      </div>

      <div className="gov-kpis" aria-label="Governance gauges">
        <article className="gov-kpi">
          <Icon icon={VoteIcon} size={18} />
          <div>
            <span className="mono">Active voting power</span>
            <strong>
              <FoldIcon className="gov-kpi__fold" size={18} />
              {num(totalVotes, 2)}
            </strong>
            <em className="gov-kpi__hint gov-vp-break">
              <span className="gov-vp-chip gov-vp-chip--locked">locked</span>
              <span className="gov-vp-chip gov-vp-chip--bonded">
                {num(totalBondedVotes, 2)} bonded
              </span>
              <span className="gov-vp-chip gov-vp-chip--vesting">
                {num(totalVestingVotes, 2)} vesting
              </span>
            </em>
          </div>
        </article>
        <article className="gov-kpi">
          <Icon icon={UserMultiple02Icon} size={18} />
          <div>
            <span className="mono">Power holders</span>
            <strong>{num(sortedDelegates.length)}</strong>
          </div>
        </article>
        <article className="gov-kpi">
          <Icon icon={Coins01Icon} size={18} />
          <div>
            <span className="mono">Total locked</span>
            <strong>
              <FoldIcon className="gov-kpi__fold" size={18} />
              {num(totalLocked, 2)}
            </strong>
            {priceUsd != null ? (
              <em className="gov-kpi__usd">{formatUsd(totalLocked, priceUsd)}</em>
            ) : null}
          </div>
        </article>
        <article className="gov-kpi">
          <Icon icon={HierarchySquare01Icon} size={18} />
          <div>
            <span className="mono">veFOLD NFTs</span>
            <strong>{num(stats?.activeLockCount ?? locks.filter((l) => l.isActive).length)}</strong>
          </div>
        </article>
        <article className="gov-kpi">
          <Icon icon={LinkSquare01Icon} size={18} />
          <div>
            <span className="mono">Exiting FOLD</span>
            <strong>
              <FoldIcon className="gov-kpi__fold" size={18} />
              {num(exiting, 2)}
            </strong>
            <em className="gov-kpi__hint">
              {num(stats?.exitingLockCount || 0)} position
              {Number(stats?.exitingLockCount || 0) === 1 ? "" : "s"}
            </em>
          </div>
        </article>
      </div>

      <section className="gov-block gov-block--tabbed">
        <div className="gov-block__head gov-block__head--tabs">
          <div className="gov-tabs" role="tablist" aria-label="Governance tables">
            <div className="dash-tab-bar">
              <button
                type="button"
                role="tab"
                id="gov-tab-locks"
                aria-selected={govTab === "locks"}
                aria-controls="gov-panel-locks"
                className={`dash-tab${govTab === "locks" ? " is-active" : ""}`}
                onClick={() => setGovTab("locks")}
              >
                Lock positions
                <span className="gov-tab__count mono">{num(filteredLocks.length)}</span>
              </button>
              <button
                type="button"
                role="tab"
                id="gov-tab-delegates"
                aria-selected={govTab === "delegates"}
                aria-controls="gov-panel-delegates"
                className={`dash-tab${govTab === "delegates" ? " is-active" : ""}`}
                onClick={() => setGovTab("delegates")}
              >
                Delegates
                <span className="gov-tab__count mono">{num(sortedDelegates.length)}</span>
              </button>
            </div>
            <p className="gov-block__sub">
              {govTab === "locks"
                ? "Each veFOLD NFT. Amount is what that NFT locked — not total voting power (see Delegates)."
                : "BondedVotes totals: locked, bonded, and vesting. Foundation & Gnosis Guild wallets are marked as non-voting."}
            </p>
          </div>
          {govTab === "locks" ? (
            <div className="gov-block__tools">
              <div className="event-filters gov-filters" role="group" aria-label="Lock filter">
                {[
                  { id: "active", label: "Active" },
                  { id: "delegated", label: "Delegated" },
                  { id: "exiting", label: "Exiting" },
                  { id: "claimable", label: "Claimable" },
                  { id: "all", label: "All" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`filter-chip${lockFilter === f.id ? " is-active" : ""}`}
                    onClick={() => setLockFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="op-sort-bar">
                <label className="op-sort-bar__label" htmlFor="gov-lock-sort">
                  <Icon icon={Sorting01Icon} size={14} />
                  Sort
                </label>
                <select
                  id="gov-lock-sort"
                  className="op-sort-bar__select mono"
                  value={lockSort}
                  onChange={(e) => setLockSort(e.target.value)}
                >
                  {LOCK_SORT.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="op-sort-bar">
              <label className="op-sort-bar__label" htmlFor="gov-del-sort">
                <Icon icon={Sorting01Icon} size={14} />
                Sort
              </label>
              <select
                id="gov-del-sort"
                className="op-sort-bar__select mono"
                value={delSort}
                onChange={(e) => setDelSort(e.target.value)}
              >
                {DEL_SORT.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {govTab === "locks" ? (
          <div
            id="gov-panel-locks"
            role="tabpanel"
            aria-labelledby="gov-tab-locks"
            className="gov-tab-panel"
          >
            {!filteredLocks.length ? (
              <div className="empty">No locks in this filter.</div>
            ) : (
              <div className="table-wrap">
                <table className="ops-table gov-table">
                  <thead>
                    <tr>
                      <th>veFOLD</th>
                      <th>Locker</th>
                      <th>Locked</th>
                      <th>Votes to</th>
                      <th>Status</th>
                      <th>Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLocks.map((l) => {
                      const st = lockStatus(l);
                      const ownerEns = ens[String(l.owner || "").toLowerCase()] || null;
                      const delEns = ens[String(l.delegatee || "").toLowerCase()] || null;
                      const amt = Number(l.amount) || 0;
                      const when =
                        formatWhenShort(l.createdAt) ||
                        (l.createdBlock != null ? `block ${num(l.createdBlock)}` : null);
                      const exitSub = exitSublabel(l, nowMs);
                      const inEscrow =
                        l.nftOwner && String(l.nftOwner).toLowerCase() === ESCROW.toLowerCase();
                      return (
                        <tr key={l.tokenId} className={l.isExiting ? "op-row is-exiting" : undefined}>
                          <td>
                            <a
                              className="addr mono gov-tx"
                              href={nftUrl(l.tokenId)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              #{l.tokenId}
                            </a>
                            {when ? (
                              <div className="ticket-cell__sub mono">locked {when}</div>
                            ) : null}
                            {inEscrow ? (
                              <div className="ticket-cell__sub mono">NFT in escrow</div>
                            ) : null}
                          </td>
                          <td>
                            <AddrLink address={l.owner} ens={ownerEns} />
                          </td>
                          <td>
                            <div className="ticket-cell">
                              <span className="ticket-cell__main">
                                <FoldIcon size={14} /> {num(amt, 2)}
                              </span>
                              {priceUsd != null ? (
                                <span className="ticket-cell__sub">{formatUsd(amt, priceUsd)}</span>
                              ) : null}
                            </div>
                          </td>
                          <td>
                            {l.isDelegated && l.delegatee ? (
                              <AddrLink address={l.delegatee} ens={delEns} />
                            ) : (
                              <span className="mono muted">—</span>
                            )}
                          </td>
                          <td>
                            <Pill kind={st.kind === "ok" ? undefined : st.kind}>{st.label}</Pill>
                            {exitSub ? <div className="ticket-cell__sub mono">{exitSub}</div> : null}
                          </td>
                          <td>
                            {l.createdTx ? <TxLink hash={l.createdTx} label="lock" /> : null}
                            {l.exitTx ? (
                              <div className="ticket-cell__sub">
                                <TxLink hash={l.exitTx} label="exit" />
                              </div>
                            ) : null}
                            {!l.createdTx && !l.exitTx ? (
                              <span className="mono muted">—</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div
            id="gov-panel-delegates"
            role="tabpanel"
            aria-labelledby="gov-tab-delegates"
            className="gov-tab-panel"
          >
            {!sortedDelegates.length ? (
              <div className="empty">
                No active voting power indexed. Run{" "}
                <span className="mono">npm run backfill:governance</span> and ensure operators are
                loaded.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="ops-table gov-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Address</th>
                      <th>veFOLD</th>
                      <th>Voting power</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedDelegates.map((d, i) => {
                      const accKey = String(d.account || "").toLowerCase();
                      const accEns = ens[accKey] || null;
                      const votes = Number(d.votes) || 0;
                      const pct = sharePct(votes, totalVotes);
                      const nfts = nftsByOwner.get(accKey) || [];
                      const nonVoting = NON_VOTING[accKey] || null;
                      return (
                        <tr key={accKey} className={nonVoting ? "gov-row--nonvoting" : undefined}>
                          <td className="mono">{i + 1}</td>
                          <td>
                            <AddrLink address={d.account} ens={accEns} />
                            {nonVoting ? (
                              <div className="gov-nonvoting mono">
                                <span className="gov-nonvoting__label">{nonVoting.label}</span>
                                <span className="gov-nonvoting__note">{nonVoting.note}</span>
                              </div>
                            ) : null}
                          </td>
                          <td className="gov-table__nfts">
                            <NftChips tokenIds={nfts} />
                          </td>
                          <td>
                            <div className="ticket-cell">
                              <span className="ticket-cell__main">
                                <FoldIcon size={14} /> {num(votes, 2)} FOLD
                              </span>
                              <VotesBreakdown
                                lockedVotes={d.lockedVotes}
                                bondedVotes={d.bondedVotes}
                                vestingVotes={d.vestingVotes}
                              />
                              {priceUsd != null ? (
                                <span className="ticket-cell__sub">{formatUsd(votes, priceUsd)}</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="mono">
                            {pct < 0.05 && pct > 0 ? "<0.1%" : `${pct.toFixed(1)}%`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
