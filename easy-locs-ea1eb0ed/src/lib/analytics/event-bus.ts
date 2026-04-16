/**
 * Analytics event bus — centralized event tracking for the platform.
 */

export interface AnalyticsEvent {
  type: string;
  userId?: string;
  workspaceId?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

const eventQueue: AnalyticsEvent[] = [];
const listeners: Array<(event: AnalyticsEvent) => void> = [];

/** Track a platform event */
export function trackEvent(event: Omit<AnalyticsEvent, "timestamp">) {
  const enriched: AnalyticsEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };

  eventQueue.push(enriched);
  listeners.forEach((fn) => fn(enriched));

  if (import.meta.env.DEV) {
    console.log("[analytics]", enriched.type, enriched.metadata ?? "");
  }
}

/** Subscribe to events */
export function onEvent(callback: (event: AnalyticsEvent) => void) {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/** Get queued events (for batch sending) */
export function drainEvents(): AnalyticsEvent[] {
  return eventQueue.splice(0, eventQueue.length);
}

let batchInterval: ReturnType<typeof setInterval> | null = null;

export function startWorkerBatching(intervalMs = 10_000): void {
  if (batchInterval) return;
  batchInterval = setInterval(async () => {
    const events = drainEvents();
    if (events.length === 0) return;
    try {
      const { getAnalyticsPool } = await import("@/workers/index");
      const pool = getAnalyticsPool();
      const batchResult = await pool.exec("batch", {
        events: events.map((e) => ({
          name: e.type,
          properties: e.metadata ?? {},
          timestamp: new Date(e.timestamp ?? Date.now()).getTime(),
          userId: e.userId,
          sessionId: e.workspaceId,
        })),
      });

      const { captureEvent } = await import("@/lib/analytics/posthog");
      for (const batch of batchResult.batches) {
        for (const event of batch) {
          captureEvent(event.name, {
            ...event.properties,
            _batched: true,
            _batchTimestamp: event.timestamp,
            _userId: event.userId,
          });
        }
      }

      if (import.meta.env.DEV) {
        console.log(
          `[analytics] worker batched: ${batchResult.processedCount} events into ${batchResult.batches.length} batches, deduped ${batchResult.deduplicatedCount}`,
        );
      }
    } catch {
      eventQueue.push(...events);
    }
  }, intervalMs);
}

export function stopWorkerBatching(): void {
  if (batchInterval) {
    clearInterval(batchInterval);
    batchInterval = null;
  }
}

// Pre-defined event helpers
export const Events = {
  orderCreated: (orderId: string, userId?: string) =>
    trackEvent({ type: "order.created", userId, metadata: { orderId } }),

  orderCompleted: (orderId: string, amount: number, userId?: string) =>
    trackEvent({ type: "order.completed", userId, metadata: { orderId, amount } }),

  dispatchAssigned: (jobId: string, driverId: string) =>
    trackEvent({ type: "dispatch.assigned", metadata: { jobId, driverId } }),

  deliveryCompleted: (jobId: string, driverId: string) =>
    trackEvent({ type: "delivery.completed", metadata: { jobId, driverId } }),

  rideStarted: (orderId: string, driverId: string) =>
    trackEvent({ type: "ride.started", metadata: { orderId, driverId } }),

  rideCompleted: (orderId: string, amount: number) =>
    trackEvent({ type: "ride.completed", metadata: { orderId, amount } }),

  paymentSettled: (orderId: string, amount: number, currency: string) =>
    trackEvent({ type: "payment.settled", metadata: { orderId, amount, currency } }),

  driverOnline: (driverId: string) =>
    trackEvent({ type: "driver.online", metadata: { driverId } }),

  driverOffline: (driverId: string) =>
    trackEvent({ type: "driver.offline", metadata: { driverId } }),

  referralConverted: (userId: string, referrerUserId: string, orderId?: string) =>
    trackEvent({ type: "referral.converted", userId, metadata: { referrerUserId, orderId } }),
} as const;
