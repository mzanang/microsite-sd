type PublicEventType = "page_view" | "session_start" | "link_click" | "download";
type PublicEvent = { eventType: PublicEventType; pagePath: string; pageTitle: string; targetUrl?: string };

const sessionKey = "sdn-analytics-session-id";
const visitorKey = "sdn-analytics-visitor-id";
const visitorExpiryKey = "sdn-analytics-visitor-expires";
const pageKeyPrefix = "sdn-analytics-page-view:";

function id() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().replaceAll("-", "");
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

function storedId(storage: Storage, key: string) {
  const value = storage.getItem(key);
  if (value) return value;
  const created = id();
  storage.setItem(key, created);
  return created;
}

function storedVisitorId() {
  const existing = window.localStorage.getItem(visitorKey);
  const expiresAt = Number(window.localStorage.getItem(visitorExpiryKey) || 0);
  if (existing && expiresAt > Date.now()) return existing;
  const created = id();
  window.localStorage.setItem(visitorKey, created);
  window.localStorage.setItem(visitorExpiryKey, String(Date.now() + 90 * 24 * 60 * 60 * 1000));
  return created;
}

function deviceCategory() {
  if (window.innerWidth < 768) return "mobile" as const;
  if (window.innerWidth < 1024) return "tablet" as const;
  return "desktop" as const;
}

function referrerSource() {
  const referrer = document.referrer;
  if (!referrer) return "direct" as const;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (host === window.location.hostname) return "direct" as const;
    if (/(google|bing|yahoo|duckduckgo)\./.test(host)) return "search" as const;
    if (/(facebook|instagram|tiktok|youtube|x|twitter)\./.test(host)) return "social" as const;
    return "referral" as const;
  } catch {
    return "unknown" as const;
  }
}

export function trackPublicEvent(event: PublicEvent) {
  if (typeof window === "undefined") return;
  const sessionId = storedId(window.sessionStorage, sessionKey);
  const visitorId = storedVisitorId();
  const payload = {
    event_type: event.eventType,
    page_path: event.pagePath,
    page_title: event.pageTitle,
    target_url: event.targetUrl,
    session_id: sessionId,
    visitor_id: visitorId,
    referrer_source: referrerSource(),
    device_category: deviceCategory(),
  };
  void fetch("/api/public/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), keepalive: true }).catch(() => undefined);
}

export function trackPublicPageView(pagePath: string, pageTitle: string) {
  if (typeof window === "undefined") return;
  const key = `${pageKeyPrefix}${pagePath}`;
  if (window.sessionStorage.getItem(key)) return;
  window.sessionStorage.setItem(key, "1");
  trackPublicEvent({ eventType: "session_start", pagePath, pageTitle });
  trackPublicEvent({ eventType: "page_view", pagePath, pageTitle });
}
