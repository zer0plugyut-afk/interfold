import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  closeInstall,
  getInstallPlatform,
  installHintForPlatform,
  isDismissed,
  isIosDevice,
  isStandaloneDisplay,
  snoozeInstall,
} from "../lib/pwaInstall";

/**
 * Install banner — native beforeinstallprompt when available,
 * otherwise a visible how-to so it still appears on phone/desktop.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const platform = getInstallPlatform();
  const canNativeInstall = Boolean(deferred);

  useEffect(() => {
    if (isStandaloneDisplay()) return undefined;
    if (isDismissed()) return undefined;

    const onBip = (e) => {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBip);

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      closeInstall();
    };
    window.addEventListener("appinstalled", onInstalled);

    // Always show after a short delay so users see the card even when
    // Chromium has not fired beforeinstallprompt yet (or on iOS).
    const timer = window.setTimeout(() => {
      if (isDismissed() || isStandaloneDisplay()) return;
      setVisible(true);
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;

  const hide = (ms) => {
    snoozeInstall(ms);
    setVisible(false);
  };

  const onInstall = async () => {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice?.outcome === "accepted") {
        setVisible(false);
      } else {
        hide(7 * 24 * 60 * 60 * 1000);
      }
    } catch {
      hide(7 * 24 * 60 * 60 * 1000);
    } finally {
      setBusy(false);
    }
  };

  const title =
    isIosDevice() && !canNativeInstall
      ? "Add Interfold Board to your Home Screen"
      : `Install Interfold Board as an app on your ${platform}`;

  return (
    <aside className="install-prompt" role="dialog" aria-label="Install Interfold Board">
      <button
        type="button"
        className="install-prompt__close"
        aria-label="Dismiss"
        onClick={() => {
          closeInstall();
          setVisible(false);
        }}
      >
        <X size={16} aria-hidden />
      </button>

      <div className="install-prompt__row">
        <img
          className="install-prompt__icon"
          src="/icon-192.png"
          width={44}
          height={44}
          alt=""
        />
        <div className="install-prompt__body">
          <p className="install-prompt__title">{title}</p>
          {!canNativeInstall ? (
            <p className="install-prompt__hint">{installHintForPlatform(platform)}</p>
          ) : null}
          <div className="install-prompt__actions">
            {canNativeInstall ? (
              <button
                type="button"
                className="install-prompt__install"
                disabled={busy}
                onClick={onInstall}
              >
                Install
              </button>
            ) : null}
            <button
              type="button"
              className="install-prompt__later"
              onClick={() => hide(7 * 24 * 60 * 60 * 1000)}
            >
              Remind me later
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
