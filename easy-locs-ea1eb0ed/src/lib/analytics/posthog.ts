/**
 * PostHog Analytics — Autocapture, funnels, session replay, experiments.
 * Initialize once at app start. Safe no-op if key is missing.
 */

import posthog from "posthog-js";
import { isCategoryAllowed } from "@/lib/consent/cookie-consent";

let started = false;

export function initPostHog() {
  if (started) return;
  if (!isCategoryAllowed("analytics")) return;

  if ((window as Record<string, unknown>).__POSTHOG_KEY__) {
    started = true;
    return;
  }

  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
  if (!key || !host) return;

  posthog.init(key, {
    api_host: host,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    persistence: "localStorage+cookie",
    loaded: () => { started = true; },
  });
}

export function identifyActor(
  actorId: string,
  props?: Record<string, string | number | boolean | null>,
) {
  posthog.identify(actorId, props);

  import("./segment").then(({ segmentIdentify }) => {
    segmentIdentify(actorId, props ?? undefined);
  }).catch(() => {});
}

export function captureEvent(event: string, props?: Record<string, unknown>) {
  posthog.capture(event, props);
}

export function resetPostHog() {
  posthog.reset();

  import("./segment").then(({ segmentReset }) => {
    segmentReset();
  }).catch(() => {});
}

/**
 * Health probe for the integration registry. The registry treats PostHog as
 * required in dev (key + host) so missing env throws at boot. At runtime the
 * SDK additionally requires analytics consent before it actually starts —
 * this probe distinguishes "missing config" from "consent withheld" so the
 * diagnostics page can show the right reason.
 */
export function getPostHogHealth(): { ok: boolean; reason?: string } {
  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
  if (!key) return { ok: false, reason: "VITE_POSTHOG_KEY is not set" };
  if (!host) return { ok: false, reason: "VITE_POSTHOG_HOST is not set" };
  if (!isCategoryAllowed("analytics")) {
    return { ok: false, reason: "Analytics consent has not been granted" };
  }
  if (!started) return { ok: false, reason: "PostHog SDK has not been initialised yet" };
  return { ok: true };
}

export { posthog };
