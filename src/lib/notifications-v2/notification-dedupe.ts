/**
 * Notification Dedupe — builds dedupe keys and merge policies.
 */

/** Build a dedupe key from event type + context IDs */
export function buildDedupeKey(
  eventType: string,
  contextId?: string,
  windowMs = 60_000
): string | undefined {
  if (!contextId) return undefined;
  // Time-window bucket to prevent spam
  const bucket = Math.floor(Date.now() / windowMs);
  return `${eventType}:${contextId}:${bucket}`;
}

/** Events that should use aggressive deduplication */
const DEDUPED_EVENTS = new Set([
  "ride.searching",
  "ride.arriving",
  "order.preparing",
  "price.updated",
  "rider.new_offer",
]);

export function shouldDedupe(type: string): boolean {
  return DEDUPED_EVENTS.has(type);
}
