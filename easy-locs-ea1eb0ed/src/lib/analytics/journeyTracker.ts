/**
 * Journey Tracker — Tracks customer & professional journey events.
 * Routes events to PostHog + internal event bus + analytics batch worker.
 * Analytics batch worker collects events off main thread and flushes
 * them in batches (by size or time interval) to reduce main-thread jank.
 */

import { trackEvent } from "./event-bus";
import type { AnalyticsBatchWorkerAPI, BatchedPayload } from "@/workers/analytics-batch.worker";

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

let poolRef: typeof import("@/workers/pool-manager") | null = null;
let poolInitAttempted = false;
let flushIntervalStarted = false;

async function getPool() {
  if (poolRef) return poolRef;
  if (poolInitAttempted) return null;
  poolInitAttempted = true;
  try {
    poolRef = await import("@/workers/pool-manager");
    return poolRef;
  } catch {
    return null;
  }
}

function handleBatchedPayload(payload: BatchedPayload): void {
  import("./segment").then(({ segmentTrack }) => {
    for (const event of payload.events) {
      segmentTrack(event.name, {
        ...event.properties,
        batchId: payload.batchId,
        source: "analytics_batch_worker",
      });
    }
  }).catch(() => {});
}

function startFlushInterval(pool: typeof import("@/workers/pool-manager")) {
  if (flushIntervalStarted) return;
  flushIntervalStarted = true;

  setInterval(() => {
    pool.workerPool.execute<AnalyticsBatchWorkerAPI, BatchedPayload | null>(
      "analytics",
      (proxy) => proxy.flush(),
    ).then((batch) => {
      if (batch) handleBatchedPayload(batch);
    }).catch(() => {});
  }, 10_000);
}

export function trackJourneyEvent(
  eventName: JourneyEventName,
  meta?: Record<string, unknown>,
) {
  trackEvent({
    type: `journey.${eventName.toLowerCase()}`,
    metadata: meta as Record<string, any>,
  });

  getPool().then((pool) => {
    if (!pool) {
      import("./segment").then(({ segmentTrack }) => {
        segmentTrack(eventName, { ...meta, source: "journey_direct" });
      }).catch(() => {});
      return;
    }
    startFlushInterval(pool);

    pool.workerPool.execute<AnalyticsBatchWorkerAPI, BatchedPayload | null>(
      "analytics",
      (proxy) => proxy.enqueue({
        name: eventName,
        properties: meta,
        timestamp: Date.now(),
      }),
    ).then((batch) => {
      if (batch) handleBatchedPayload(batch);
    }).catch(() => {});
  }).catch(() => {});

  if (import.meta.env.DEV) {
    console.log(`[journey] ${eventName}`, meta ?? "");
  }
}
