/** Official FOLD mark from /public/fold.jpg */
export function FoldIcon({ className = "", size = 18, alt = "FOLD" }) {
  return (
    <img
      className={`fold-icon ${className}`.trim()}
      src="/fold.jpg"
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      decoding="async"
    />
  );
}
