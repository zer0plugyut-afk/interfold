const DISMISS_KEY = "if-install-dismiss-until";
const REMIND_MS = 7 * 24 * 60 * 60 * 1000;
const CLOSE_MS = 14 * 24 * 60 * 60 * 1000;

export function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export function getInstallPlatform() {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS X|Macintosh/i.test(ua) && !/iPhone|iPad|iPod/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "your device";
}

export function isIosDevice() {
  const ua = navigator.userAgent || "";
  return (
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isIosSafari() {
  const ua = navigator.userAgent || "";
  if (!isIosDevice()) return false;
  // Real Safari on iOS — exclude Chrome/Firefox/Edge/Opera iOS shells
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/i.test(ua);
}

export function installHintForPlatform(platform) {
  if (platform === "iOS") {
    return "Tap Share, then Add to Home Screen.";
  }
  if (platform === "Android") {
    return "Open the browser menu (⋮) and tap Install app or Add to Home screen.";
  }
  if (platform === "Windows" || platform === "Mac" || platform === "Linux") {
    return "Use the install icon in the address bar, or browser menu → Install Interfold Board…";
  }
  return "Use your browser menu to install this site as an app.";
}

export function isDismissed() {
  const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return Number.isFinite(until) && until > Date.now();
}

export function snoozeInstall(ms = REMIND_MS) {
  localStorage.setItem(DISMISS_KEY, String(Date.now() + ms));
}

export function closeInstall() {
  snoozeInstall(CLOSE_MS);
}

/** Clear snooze so the banner can show again after a deploy/fix. */
export function clearInstallSnooze() {
  localStorage.removeItem(DISMISS_KEY);
}

export { REMIND_MS, CLOSE_MS };
