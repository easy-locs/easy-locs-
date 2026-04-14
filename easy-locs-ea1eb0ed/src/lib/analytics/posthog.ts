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

  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  const host = import.meta.env.VITE_POSTHOG_HOST as string | undefined;
  if (!key || !host) return;

  posthog.init(key, {
    api_host: host,
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: { password: true },
    },
    persistence: "localStorage+cookie",
    loaded: () => { started = true; },
  });
}

export function identifyActor(
  actorId: string,
  props?: Record<string, string | number | boolean | null>,
) {
  posthog.identify(actorId, props);
}

export function captureEvent(event: string, props?: Record<string, unknown>) {
  posthog.capture(event, props);
}

export function resetPostHog() {
  posthog.reset();
}

export { posthog };
