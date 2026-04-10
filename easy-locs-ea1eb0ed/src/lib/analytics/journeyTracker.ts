/**
 * Journey Tracker — Tracks customer & professional journey events.
 * Routes events to PostHog + internal event bus.
 */

import { captureEvent } from "./posthog";
import { trackEvent } from "./event-bus";

export type JourneyEventName =
  | "PAGE_OPEN"
  | "PAGE_EXIT"
  | "CTA_CLICK"
  | "FORM_START"
  | "FORM_SUBMIT"
  | "FORM_ERROR"
  | "ADD_TO_CART"
  | "BEGIN_CHECKOUT"
  | "CHECKOUT_ERROR"
  | "BOOKING_START"
  | "BOOKING_COMPLETE"
  | "PRO_ONBOARDING_START"
  | "PRO_ONBOARDING_STEP_COMPLETE"
  | "PRO_ONBOARDING_ABANDON"
  | "PRO_ONBOARDING_COMPLETE"
  | "PROFILE_PUBLISH"
  | "CATEGORY_MISSING"
  | "MEDIA_MISSING"
  | "PAGE_FLICKER_DETECTED"
  | "OVERLAP_DETECTED"
  | "TEXT_SANITIZED"
  | "SAFE_FIX_APPLIED"
  | "RAGE_CLICK";

export function trackJourneyEvent(
  eventName: JourneyEventName,
  meta?: Record<string, unknown>,
) {
  // PostHog
  captureEvent(eventName, meta);

  // Internal event bus
  trackEvent({
    type: `journey.${eventName.toLowerCase()}`,
    metadata: meta as Record<string, any>,
  });

  if (import.meta.env.DEV) {
    console.log(`[journey] ${eventName}`, meta ?? "");
  }
}
