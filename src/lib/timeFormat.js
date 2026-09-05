/**
 * Format unix seconds (or ms) as a short relative unlock countdown.
 * @param {string|number|bigint|null|undefined} unix
 * @param {number} [nowMs]
 */
export function formatUnlockCountdown(unix, nowMs = Date.now()) {
  const sec = Number(unix);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  const target = sec > 1e12 ? sec : sec * 1000;
  const diff = target - nowMs;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const mins = Math.floor((abs % 3_600_000) / 60_000);

  let span;
  if (days > 0) span = `${days}d ${hours}h`;
  else if (hours > 0) span = `${hours}h ${mins}m`;
  else span = `${Math.max(1, mins)}m`;

  return diff > 0 ? `unlocks in ${span}` : `unlocked ${span} ago`;
}

/**
 * Human-readable UTC/local datetime from unix seconds (or ms).
 * @param {string|number|bigint|null|undefined} unix
 */
export function formatUnlockAt(unix) {
  const sec = Number(unix);
  if (!Number.isFinite(sec) || sec <= 0) return null;
  const ms = sec > 1e12 ? sec : sec * 1000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}
