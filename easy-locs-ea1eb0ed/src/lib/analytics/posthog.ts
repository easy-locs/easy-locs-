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

export { posthog };
