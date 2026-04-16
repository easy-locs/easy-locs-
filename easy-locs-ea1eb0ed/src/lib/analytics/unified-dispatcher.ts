import { captureEvent, identifyActor } from "./posthog";
import { segmentTrack, segmentIdentify, segmentPage, segmentGroup } from "./segment";

export type AnalyticsEventCategory =
  | "navigation"
  | "user_action"
  | "transaction"
  | "search"
  | "engagement"
  | "error"
  | "system";

export interface UnifiedEvent {
  name: string;
  category: AnalyticsEventCategory;
  properties?: Record<string, unknown>;
  userId?: string;
}

const eventQueue: UnifiedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL_MS = 5000;
const MAX_QUEUE_SIZE = 50;

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushQueue();
    flushTimer = null;
  }, FLUSH_INTERVAL_MS);
}

function flushQueue(): void {
  if (eventQueue.length === 0) return;

  const batch = eventQueue.splice(0, MAX_QUEUE_SIZE);
  for (const event of batch) {
    dispatchToProviders(event);
  }
}

function dispatchToProviders(event: UnifiedEvent): void {
  try {
    captureEvent(event.name, {
      ...event.properties,
      category: event.category,
    });
  } catch (err) {
    console.debug("[analytics] PostHog dispatch failed:", err instanceof Error ? err.message : err);
  }

  try {
    segmentTrack(event.name, {
      ...event.properties,
      category: event.category,
    });
  } catch (err) {
    console.debug("[analytics] Segment dispatch failed:", err instanceof Error ? err.message : err);
  }
}

export function trackUnifiedEvent(event: UnifiedEvent): void {
  eventQueue.push(event);

  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    flushQueue();
  } else {
    scheduleFlush();
  }
}

export function trackImmediate(event: UnifiedEvent): void {
  dispatchToProviders(event);
}

export function identifyUser(
  userId: string,
  traits?: Record<string, string | number | boolean | null>
): void {
  try {
    identifyActor(userId, traits ?? undefined);
  } catch (err) {
    console.debug("[analytics] PostHog identify failed:", err instanceof Error ? err.message : err);
  }
  try {
    segmentIdentify(userId, traits ?? undefined);
  } catch (err) {
    console.debug("[analytics] Segment identify failed:", err instanceof Error ? err.message : err);
  }
}

export function trackPageView(pageName: string, properties?: Record<string, unknown>): void {
  try {
    segmentPage(pageName, properties);
  } catch (err) {
    console.debug("[analytics] Segment page failed:", err instanceof Error ? err.message : err);
  }
  try {
    captureEvent("$pageview", {
      page: pageName,
      ...properties,
    });
  } catch (err) {
    console.debug("[analytics] PostHog pageview failed:", err instanceof Error ? err.message : err);
  }
}

export function trackGroup(
  groupId: string,
  traits?: Record<string, unknown>
): void {
  try {
    segmentGroup(groupId, traits);
  } catch (err) {
    console.debug("[analytics] Segment group failed:", err instanceof Error ? err.message : err);
  }
}

export function flushAllEvents(): void {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  flushQueue();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    flushAllEvents();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushAllEvents();
    }
  });
}
