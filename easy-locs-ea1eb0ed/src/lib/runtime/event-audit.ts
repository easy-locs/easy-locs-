/**
 * event-audit — Atomic runtime unit: audits event bus for mismatches and dead events.
 * Single responsibility: event emission/consumption tracking.
 */

interface EventRecord {
  event: string;
  emittedCount: number;
  consumedCount: number;
  lastEmittedAt: string | null;
  lastConsumedAt: string | null;
}

const registry = new Map<string, EventRecord>();
const listeners = new Set<() => void>();

function notify() { listeners.forEach(fn => fn()); }

function ensure(event: string): EventRecord {
  if (!registry.has(event)) {
    registry.set(event, {
      event, emittedCount: 0, consumedCount: 0,
      lastEmittedAt: null, lastConsumedAt: null,
    });
  }
  return registry.get(event)!;
}

export function trackEmission(event: string) {
  const r = ensure(event);
  r.emittedCount++;
  r.lastEmittedAt = new Date().toISOString();
  notify();
}

export function trackConsumption(event: string) {
  const r = ensure(event);
  r.consumedCount++;
  r.lastConsumedAt = new Date().toISOString();
  notify();
}

export function getDeadEvents(): EventRecord[] {
  return Array.from(registry.values()).filter(r => r.emittedCount > 0 && r.consumedCount === 0);
}

export function getOrphanListeners(): EventRecord[] {
  return Array.from(registry.values()).filter(r => r.emittedCount === 0 && r.consumedCount > 0);
}

export function getMismatchedEvents(): EventRecord[] {
  return Array.from(registry.values()).filter(r => {
    if (r.emittedCount === 0 && r.consumedCount === 0) return false;
    const ratio = r.consumedCount / Math.max(r.emittedCount, 1);
    return ratio < 0.5 || ratio > 2;
  });
}

export function getAllEventRecords(): EventRecord[] {
  return Array.from(registry.values()).sort((a, b) => b.emittedCount - a.emittedCount);
}

export function clearEventAudit() { registry.clear(); notify(); }

export function subscribeEventAudit(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
