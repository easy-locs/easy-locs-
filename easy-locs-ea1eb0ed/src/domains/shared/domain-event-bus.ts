/**
 * Domain Event Bus — Bridges DDD domain events → platformBus (SINGLE bus).
 * Single canonical publish point for all domain events.
 * Adds correlation tracking, idempotence, and audit trail.
 *
 * TASK #65: Eliminated dual-fan-out. Events are emitted EXCLUSIVELY to
 * platformBus with colon-notation. The legacy eventBus no longer receives
 * domain events — this fixes V4-01 notation mismatch, V7-01 dual execution,
 * and V9-01 silent async failures. Legacy handlers should migrate to
 * platformBus.on() with colon-notation.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import type { DomainEvent } from "./types";

const eventLog: DomainEvent[] = [];
const MAX_LOG = 500;

const processedIds = new Set<string>();
const MAX_PROCESSED = 2000;

function markProcessed(id: string): boolean {
  if (processedIds.has(id)) return false;
  processedIds.add(id);
  if (processedIds.size > MAX_PROCESSED) {
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
  const eventId = event.correlationId
    ? `${event.type}:${event.correlationId}:${event.aggregateId}`
    : `${event.type}:${event.occurredAt}:${event.aggregateId}`;

  if (!markProcessed(eventId)) {
    if (import.meta.env.DEV) {
      console.warn(`[domain-event] duplicate skipped: ${event.type}`, eventId);
    }
    return;
  }

  eventLog.push(event);
  if (eventLog.length > MAX_LOG) eventLog.splice(0, eventLog.length - MAX_LOG);

  try {
    platformBus.emit(event.type, event.payload, event.source);
  } catch (err) {
    console.error(
      `[domain-event] platformBus emission failed for ${event.type}:`,
      err instanceof Error ? err.message : err
    );
    if (import.meta.env.DEV) {
      throw err;
    }
  }

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
