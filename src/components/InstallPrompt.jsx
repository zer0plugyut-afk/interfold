import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  closeInstall,
  getInstallPlatform,
  isDismissed,
  isIosSafari,
  isStandaloneDisplay,
  snoozeInstall,
} from "../lib/pwaInstall";

/**
 * Custom install banner (beforeinstallprompt + iOS Add to Home Screen).
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const platform = getInstallPlatform();

  useEffect(() => {
    if (isStandaloneDisplay() || isDismissed()) return undefined;

    const onBip = (e) => {
      e.preventDefault();
      setDeferred(e);
      setIosHint(false);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBip);

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      closeInstall();
    };
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires beforeinstallprompt — show Add to Home Screen tip
    let iosTimer;
    if (isIosSafari()) {
      iosTimer = window.setTimeout(() => {
        if (!isDismissed() && !isStandaloneDisplay()) {
          setIosHint(true);
          setVisible(true);
        }
      }, 1800);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  if (!visible) return null;

  const hide = (ms) => {
    snoozeInstall(ms);
    setVisible(false);
  };

  const onInstall = async () => {
    if (iosHint || !deferred) return;
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

  const title = iosHint
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
          {iosHint ? (
            <p className="install-prompt__hint">
              Tap Share, then <strong>Add to Home Screen</strong>.
            </p>
          ) : null}
          <div className="install-prompt__actions">
            {!iosHint ? (
              <button
                type="button"
                className="install-prompt__install"
                disabled={busy || !deferred}
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
