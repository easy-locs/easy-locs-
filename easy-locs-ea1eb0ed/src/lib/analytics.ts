import { isCategoryAllowed } from "@/lib/consent/cookie-consent";

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GA_ID = import.meta.env.VITE_GA_ID || "";

export function initAnalytics() {
  if (typeof window === "undefined") return;
  if (!GA_ID) return;
  if (window.gtag) return;
  if (!isCategoryAllowed("analytics")) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: any[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, {
    send_page_view: false,
  });
}

export function trackPageView(path: string, title?: string) {
  if (!window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title || document.title,
  });
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
) {
  if (!window.gtag) return;
  window.gtag("event", eventName, params);
}

export const analytics = {
  signupStarted: (method: string) => trackEvent("signup_started", { method }),
  signupCompleted: (method: string) => trackEvent("signup_completed", { method }),
  loginCompleted: (method: string) => trackEvent("login_completed", { method }),

  onboardingStep: (step: number) => trackEvent("onboarding_step", { step }),
  onboardingCompleted: () => trackEvent("onboarding_completed"),

  checkoutStarted: (plan: string) => trackEvent("checkout_started", { plan }),
  subscriptionActivated: (plan: string) => trackEvent("subscription_activated", { plan }),

  referralLinkShared: (platform: string) => trackEvent("referral_shared", { platform }),
  referralConverted: () => trackEvent("referral_converted"),

  documentGenerated: (docType: string, country: string) =>
    trackEvent("document_generated", { doc_type: docType, country }),
  pdfDownloaded: (docType: string) => trackEvent("pdf_downloaded", { doc_type: docType }),

  propertyAdded: (country: string) => trackEvent("property_added", { country }),
  tenantInvited: () => trackEvent("tenant_invited"),

  listingPublished: () => trackEvent("listing_published"),
  bookingReceived: () => trackEvent("booking_received"),
};
