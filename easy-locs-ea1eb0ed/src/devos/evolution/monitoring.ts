import type { PipelineEvent, ProposedTask } from './types';

let eventCounter = 0;
const events: PipelineEvent[] = [];
const subscribers: Array<(e: PipelineEvent) => void> = [];

const MAX_EVENTS = 2000;

export function emit(event: Omit<PipelineEvent, 'id' | 'at'>): PipelineEvent {
  eventCounter += 1;
  const full: PipelineEvent = {
    id: `evt-${Date.now().toString(36)}-${eventCounter.toString(36)}`,
    at: new Date().toISOString(),
    ...event,
  };
  events.push(full);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
  for (const fn of subscribers) {
    try {
      fn(full);
    } catch {
      // monitoring must never throw upstream
    }
  }
  return full;
}

export function subscribe(fn: (e: PipelineEvent) => void): () => void {
  subscribers.push(fn);
  return () => {
    const idx = subscribers.indexOf(fn);
    if (idx >= 0) subscribers.splice(idx, 1);
  };
}

export function getEvents(filter?: { stage?: PipelineEvent['stage']; kind?: PipelineEvent['kind'] }): PipelineEvent[] {
  if (!filter) return [...events];
  return events.filter(e =>
    (!filter.stage || e.stage === filter.stage) &&
    (!filter.kind || e.kind === filter.kind),
  );
}

export function clearEventsForTests(): void {
  events.length = 0;
  eventCounter = 0;
}

export function hydrateEvents(items: PipelineEvent[]): number {
  let n = 0;
  const seen = new Set(events.map(e => e.id));
  for (const e of items) {
    if (!e || typeof e.id !== 'string' || seen.has(e.id)) continue;
    events.push(e);
    seen.add(e.id);
    n += 1;
  }
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
  return n;
}

export interface MonitoringSummary {
  totalEvents: number;
  proposalsSuggested: number;
  proposalsApproved: number;
  proposalsRejected: number;
  proposalsCompleted: number;
  proposalsFailed: number;
  proposalsRolledBack: number;
  safeguardTrips: number;
  pausedNow: boolean;
  rejectionStreak: number;
  recentRejectionReasons: string[];
}

let pausedNow = false;
let rejectionStreak = 0;

export function noteApproval(): void {
  rejectionStreak = 0;
}
export function noteRejection(): number {
  rejectionStreak += 1;
  return rejectionStreak;
}
export function getRejectionStreak(): number {
  return rejectionStreak;
}
export function setPaused(value: boolean): void {
  pausedNow = value;
}
export function isPaused(): boolean {
  return pausedNow;
}

export function getSummary(): MonitoringSummary {
  let suggested = 0;
  let approved = 0;
  let rejected = 0;
  let completed = 0;
  let failed = 0;
  let rolledBack = 0;
  let trips = 0;
  const recent: string[] = [];
  for (const e of events) {
    if (e.kind === 'proposal-suggested') suggested += 1;
    else if (e.kind === 'proposal-approved') approved += 1;
    else if (e.kind === 'proposal-rejected') {
      rejected += 1;
      const reason = (e.details && (e.details as { reason?: string }).reason) || 'unknown';
      recent.unshift(reason);
    } else if (e.kind === 'proposal-completed') completed += 1;
    else if (e.kind === 'proposal-failed') failed += 1;
    else if (e.kind === 'proposal-rolled-back') rolledBack += 1;
    else if (e.kind === 'safeguard-tripped') trips += 1;
  }
  return {
    totalEvents: events.length,
    proposalsSuggested: suggested,
    proposalsApproved: approved,
    proposalsRejected: rejected,
    proposalsCompleted: completed,
    proposalsFailed: failed,
    proposalsRolledBack: rolledBack,
    safeguardTrips: trips,
    pausedNow,
    rejectionStreak,
    recentRejectionReasons: recent.slice(0, 10),
  };
}

export interface PerformanceImpactRow {
  proposalId: string;
  intent: string;
  domain: string;
  before: Record<string, number>;
  after: Record<string, number>;
  deltas: Record<string, number>;
  regressed: boolean;
}

export function buildPerformanceImpact(tasks: ProposedTask[]): PerformanceImpactRow[] {
  const rows: PerformanceImpactRow[] = [];
  for (const t of tasks) {
    if (!t.performance?.before || !t.performance?.after) continue;
    const before = t.performance.before;
    const after = t.performance.after;
    const deltas: Record<string, number> = {};
    let regressed = false;
    for (const k of Object.keys(after)) {
      const d = (after[k] ?? 0) - (before[k] ?? 0);
      deltas[k] = d;
      // For latency/error metrics, positive delta is regression. We treat
      // any metric whose name starts with "error" or "latency" or ends
      // with "_ms" or "_pct_err" as regression-on-increase.
      const lower = k.toLowerCase();
      const regressionMetric =
        lower.startsWith('error') ||
        lower.startsWith('latency') ||
        lower.endsWith('_ms') ||
        lower.endsWith('_pct_err');
      if (regressionMetric && d > 0) regressed = true;
    }
    rows.push({
      proposalId: t.id,
      intent: t.intent,
      domain: t.domain,
      before,
      after,
      deltas,
      regressed,
    });
  }
  return rows;
}
