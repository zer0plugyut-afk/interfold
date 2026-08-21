export function Pill({ children, kind = "ok" }) {
  return <span className={`pill pill--${kind}`}>{children}</span>;
}
