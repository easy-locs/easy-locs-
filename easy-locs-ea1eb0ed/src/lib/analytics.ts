/**
 * Google Analytics integration for Easy-Locs.
 * Tracks key events: onboarding, subscription, referral, page views.
 * 
 * Usage: 
 *   import { trackEvent, initAnalytics } from "@/lib/analytics";
 *   trackEvent("signup_completed", { method: "email" });
 */

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

  // Create script tag
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
    send_page_view: false, // We'll send manually for SPA
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

// Pre-defined event helpers
export const analytics = {
  // Auth events
  signupStarted: (method: string) => trackEvent("signup_started", { method }),
  signupCompleted: (method: string) => trackEvent("signup_completed", { method }),
  loginCompleted: (method: string) => trackEvent("login_completed", { method }),

  // Onboarding
  onboardingStep: (step: number) => trackEvent("onboarding_step", { step }),
  onboardingCompleted: () => trackEvent("onboarding_completed"),

  // Subscription
  checkoutStarted: (plan: string) => trackEvent("checkout_started", { plan }),
  subscriptionActivated: (plan: string) => trackEvent("subscription_activated", { plan }),

  // Referral
  referralLinkShared: (platform: string) => trackEvent("referral_shared", { platform }),
  referralConverted: () => trackEvent("referral_converted"),

  // Document
  documentGenerated: (docType: string, country: string) =>
    trackEvent("document_generated", { doc_type: docType, country }),
  pdfDownloaded: (docType: string) => trackEvent("pdf_downloaded", { doc_type: docType }),

  // Property
  propertyAdded: (country: string) => trackEvent("property_added", { country }),
  tenantInvited: () => trackEvent("tenant_invited"),

  // Seasonal
  listingPublished: () => trackEvent("listing_published"),
  bookingReceived: () => trackEvent("booking_received"),
};
