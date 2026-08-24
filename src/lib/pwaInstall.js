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

export function isIosSafari() {
  const ua = navigator.userAgent || "";
  const iOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/i.test(ua);
  const chrome = /CriOS|FxiOS|EdgiOS|OPiOS|Chrome/i.test(ua) && !/Safari/i.test(ua);
  return iOS && webkit && !chrome;
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

export { REMIND_MS, CLOSE_MS };
