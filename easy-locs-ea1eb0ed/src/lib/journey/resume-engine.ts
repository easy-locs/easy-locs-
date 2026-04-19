/**
 * Resume Engine — read-side of the journey lifecycle system.
 *
 * Evaluates the journey registry and sessionStorage intent slot to produce a
 * single ResumeCandidate (or null) that the entry resolver will use to decide
 * where to land the user on app mount.
 *
 * Priority order (first match wins):
 *   1. ACTIVE flow   — a journey with status "active" (in-progress, not left)
 *   2. INTERRUPTED   — a journey with status "interrupted" and retryable=true
 *   3. POST-LOGIN    — sessionStorage["el_post_login_intent"] is set
 *   4. FAILED        — a journey with status "failed" and retryable=true
 *
 * Pure functions — no React, no side-effects, no imports from UI layer.
 * Phase 1: Foundation only. Entry resolver wiring happens in Phase 2.
 */

import type { JourneyPillar, UserIntentName } from "@/lib/events/event-payload-schemas";
import { getAllJourneys, type JourneyRecord } from "./journey-registry";

// ── Post-login intent slot ────────────────────────────────────────────────────

const POST_LOGIN_KEY = "el_post_login_intent";

export interface PostLoginIntent {
  route: string;
  intent?: UserIntentName;
  pillar?: JourneyPillar;
  context?: Record<string, unknown>;
  storedAt: number;
}

/** Persist a deep-link intent before redirecting to auth. */
export function storePostLoginIntent(intent: PostLoginIntent): void {
  try {
    sessionStorage.setItem(POST_LOGIN_KEY, JSON.stringify(intent));
  } catch {
    // Best-effort only.
  }
}

/** Read and immediately clear the post-login intent slot. Call once per login. */
export function consumePostLoginIntent(): PostLoginIntent | null {
  try {
    const raw = sessionStorage.getItem(POST_LOGIN_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(POST_LOGIN_KEY);
    return JSON.parse(raw) as PostLoginIntent;
  } catch {
    return null;
  }
}

/** Peek at the post-login intent without consuming it. */
export function peekPostLoginIntent(): PostLoginIntent | null {
  try {
    const raw = sessionStorage.getItem(POST_LOGIN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PostLoginIntent;
  } catch {
    return null;
  }
}

// ── Resume candidate ─────────────────────────────────────────────────────────

export type ResumeCandidateKind =
  | "active_flow"
  | "interrupted_flow"
  | "post_login_intent"
  | "failed_retryable";

export interface ResumeCandidate {
  kind: ResumeCandidateKind;
  /** The route to navigate to on resume. */
  route: string;
  pillar: JourneyPillar;
  intent: UserIntentName;
  /** Human-readable one-sentence prompt for the ResumePromptBanner.
   *  Uses plain language per the human-first UX doctrine. */
  promptLabel: string;
  /** The journey record backing this candidate (null for post-login intents). */
  journey: JourneyRecord | null;
  /** The post-login intent (null for journey-backed candidates). */
  postLoginIntent: PostLoginIntent | null;
}

// ── Plain-language prompt labels ──────────────────────────────────────────────

const INTENT_PROMPT_LABELS: Record<UserIntentName, string> = {
  discovery_browse: "Continue browsing nearby",
  discovery_search: "Continue your search",
  discovery_entity_open: "Continue viewing",
  booking_start: "Continue your booking",
  booking_confirm: "Finish confirming your booking",
  booking_cancel: "Complete your cancellation",
  booking_reschedule: "Finish rescheduling",
  order_start: "Continue your order",
  order_checkout: "Finish checking out",
  order_track: "Track your order",
  order_cancel: "Complete your cancellation",
  ride_request: "Finish requesting your ride",
  ride_track: "Track your ride",
  ride_cancel: "Complete your ride cancellation",
  payment_initiate: "Finish your payment",
  payment_confirm: "Confirm your payment",
  payment_retry: "Retry your payment",
  payment_topup: "Finish topping up",
  payment_transfer: "Finish your transfer",
  orbit_open_thread: "Go back to your conversation",
  orbit_send_message: "Finish sending your message",
  orbit_call_start: "Rejoin your call",
  manage_asset_view: "Go back to your assets",
  manage_asset_create: "Finish adding your asset",
  manage_asset_edit: "Finish editing",
  support_open: "Continue with support",
  support_escalate: "Continue escalating your issue",
  support_resolve: "Finish resolving your issue",
  deeplink_resolve: "Continue where you left off",
  resume_interrupted: "Continue where you left off",
};

function promptForIntent(intent: UserIntentName): string {
  return INTENT_PROMPT_LABELS[intent] ?? "Continue where you left off";
}

// ── Pillar fallbacks ──────────────────────────────────────────────────────────

const INTENT_PILLAR_FALLBACK: Partial<Record<UserIntentName, JourneyPillar>> = {
  payment_initiate: "wallet",
  payment_confirm: "wallet",
  payment_retry: "wallet",
  payment_topup: "wallet",
  payment_transfer: "wallet",
  orbit_open_thread: "orbit",
  orbit_send_message: "orbit",
  orbit_call_start: "orbit",
  manage_asset_view: "dashboard",
  manage_asset_create: "dashboard",
  manage_asset_edit: "dashboard",
  support_open: "me",
  support_escalate: "me",
  support_resolve: "me",
};

function inferPillar(intent: UserIntentName): JourneyPillar {
  return INTENT_PILLAR_FALLBACK[intent] ?? "radar";
}

// ── Engine ────────────────────────────────────────────────────────────────────

/**
 * Evaluate all journey records and the post-login intent slot, and return
 * the highest-priority resume candidate. Returns null if there is nothing
 * to resume.
 */
export function resolveResumeCandidate(): ResumeCandidate | null {
  const journeys = getAllJourneys();

  // Priority 1: active flow (user is mid-journey, possibly in another tab/reload)
  const active = journeys
    .filter((j) => j.status === "active")
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  if (active) {
    return {
      kind: "active_flow",
      route: active.currentRoute,
      pillar: active.pillar,
      intent: active.intent,
      promptLabel: promptForIntent(active.intent),
      journey: active,
      postLoginIntent: null,
    };
  }

  // Priority 2: interrupted + retryable
  const interrupted = journeys
    .filter((j) => j.status === "interrupted" && j.retryable)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  if (interrupted) {
    return {
      kind: "interrupted_flow",
      route: interrupted.currentRoute,
      pillar: interrupted.pillar,
      intent: interrupted.intent,
      promptLabel: promptForIntent(interrupted.intent),
      journey: interrupted,
      postLoginIntent: null,
    };
  }

  // Priority 3: post-login intent (deep link deferred through auth)
  const postLogin = peekPostLoginIntent();
  if (postLogin) {
    const pillar = postLogin.pillar ?? inferPillar(postLogin.intent ?? "deeplink_resolve");
    const intent: UserIntentName = postLogin.intent ?? "deeplink_resolve";
    return {
      kind: "post_login_intent",
      route: postLogin.route,
      pillar,
      intent,
      promptLabel: promptForIntent(intent),
      journey: null,
      postLoginIntent: postLogin,
    };
  }

  // Priority 4: failed + retryable
  const failedRetryable = journeys
    .filter((j) => j.status === "failed" && j.retryable)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];

  if (failedRetryable) {
    return {
      kind: "failed_retryable",
      route: failedRetryable.currentRoute,
      pillar: failedRetryable.pillar,
      intent: failedRetryable.intent,
      promptLabel: promptForIntent(failedRetryable.intent),
      journey: failedRetryable,
      postLoginIntent: null,
    };
  }

  return null;
}

/**
 * Check whether there is any active flow currently in progress.
 * Lightweight version that avoids building the full candidate.
 */
export function hasActiveFlow(): boolean {
  return getAllJourneys().some((j) => j.status === "active");
}

/**
 * Check whether there is anything resumable (interrupted or failed-retryable
 * or post-login intent).
 */
export function hasResumeCandidate(): boolean {
  return resolveResumeCandidate() !== null;
}
