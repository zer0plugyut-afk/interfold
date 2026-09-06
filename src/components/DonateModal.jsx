import { useEffect, useId, useRef, useState } from "react";
import {
  Cancel01Icon,
  Copy01Icon,
  FavouriteIcon,
  Layers01Icon,
  LinkSquare01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { etherscanAddress } from "../lib/format";
import { Icon } from "./Icon";

export const DONATE_ADDRESS = "0xA9151da22b587654652A89AB61A5473DC218DedA";

const ICON_CDN =
  "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color";

const TOKEN_CHIPS = [
  { id: "fold", label: "FOLD", src: "/fold.jpg" },
  { id: "eth", label: "ETH", src: `${ICON_CDN}/eth.png` },
  { id: "usdc", label: "USDC", src: `${ICON_CDN}/usdc.png` },
  { id: "usdt", label: "USDT", src: `${ICON_CDN}/usdt.png` },
  { id: "any", label: "Any ERC-20", src: null },
];

/**
 * @param {{ open: boolean, onClose: () => void }} props
 */
export function DonateModal({ open, onClose }) {
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeTimer = useRef(null);
  const copyTimer = useRef(null);

  useEffect(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (open) {
      const raf = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(raf);
    }
    if (mounted) {
      setMounted(false);
    }
    return undefined;
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, [open, onClose]);

  if (!open && !mounted) return null;

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(DONATE_ADDRESS);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={`donate-root${mounted && open ? " is-open" : ""}`} role="presentation">
      <button
        type="button"
        className="donate-backdrop"
        aria-label="Close donate"
        onClick={onClose}
      />
      <aside
        className="donate-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button type="button" className="donate-close" onClick={onClose} aria-label="Close">
          <Icon icon={Cancel01Icon} size={18} />
        </button>

        <div className="donate-card">
          <div className="donate-card__glow" aria-hidden />
          <div className="donate-card__icon">
            <Icon icon={FavouriteIcon} size={22} />
          </div>
          <p className="donate-card__kicker mono">Support the board</p>
          <h2 id={titleId}>Keep Interfold Board running</h2>
          <p className="donate-card__lede">
            This is an unofficial community dashboard. Donations help with hosting, indexing,
            and continued updates — thank you.
          </p>

          <div className="donate-chips" aria-label="Accepted tokens">
            {TOKEN_CHIPS.map((t) => (
              <span
                key={t.id}
                className={`donate-chip${t.id === "fold" ? " donate-chip--fold" : ""}`}
              >
                {t.src ? (
                  <img className="donate-chip__logo" src={t.src} alt="" width={16} height={16} />
                ) : (
                  <Icon
                    icon={Layers01Icon}
                    className="donate-chip__logo donate-chip__logo--any"
                    size={14}
                  />
                )}
                {t.label}
              </span>
            ))}
          </div>
          <p className="donate-accept mono">We accept all tokens on Ethereum · FOLD welcome</p>

          <div className="donate-addr-block">
            <span className="donate-addr-label mono">Receive address</span>
            <code className="donate-addr mono">{DONATE_ADDRESS}</code>
            <div className="donate-addr-actions">
              <button type="button" className="donate-action" onClick={copyAddress}>
                {copied ? (
                  <Icon icon={Tick02Icon} size={15} />
                ) : (
                  <Icon icon={Copy01Icon} size={15} />
                )}
                {copied ? "Copied" : "Copy address"}
              </button>
              <a
                className="donate-action donate-action--link"
                href={etherscanAddress(DONATE_ADDRESS)}
                target="_blank"
                rel="noreferrer"
              >
                Etherscan <Icon icon={LinkSquare01Icon} size={13} />
              </a>
            </div>
          </div>

          <p className="donate-note">
            Send any ERC-20 or ETH to this address. No custody of protocol funds — this wallet is
            only for voluntary board support.
          </p>
        </div>
      </aside>
    </div>
  );
}

export function DonateButton({ onClick, className = "", iconOnly = false }) {
  return (
    <button
      type="button"
      className={`donate-btn ${className}`.trim()}
      onClick={onClick}
      aria-label={iconOnly ? "Donate" : undefined}
      title={iconOnly ? "Donate" : undefined}
    >
      <Icon icon={FavouriteIcon} size={14} />
      {iconOnly ? null : "Donate"}
    </button>
  );
}
