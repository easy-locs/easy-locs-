import { exposeWorkerMethods } from "./worker-rpc";

export interface AnalyticsEvent {
  name: string;
  properties: Record<string, unknown>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

export interface BatchRequest {
  events: AnalyticsEvent[];
}

export interface BatchResult {
  processedCount: number;
  batches: AnalyticsEvent[][];
  deduplicatedCount: number;
}

const MAX_BATCH_SIZE = 25;

function deduplicateEvents(events: AnalyticsEvent[]): AnalyticsEvent[] {
  const seen = new Set<string>();
  const deduped: AnalyticsEvent[] = [];

  for (const event of events) {
    const key = `${event.name}:${event.userId ?? "anon"}:${Math.floor(event.timestamp / 1000)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(event);
  }

  return deduped;
}

function batchEvents(request: BatchRequest): BatchResult {
  const deduped = deduplicateEvents(request.events);
  const batches: AnalyticsEvent[][] = [];

  for (let i = 0; i < deduped.length; i += MAX_BATCH_SIZE) {
    batches.push(deduped.slice(i, i + MAX_BATCH_SIZE));
  }

  return {
    processedCount: deduped.length,
    batches,
    deduplicatedCount: request.events.length - deduped.length,
  };
}

export interface AggregateRequest {
  events: AnalyticsEvent[];
  groupBy: "name" | "userId";
}

export interface AggregateResult {
  groups: Record<string, { count: number; lastTimestamp: number }>;
}

function aggregateEvents(request: AggregateRequest): AggregateResult {
  const groups: Record<string, { count: number; lastTimestamp: number }> = {};

  for (const event of request.events) {
    const key = request.groupBy === "name" ? event.name : (event.userId ?? "anon");
    if (!groups[key]) {
      groups[key] = { count: 0, lastTimestamp: 0 };
    }
    groups[key].count++;
    groups[key].lastTimestamp = Math.max(groups[key].lastTimestamp, event.timestamp);
  }

  return { groups };
}

const workerMethods = {
  batch: batchEvents,
  aggregate: aggregateEvents,
};

export type AnalyticsBatchWorkerMethods = typeof workerMethods;

exposeWorkerMethods(workerMethods);
