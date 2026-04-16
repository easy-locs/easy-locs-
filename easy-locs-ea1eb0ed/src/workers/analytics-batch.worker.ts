import * as Comlink from "comlink";

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
}

export interface BatchedPayload {
  events: AnalyticsEvent[];
  batchId: string;
  batchedAt: number;
  count: number;
}

export interface AnalyticsBatchWorkerAPI {
  enqueue(event: AnalyticsEvent): Promise<BatchedPayload | null>;
  flush(): Promise<BatchedPayload | null>;
  setBatchSize(size: number): Promise<void>;
  setFlushInterval(ms: number): Promise<void>;
  setTimedFlushCallback(cb: (payload: BatchedPayload) => void): Promise<void>;
  getPendingCount(): Promise<number>;
  clear(): Promise<void>;
}

let queue: AnalyticsEvent[] = [];
let batchSize = 20;
let flushIntervalMs = 10_000;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let batchCounter = 0;

function createBatchPayload(events: AnalyticsEvent[]): BatchedPayload {
  batchCounter++;
  return {
    events,
    batchId: `batch_${Date.now()}_${batchCounter}`,
    batchedAt: Date.now(),
    count: events.length,
  };
}

let onTimedFlush: ((payload: BatchedPayload) => void) | null = null;

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (queue.length > 0) {
      const payload = createBatchPayload(queue.splice(0));
      if (onTimedFlush) {
        onTimedFlush(payload);
      } else {
        self.postMessage({ type: "timed_flush", payload });
      }
    }
  }, flushIntervalMs);
}

const api: AnalyticsBatchWorkerAPI = {
  async enqueue(event) {
    queue.push({
      ...event,
      timestamp: event.timestamp || Date.now(),
    });

    if (queue.length >= batchSize) {
      return createBatchPayload(queue.splice(0));
    }

    scheduleFlush();
    return null;
  },

  async flush() {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    if (queue.length === 0) return null;
    return createBatchPayload(queue.splice(0));
  },

  async setBatchSize(size) {
    batchSize = Math.max(1, size);
  },

  async setFlushInterval(ms) {
    flushIntervalMs = Math.max(1000, ms);
  },

  async setTimedFlushCallback(cb) {
    onTimedFlush = cb;
  },

  async getPendingCount() {
    return queue.length;
  },

  async clear() {
    queue = [];
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
  },
};

Comlink.expose(api);
