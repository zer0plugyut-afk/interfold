/**
 * GA4 page views for hash-routed SPA panels.
 * Initial config uses send_page_view: false in index.html.
 */
export function trackPageView(path) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const pagePath = path || `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function initAnalytics() {
  trackPageView();
  window.addEventListener("hashchange", () => trackPageView());
}
