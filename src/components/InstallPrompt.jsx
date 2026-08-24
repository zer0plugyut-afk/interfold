import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  closeInstall,
  getInstallPlatform,
  isDismissed,
  isStandaloneDisplay,
  snoozeInstall,
} from "../lib/pwaInstall";

/**
 * Same pattern as typical installable PWAs: only show when the browser
 * handed us beforeinstallprompt — so Install actually works.
 * Captures an early event stored on window by index.html.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const platform = getInstallPlatform();

  useEffect(() => {
    if (isStandaloneDisplay()) return undefined;
    if (isDismissed()) return undefined;

    const takeEvent = (e) => {
      if (!e) return;
      try {
        e.preventDefault();
      } catch {
        /* already prevented by early listener */
      }
      setDeferred(e);
    };

    // Event may have fired before React mounted
    if (window.__ifDeferredInstall) {
      takeEvent(window.__ifDeferredInstall);
      window.__ifDeferredInstall = null;
    }

    const onBip = (e) => {
      takeEvent(e);
      window.__ifDeferredInstall = null;
    };

    const onReady = () => {
      if (window.__ifDeferredInstall) {
        takeEvent(window.__ifDeferredInstall);
        window.__ifDeferredInstall = null;
      }
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      window.__ifDeferredInstall = null;
      closeInstall();
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("if-install-ready", onReady);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("if-install-ready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Show only once we have a real install prompt (hl.eco-style)
  useEffect(() => {
    if (!deferred || isDismissed() || isStandaloneDisplay()) return undefined;

    const show = () => setVisible(true);
    // Brief delay so it doesn't flash on first paint; also after light scroll
    const timer = window.setTimeout(show, 1200);
    const onScroll = () => {
      if (window.scrollY >= 120) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [deferred]);

  if (!visible || !deferred) return null;

  const hide = (ms) => {
    snoozeInstall(ms);
    setVisible(false);
  };

  const onInstall = async () => {
    setBusy(true);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      window.__ifDeferredInstall = null;
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
          <p className="install-prompt__title">
            Install Interfold Board as an app on your {platform}
          </p>
          <div className="install-prompt__actions">
            <button
              type="button"
              className="install-prompt__install"
              disabled={busy}
              onClick={onInstall}
            >
              Install
            </button>
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
