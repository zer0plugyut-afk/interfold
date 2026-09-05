/**
 * Latest pending exit request per operator, derived from timeline events.
 * Prefer this over bonding.hasExitInProgress when that view lags or only
 * covers AssetsQueuedForExit.
 *
 * @param {Array<{ event?: string, args?: object, blockNumber?: number }>} timeline
 * @returns {Map<string, { unlockAt: string|number|null, blockNumber: number, event: string }>}
 */
export function exitRequestsByOperator(timeline) {
  const map = new Map();
  if (!Array.isArray(timeline)) return map;

  for (const e of timeline) {
    if (
      e?.event !== "CiphernodeDeregistrationRequested" &&
      e?.event !== "AssetsQueuedForExit"
    ) {
      continue;
    }
    const op = e.args?.operator;
    if (!op || typeof op !== "string") continue;
    const key = op.toLowerCase();
    const unlockAt = e.args?.unlockAt ?? e.args?.unlockTimestamp ?? null;
    const blockNumber = Number(e.blockNumber) || 0;
    const prev = map.get(key);
    if (!prev || blockNumber >= prev.blockNumber) {
      map.set(key, { unlockAt, blockNumber, event: e.event });
    }
  }

  for (const e of timeline) {
    if (e?.event !== "AssetsClaimed") continue;
    const op = e.args?.operator;
    if (!op || typeof op !== "string") continue;
    const key = op.toLowerCase();
    const prev = map.get(key);
    const blockNumber = Number(e.blockNumber) || 0;
    if (prev && blockNumber >= prev.blockNumber) map.delete(key);
  }

  return map;
}

/**
 * @param {object[]} operators
 * @param {Array} timeline
 */
export function enrichOperatorsWithExits(operators, timeline) {
  const exits = exitRequestsByOperator(timeline);
  if (!operators?.length) return [];

  return operators.map((o) => {
    const fromEvent = exits.get(String(o.address || "").toLowerCase());
    if (!fromEvent && !o.hasExitInProgress) return o;
    return {
      ...o,
      hasExitInProgress: true,
      exitUnlockAt: fromEvent?.unlockAt ?? o.exitUnlockAt ?? null,
      exitEvent: fromEvent?.event ?? o.exitEvent ?? null,
    };
  });
}
