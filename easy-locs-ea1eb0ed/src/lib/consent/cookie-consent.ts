import { db } from "@/services/db";

export type CookieCategory = "necessary" | "analytics" | "marketing";

export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  consentedAt: string;
  version: number;
}

const CONSENT_KEY = "el_cookie_consent";
const CONSENT_VERSION = 1;

export function getConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasConsented(): boolean {
  return getConsent() !== null;
}

export function isCategoryAllowed(category: CookieCategory): boolean {
  if (category === "necessary") return true;
  const consent = getConsent();
  if (!consent) return false;
  return consent[category] === true;
}

export function setConsent(analytics: boolean, marketing: boolean): void {
  const consent: CookieConsent = {
    necessary: true,
    analytics,
    marketing,
    consentedAt: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));

  applyConsentToServices(consent);
  persistConsentToDb(consent);
}

export function acceptAll(): void {
  setConsent(true, true);
}

export function rejectAll(): void {
  setConsent(false, false);
}

export function revokeConsent(): void {
  localStorage.removeItem(CONSENT_KEY);
}

function applyConsentToServices(consent: CookieConsent): void {
  if (consent.analytics) {
    enableAnalytics();
  } else {
    disablePostHog();
    disableSentry();
  }
}

function enableAnalytics(): void {
  try {
    import("@/lib/analytics/posthog").then(({ initPostHog }) => {
      initPostHog();
    }).catch((err) => console.warn("[consent] PostHog init failed:", err));
    import("@/lib/analytics/sentry").then(({ initSentry }) => {
      initSentry();
    }).catch((err) => console.warn("[consent] Sentry init failed:", err));
  } catch (err) {
    console.warn("[consent] enableAnalytics failed:", err);
  }
}

function disablePostHog(): void {
  try {
    import("@/lib/analytics/posthog").then(({ posthog }) => {
      if (posthog && typeof posthog.opt_out_capturing === "function") {
        posthog.opt_out_capturing();
      }
    }).catch((err) => console.warn("[consent] PostHog disable failed:", err));
  } catch (err) {
    console.warn("[consent] disablePostHog failed:", err);
  }
}

function disableSentry(): void {
  try {
    import("@sentry/react").then((Sentry) => {
      if (Sentry && typeof Sentry.close === "function") {
        Sentry.close();
      }
    }).catch((err) => console.warn("[consent] Sentry disable failed:", err));
  } catch (err) {
    console.warn("[consent] disableSentry failed:", err);
  }
}

async function persistConsentToDb(consent: CookieConsent): Promise<void> {
  try {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;
    await db("cookie_consent_log").insert({
      user_id: user.id,
      analytics_accepted: consent.analytics,
      marketing_accepted: consent.marketing,
      consent_version: consent.version,
      ip_address: "client-side",
      user_agent: navigator.userAgent.slice(0, 200),
    });
  } catch (err) {
    console.warn("[consent] Failed to persist consent to DB:", err);
  }
}

export function shouldBlockAnalytics(): boolean {
  const consent = getConsent();
  if (!consent) return true;
  return !consent.analytics;
}

export function shouldBlockMarketing(): boolean {
  const consent = getConsent();
  if (!consent) return true;
  return !consent.marketing;
}
