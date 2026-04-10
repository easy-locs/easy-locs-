/**
 * Domain Event Bus — Bridges DDD domain events → platformBus + eventBus.
 * Single canonical publish point for all domain events.
 * Adds correlation tracking, idempotence, and audit trail.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { eventBus } from "@/lib/core/event-bus";
import type { DomainEvent } from "./types";

const eventLog: DomainEvent[] = [];
const MAX_LOG = 500;

// ── Idempotence guard ──
const processedIds = new Set<string>();
const MAX_PROCESSED = 2000;

function markProcessed(id: string): boolean {
  if (processedIds.has(id)) return false; // duplicate
  processedIds.add(id);
  if (processedIds.size > MAX_PROCESSED) {
    // evict oldest entries (Set preserves insertion order)
    const iter = processedIds.values();
    for (let i = 0; i < 500; i++) iter.next();
    const keep = new Set<string>();
    for (const v of processedIds) {
      if (keep.size >= MAX_PROCESSED - 500) break;
      keep.add(v);
    }
    processedIds.clear();
    for (const v of keep) processedIds.add(v);
  }
  return true;
}

export function publishDomainEvent(event: DomainEvent): void {
  // Generate idempotency key
  const eventId = event.correlationId
    ? `${event.type}:${event.correlationId}:${event.aggregateId}`
    : `${event.type}:${event.occurredAt}:${event.aggregateId}`;

  // Idempotence: skip duplicate events
  if (!markProcessed(eventId)) {
    if (import.meta.env.DEV) {
      console.warn(`[domain-event] duplicate skipped: ${event.type}`, eventId);
    }
    return;
  }

  // Audit trail
  eventLog.push(event);
  if (eventLog.length > MAX_LOG) eventLog.splice(0, eventLog.length - MAX_LOG);

  // Bridge to platformBus (sync, for UI reactivity)
  try {
    platformBus.emit(event.type as any, event.payload as any, event.source as any);
  } catch {
    // platformBus type mismatch is non-fatal during migration
  }

  // Bridge to eventBus (async, for side-effects and handlers)
  eventBus.emit(event.type as any, event.payload as any).catch((err) =>
    console.error(`[domain-event] handler error for ${event.type}`, err)
  );

  if (import.meta.env.DEV) {
    console.log(`[domain] ${event.aggregateType}.${event.type}`, event.payload);
  }
}

export function getDomainEventLog(): readonly DomainEvent[] {
  return eventLog;
}

/** Check if an event with this correlation was already processed */
export function wasEventProcessed(correlationId: string, type: string, aggregateId: string): boolean {
  return processedIds.has(`${type}:${correlationId}:${aggregateId}`);
}

/** Helper to create a domain event with defaults */
export function createDomainEvent<T extends Record<string, unknown>>(
  type: string,
  aggregateId: string,
  aggregateType: string,
  payload: T,
  source: string,
  correlationId?: string
): DomainEvent<T> {
  return {
    type,
    aggregateId,
    aggregateType,
    payload,
    occurredAt: new Date().toISOString(),
    source,
    correlationId: correlationId ?? crypto.randomUUID(),
  };
}
