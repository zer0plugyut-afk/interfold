import { Contract, formatUnits, getAddress } from "ethers";
import { BONDED_VOTES, CONTRACTS, TOKENS } from "./contracts.js";

function num(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const s = String(v);
  if (/^\d+$/.test(s)) return Number(s);
  return Number(s);
}

function toIsoFromUnix(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
}

function eventTimeIso(ev) {
  if (ev?.block_timestamp) {
    const d = new Date(ev.block_timestamp);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/**
 * Rebuild lock + delegation projections from indexed events, then enrich
 * with a few cheap on-chain reads (totalLocked / exit queue / getVotes).
 */
export async function refreshGovernance(sb, provider, loadAbi) {
  const escrowCfg = CONTRACTS.escrow;
  const adapterCfg = CONTRACTS.escrowIvotes;
  const queueCfg = CONTRACTS.exitQueue;
  if (!escrowCfg || !adapterCfg) {
    console.log("[governance] contracts not configured — skip");
    return;
  }

  const { data: escrowEvents, error: e1 } = await sb
    .from("if_events")
    .select("event_name,args,block_number,tx_hash,block_timestamp,log_index")
    .eq("contract_key", escrowCfg.key)
    .order("block_number", { ascending: true })
    .order("log_index", { ascending: true });
  if (e1) throw e1;

  const { data: queueEvents, error: e2 } = await sb
    .from("if_events")
    .select("event_name,args,block_number,tx_hash,block_timestamp,log_index")
    .eq("contract_key", "exitQueue")
    .order("block_number", { ascending: true })
    .order("log_index", { ascending: true });
  if (e2) throw e2;

  const { data: adapterEvents, error: e3 } = await sb
    .from("if_events")
    .select("event_name,args,block_number,tx_hash,block_timestamp,log_index")
    .eq("contract_key", adapterCfg.key)
    .order("block_number", { ascending: true })
    .order("log_index", { ascending: true });
  if (e3) throw e3;

  /** @type {Map<number, object>} */
  const locks = new Map();

  for (const ev of escrowEvents || []) {
    const a = ev.args || {};
    const onchainAt = eventTimeIso(ev);
    if (ev.event_name === "Deposit") {
      const tokenId = num(a.tokenId);
      locks.set(tokenId, {
        token_id: tokenId,
        owner: a.depositor ? getAddress(a.depositor) : null,
        amount: Number(formatUnits(BigInt(String(a.value || "0")), 18)),
        start_ts: num(a.startTs) || null,
        is_active: true,
        is_exiting: false,
        is_delegated: false,
        delegatee: null,
        exit_holder: null,
        exit_date: null,
        created_block: ev.block_number,
        created_tx: ev.tx_hash,
        created_at: onchainAt,
        withdrawn_block: null,
        withdrawn_tx: null,
        updated_at: onchainAt || new Date().toISOString(),
      });
    } else if (ev.event_name === "Withdraw") {
      const tokenId = num(a.tokenId);
      const prev = locks.get(tokenId) || { token_id: tokenId };
      locks.set(tokenId, {
        ...prev,
        token_id: tokenId,
        owner: a.depositor ? getAddress(a.depositor) : prev.owner || null,
        amount: 0,
        is_active: false,
        is_exiting: false,
        is_delegated: false,
        delegatee: null,
        exit_holder: null,
        exit_date: null,
        withdrawn_block: ev.block_number,
        withdrawn_tx: ev.tx_hash,
        updated_at: onchainAt || prev.updated_at || new Date().toISOString(),
      });
    } else if (ev.event_name === "Merged") {
      const fromId = num(a._from);
      const toId = num(a._to);
      const from = locks.get(fromId);
      const to = locks.get(toId) || { token_id: toId, is_active: true };
      locks.set(fromId, {
        ...(from || { token_id: fromId }),
        amount: 0,
        is_active: false,
        is_exiting: false,
        updated_at: onchainAt || new Date().toISOString(),
      });
      locks.set(toId, {
        ...to,
        token_id: toId,
        owner: a._sender ? getAddress(a._sender) : to.owner || null,
        amount: Number(formatUnits(BigInt(String(a._amountFinal || "0")), 18)),
        is_active: true,
        created_at: to.created_at || onchainAt,
        updated_at: onchainAt || new Date().toISOString(),
      });
    } else if (ev.event_name === "Split") {
      const fromId = num(a._from);
      const newId = num(a.newTokenId);
      const from = locks.get(fromId) || { token_id: fromId };
      locks.set(fromId, {
        ...from,
        amount: Number(formatUnits(BigInt(String(a._splitAmount1 || "0")), 18)),
        owner: a._sender ? getAddress(a._sender) : from.owner || null,
        is_active: true,
        updated_at: onchainAt || new Date().toISOString(),
      });
      locks.set(newId, {
        token_id: newId,
        owner: a._sender ? getAddress(a._sender) : null,
        amount: Number(formatUnits(BigInt(String(a._splitAmount2 || "0")), 18)),
        start_ts: from.start_ts || null,
        is_active: true,
        is_exiting: false,
        is_delegated: false,
        delegatee: null,
        exit_holder: null,
        exit_date: null,
        created_block: ev.block_number,
        created_tx: ev.tx_hash,
        created_at: onchainAt,
        withdrawn_block: null,
        withdrawn_tx: null,
        updated_at: onchainAt || new Date().toISOString(),
      });
    }
  }

  for (const ev of queueEvents || []) {
    const a = ev.args || {};
    const tokenId = num(a.tokenId);
    if (!tokenId) continue;
    const onchainAt = eventTimeIso(ev);
    const prev = locks.get(tokenId) || {
      token_id: tokenId,
      amount: 0,
      is_active: true,
      is_exiting: false,
    };
    if (ev.event_name === "ExitQueued") {
      locks.set(tokenId, {
        ...prev,
        is_exiting: true,
        exit_holder: a.holder ? getAddress(a.holder) : null,
        exit_date: toIsoFromUnix(a.exitDate),
        exit_tx: ev.tx_hash,
        updated_at: onchainAt || new Date().toISOString(),
      });
    } else if (ev.event_name === "ExitCancelled") {
      locks.set(tokenId, {
        ...prev,
        is_exiting: false,
        exit_holder: null,
        exit_date: null,
        exit_tx: null,
        updated_at: onchainAt || new Date().toISOString(),
      });
    } else if (ev.event_name === "Exit") {
      // Still exiting until Withdraw burns the lock — keep flag if amount remains.
      locks.set(tokenId, {
        ...prev,
        is_exiting: Number(prev.amount) > 0,
        updated_at: onchainAt || new Date().toISOString(),
      });
    }
  }

  /** @type {Map<string, object>} */
  const delegations = new Map();
  /** tokenId → currently delegated to */
  const tokenDelegate = new Map();

  for (const ev of adapterEvents || []) {
    const a = ev.args || {};
    const onchainAt = eventTimeIso(ev);
    if (ev.event_name === "DelegateChanged") {
      const account = a.delegator ? getAddress(a.delegator) : null;
      if (!account) continue;
      const prev = delegations.get(account) || { account, votes: 0 };
      delegations.set(account, {
        ...prev,
        account,
        delegatee: a.toDelegate ? getAddress(a.toDelegate) : null,
        updated_block: ev.block_number,
        updated_tx: ev.tx_hash,
        updated_at: onchainAt || new Date().toISOString(),
      });
    } else if (ev.event_name === "DelegateVotesChanged") {
      const account = a.delegate ? getAddress(a.delegate) : null;
      if (!account) continue;
      const prev = delegations.get(account) || { account, delegatee: account };
      delegations.set(account, {
        ...prev,
        account,
        votes: Number(formatUnits(BigInt(String(a.newBalance || "0")), 18)),
        updated_block: ev.block_number,
        updated_tx: ev.tx_hash,
        updated_at: onchainAt || new Date().toISOString(),
      });
    } else if (ev.event_name === "TokensDelegated") {
      const delegatee = a.delegatee ? getAddress(a.delegatee) : null;
      const ids = Array.isArray(a.tokenIds) ? a.tokenIds : [];
      for (const id of ids) tokenDelegate.set(num(id), delegatee);
    } else if (ev.event_name === "TokensUndelegated") {
      const ids = Array.isArray(a.tokenIds) ? a.tokenIds : [];
      for (const id of ids) tokenDelegate.set(num(id), null);
    }
  }

  for (const [, lock] of locks) {
    const del = tokenDelegate.get(lock.token_id);
    lock.is_delegated = del != null;
    lock.delegatee = del || null;
  }

  const nft = new Contract(
    TOKENS.veFoldNft,
    [
      "function ownerOf(uint256 tokenId) view returns (address)",
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    ],
    provider
  );
  const adapter = new Contract(adapterCfg.address, loadAbi(adapterCfg.abiFile), provider);
  const escrowAddr = getAddress(escrowCfg.address);

  // Load veFOLD Transfer events (indexed) — beginWithdrawal = Transfer → escrow.
  const { data: nftEvents, error: e4 } = await sb
    .from("if_events")
    .select("event_name,args,block_number,tx_hash,block_timestamp,log_index")
    .eq("contract_key", "veFoldNft")
    .eq("event_name", "Transfer")
    .order("block_number", { ascending: true })
    .order("log_index", { ascending: true });
  if (e4) console.warn("[governance] veFoldNft events", e4.message);

  /** tokenId → last transfer into escrow (begin withdraw) */
  const exitByNft = new Map();
  for (const ev of nftEvents || []) {
    const a = ev.args || {};
    const tokenId = num(a.tokenId);
    const to = a.to ? getAddress(a.to) : null;
    const from = a.from ? getAddress(a.from) : null;
    if (!tokenId || !to || !from) continue;
    if (to === escrowAddr && from !== "0x0000000000000000000000000000000000000000") {
      exitByNft.set(tokenId, {
        from,
        tx: ev.tx_hash,
        at: eventTimeIso(ev),
        block: ev.block_number,
      });
    }
    // Transfer out of escrow (withdraw/claim) clears exit
    if (from === escrowAddr) {
      exitByNft.delete(tokenId);
    }
  }

  // Reconcile exit + NFT holder from live contracts + NFT transfers.
  if (queueCfg) {
    const queue = new Contract(queueCfg.address, loadAbi(queueCfg.abiFile), provider);
    for (const lock of locks.values()) {
      if (!lock.is_active || !(Number(lock.amount) > 0)) {
        lock.nft_owner = null;
        continue;
      }
      try {
        lock.nft_owner = getAddress(await nft.ownerOf(lock.token_id));
      } catch {
        lock.nft_owner = null;
      }

      const nftExit = exitByNft.get(lock.token_id);
      let hasTicket = false;
      try {
        const ticket = await queue.queue(lock.token_id);
        const holder = ticket?.holder || ticket?.[0];
        const exitDate = ticket?.exitDate ?? ticket?.[1];
        hasTicket =
          holder && String(holder) !== "0x0000000000000000000000000000000000000000";
        if (hasTicket) {
          lock.exit_holder = getAddress(holder);
          lock.exit_date = toIsoFromUnix(exitDate);
        }
      } catch {
        // ignore
      }

      const inEscrow = lock.nft_owner === escrowAddr;
      if (inEscrow || hasTicket || nftExit) {
        lock.is_exiting = true;
        lock.is_delegated = false;
        lock.delegatee = null;
        // Economic owner = who started exit (not the escrow contract).
        if (nftExit?.from) {
          lock.owner = nftExit.from;
          lock.exit_holder = lock.exit_holder || nftExit.from;
          lock.exit_tx = nftExit.tx;
          if (!lock.exit_date && nftExit.at) {
            // Fallback label time if queue has no event (storage-only ticket).
            lock.exit_date = nftExit.at;
          }
        } else if (lock.exit_holder) {
          lock.owner = lock.exit_holder;
        }
      } else {
        lock.is_exiting = false;
        lock.exit_holder = null;
        lock.exit_date = null;
        lock.exit_tx = null;
      }

      try {
        const onchainDel = await adapter.tokenIsDelegated(lock.token_id);
        if (!lock.is_exiting) {
          lock.is_delegated = Boolean(onchainDel);
          if (!onchainDel) lock.delegatee = null;
        }
      } catch {
        // keep event-derived flag
      }
    }
  }

  // Live voting-power snapshot via BondedVotes (official Aragon / CRISP source):
  // getVotes = escrow adapter getVotes + bonded + vesting (schedule-locked FOLD).
  const voteAccounts = new Set();
  for (const lock of locks.values()) {
    if (lock.owner) voteAccounts.add(lock.owner);
    if (lock.exit_holder) voteAccounts.add(lock.exit_holder);
    if (lock.delegatee) voteAccounts.add(lock.delegatee);
    if (lock.nft_owner) voteAccounts.add(lock.nft_owner);
  }
  for (const d of delegations.values()) {
    if (d.account) voteAccounts.add(d.account);
    if (d.delegatee) voteAccounts.add(d.delegatee);
  }

  // Ciphernode bond owners (bonded VP credits here).
  const { data: opsRows, error: opsErr } = await sb
    .from("if_operators")
    .select("address,bond_owner,ciphernode_bond");
  if (opsErr) console.warn("[governance] operators", opsErr.message);
  for (const o of opsRows || []) {
    if (o.bond_owner) voteAccounts.add(getAddress(o.bond_owner));
    else if (o.address) voteAccounts.add(getAddress(o.address));
  }

  // Vesting / airdrop schedule-lock holders (FOLD ActiveLockUpdated, etc.).
  const { data: foldLockEvents, error: flErr } = await sb
    .from("if_events")
    .select("args")
    .eq("contract_key", "foldLocks")
    .in("event_name", ["ActiveLockUpdated", "QueuedLockUpdated", "ActiveLockRelinked"]);
  if (flErr) console.warn("[governance] foldLocks events", flErr.message);
  for (const ev of foldLockEvents || []) {
    const acct = ev.args?.account;
    if (acct) {
      try {
        voteAccounts.add(getAddress(acct));
      } catch {
        /* skip */
      }
    }
  }

  const bondedVotes = new Contract(
    BONDED_VOTES,
    [
      "function getVotes(address) view returns (uint256)",
      "function checkpoints() view returns (address)",
    ],
    provider
  );
  let checkpointsAddr = null;
  try {
    checkpointsAddr = await bondedVotes.checkpoints();
  } catch (e) {
    console.warn("[governance] BondedVotes.checkpoints", e.shortMessage || e.message);
  }
  const checkpoints = checkpointsAddr
    ? new Contract(checkpointsAddr, ["function bonded(address) view returns (uint256)"], provider)
    : null;

  const liveDelegations = new Map();
  for (const account of voteAccounts) {
    if (!account || account === CONTRACTS.escrow.address) continue;
    try {
      const [totalBn, lockedBn, bondedBn, delegatee] = await Promise.all([
        bondedVotes.getVotes(account),
        adapter.getVotes(account),
        checkpoints ? checkpoints.bonded(account) : Promise.resolve(0n),
        adapter.delegates(account),
      ]);
      const votes = Number(formatUnits(totalBn, 18));
      const lockedVotes = Number(formatUnits(lockedBn, 18));
      const bondedVotesAmt = Number(formatUnits(bondedBn, 18));
      // Official app derives vesting as remainder so rows always sum to BondedVotes total.
      const vestingVotes = Math.max(0, votes - lockedVotes - bondedVotesAmt);
      if (votes <= 0 && lockedVotes <= 0 && bondedVotesAmt <= 0) continue;
      const prev = delegations.get(account) || {};
      liveDelegations.set(account, {
        account,
        delegatee:
          delegatee && delegatee !== "0x0000000000000000000000000000000000000000"
            ? getAddress(delegatee)
            : prev.delegatee || null,
        votes,
        locked_votes: lockedVotes,
        bonded_votes: bondedVotesAmt,
        vesting_votes: vestingVotes,
        updated_block: prev.updated_block || null,
        updated_tx: prev.updated_tx || null,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // skip
    }
  }

  const lockRows = [...locks.values()];

  if (lockRows.length) {
    for (let i = 0; i < lockRows.length; i += 200) {
      const chunk = lockRows.slice(i, i + 200);
      const { error } = await sb.from("if_locks").upsert(chunk, { onConflict: "token_id" });
      if (error) throw error;
    }
  }

  const delRows = [...liveDelegations.values()];
  if (delRows.length) {
    for (let i = 0; i < delRows.length; i += 200) {
      const chunk = delRows.slice(i, i + 200);
      const { error } = await sb.from("if_delegations").upsert(chunk, { onConflict: "account" });
      if (error) throw error;
    }
  }

  const escrow = new Contract(escrowCfg.address, loadAbi(escrowCfg.abiFile), provider);
  const latest = await provider.getBlockNumber();
  let totalLocked = "0";
  let currentExiting = "0";
  try {
    totalLocked = formatUnits(await escrow.totalLocked(), 18);
  } catch (e) {
    console.warn("[governance] totalLocked", e.shortMessage || e.message);
  }
  try {
    currentExiting = formatUnits(await escrow.currentExitingAmount(), 18);
  } catch {
    // optional
  }

  const activeLockCount = lockRows.filter((l) => l.is_active && Number(l.amount) > 0).length;
  const exitingLockCount = lockRows.filter((l) => l.is_exiting).length;
  // Official board lists wallets with getVotes > 0 (power they currently hold).
  const powerHolders = delRows.filter((d) => Number(d.votes) > 0);
  const totalDelegateVotes = powerHolders.reduce((s, d) => s + (Number(d.votes) || 0), 0);
  const totalVestingVotes = powerHolders.reduce((s, d) => s + (Number(d.vesting_votes) || 0), 0);
  const totalBondedVp = powerHolders.reduce((s, d) => s + (Number(d.bonded_votes) || 0), 0);

  const { error: gErr } = await sb.from("if_governance_stats").upsert({
    id: 1,
    total_locked: totalLocked,
    current_exiting: currentExiting,
    active_lock_count: activeLockCount,
    exiting_lock_count: exitingLockCount,
    delegated_account_count: powerHolders.length,
    total_delegate_votes: String(totalDelegateVotes),
    latest_block: latest,
    fetched_at: new Date().toISOString(),
  });
  if (gErr) throw gErr;

  console.log(
    `[governance] locks=${lockRows.length} active=${activeLockCount} exiting=${exitingLockCount} ` +
      `powerHolders=${powerHolders.length} totalVP=${totalDelegateVotes} ` +
      `(bonded=${totalBondedVp} vesting=${totalVestingVotes}) exitingFOLD=${currentExiting}`
  );
}
