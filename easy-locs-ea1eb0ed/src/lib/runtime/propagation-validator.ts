/**
 * propagation-validator — Detects broken propagation chains at runtime.
 *
 * Tracks: DB write → event emission → cache invalidation → UI refresh
 * Flags: DB success without event, event without consumer, cache stale after write.
 *
 * Lightweight observer — no business logic.
 */

import { reportAnomaly } from "./anomaly-detector";

export interface PropagationRecord {
  flowId: string;
  domain: string;
  action: string;
  timestamp: string;
  dbWriteSuccess: boolean;
  eventEmitted: string | null;
  cacheInvalidated: string[];
  uiRefreshed: boolean;
  issues: string[];
}

const MAX_RECORDS = 200;
let records: PropagationRecord[] = [];
const listeners = new Set<() => void>();

function notify() { listeners.forEach(fn => fn()); }

/**
 * Track a propagation chain for a completed action.
 * Called by runAction after DB write + event emit.
 */
export function trackPropagation(input: {
  flowId: string;
  domain: string;
  action: string;
  dbWriteSuccess: boolean;
  eventEmitted: string | null;
  cacheInvalidated: string[];
}) {
  const issues: string[] = [];

  // Rule 1: DB write without event emission
  if (input.dbWriteSuccess && !input.eventEmitted) {
    issues.push("db_write_without_event");
    reportAnomaly(
      "event_mismatch", input.domain,
      `Action "${input.action}" wrote to DB but emitted no event — downstream consumers may not refresh.`,
      "medium",
      { flowId: input.flowId, action: input.action }
    );
  }

  // Rule 2: DB write without cache invalidation
  if (input.dbWriteSuccess && input.cacheInvalidated.length === 0) {
    issues.push("db_write_without_cache_invalidation");
    // This is informational — not all writes need cache invalidation
  }

  // Rule 3: Event emitted but no cache invalidation
  if (input.eventEmitted && input.cacheInvalidated.length === 0) {
    issues.push("event_without_cache");
    // Informational — events may trigger cache invalidation via reactions
  }

  const record: PropagationRecord = {
    flowId: input.flowId,
    domain: input.domain,
    action: input.action,
    timestamp: new Date().toISOString(),
    dbWriteSuccess: input.dbWriteSuccess,
    eventEmitted: input.eventEmitted,
    cacheInvalidated: input.cacheInvalidated,
    uiRefreshed: input.cacheInvalidated.length > 0 || !!input.eventEmitted,
    issues,
  };

  records = [record, ...records].slice(0, MAX_RECORDS);
  notify();
  return record;
}

/**
 * Get all propagation records with issues.
 */
export function getBrokenPropagations(): PropagationRecord[] {
  return records.filter(r => r.issues.length > 0);
}

/**
 * Get propagation stats by domain.
 */
export function getPropagationStats(): Record<string, {
  total: number;
  withIssues: number;
  missingEvents: number;
  missingCache: number;
}> {
  const stats: Record<string, { total: number; withIssues: number; missingEvents: number; missingCache: number }> = {};

  for (const r of records) {
    if (!stats[r.domain]) {
      stats[r.domain] = { total: 0, withIssues: 0, missingEvents: 0, missingCache: 0 };
    }
    stats[r.domain].total++;
    if (r.issues.length > 0) stats[r.domain].withIssues++;
    if (r.issues.includes("db_write_without_event")) stats[r.domain].missingEvents++;
    if (r.issues.includes("db_write_without_cache_invalidation")) stats[r.domain].missingCache++;
  }

  return stats;
}

export function getAllPropagations(): PropagationRecord[] { return [...records]; }
export function clearPropagations() { records = []; notify(); }
export function subscribePropagation(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
