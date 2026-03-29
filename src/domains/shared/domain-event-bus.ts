/**
 * Domain Event Bus — Bridges DDD domain events → platformBus + eventBus.
 * Single canonical publish point for all domain events.
 * Adds correlation tracking and audit trail.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { eventBus } from "@/lib/core/event-bus";
import type { DomainEvent } from "./types";

const eventLog: DomainEvent[] = [];
const MAX_LOG = 500;

export function publishDomainEvent(event: DomainEvent): void {
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
