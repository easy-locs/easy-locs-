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
} as const;
