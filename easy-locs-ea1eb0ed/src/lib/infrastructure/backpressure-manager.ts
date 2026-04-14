import { platformBus } from "@/lib/shared/platform-bus";

export interface BackpressureConfig {
  slowThresholdMs: number;
  maxQueueSize: number;
  drainIntervalMs: number;
}

export interface QueueMetrics {
  eventType: string;
  queueDepth: number;
  totalEnqueued: number;
  totalDropped: number;
  totalProcessed: number;
  avgProcessingMs: number;
  isBackpressured: boolean;
}

interface QueuedEvent {
  payload: unknown;
  source: string;
  enqueuedAt: number;
  traceId?: string;
  correlationId?: string;
  userId?: string;
  orgId?: string;
}

interface EventQueue {
  eventType: string;
  queue: QueuedEvent[];
  isProcessing: boolean;
  processingTimes: number[];
  totalEnqueued: number;
  totalDropped: number;
  totalProcessed: number;
  backpressureActive: boolean;
}

const DEFAULT_CONFIG: BackpressureConfig = {
  slowThresholdMs: 200,
  maxQueueSize: 500,
  drainIntervalMs: 50,
};

class BackpressureManager {
  private config: BackpressureConfig;
  private queues = new Map<string, EventQueue>();
  private listenerTimings = new Map<string, number[]>();
  private _drainInterval: ReturnType<typeof setInterval> | null = null;
  private _installed = false;

  constructor(config: Partial<BackpressureConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getOrCreateQueue(eventType: string): EventQueue {
    if (!this.queues.has(eventType)) {
      this.queues.set(eventType, {
        eventType,
        queue: [],
        isProcessing: false,
        processingTimes: [],
        totalEnqueued: 0,
        totalDropped: 0,
        totalProcessed: 0,
        backpressureActive: false,
      });
    }
    return this.queues.get(eventType)!;
  }

  recordListenerTiming(eventType: string, durationMs: number): void {
    if (!this.listenerTimings.has(eventType)) {
      this.listenerTimings.set(eventType, []);
    }
    const timings = this.listenerTimings.get(eventType)!;
    timings.push(durationMs);
    if (timings.length > 50) timings.shift();
  }

  isSlowEvent(eventType: string): boolean {
    const timings = this.listenerTimings.get(eventType);
    if (!timings || timings.length < 3) return false;
    const recent = timings.slice(-5);
    const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
    return avg > this.config.slowThresholdMs;
  }

  enqueue(
    eventType: string,
    payload: unknown,
    source: string,
    meta?: { traceId?: string; correlationId?: string; userId?: string; orgId?: string },
  ): "enqueued" | "dropped" | "pass_through" {
    if (!this.isSlowEvent(eventType)) return "pass_through";

    const q = this.getOrCreateQueue(eventType);
    q.backpressureActive = true;

    if (q.queue.length >= this.config.maxQueueSize) {
      q.queue.shift();
      q.totalDropped++;
      console.warn(
        `[backpressure] Queue full for "${eventType}", dropped oldest event (total dropped: ${q.totalDropped})`,
      );
      platformBus.emit(
        "system:backpressure_drop",
        { eventType, totalDropped: q.totalDropped, queueSize: this.config.maxQueueSize },
        "system",
      );
    }

    q.queue.push({
      payload,
      source,
      enqueuedAt: Date.now(),
      traceId: meta?.traceId,
      correlationId: meta?.correlationId,
      userId: meta?.userId,
      orgId: meta?.orgId,
    });
    q.totalEnqueued++;
    return "enqueued";
  }

  private async drainQueues(): Promise<void> {
    for (const [, q] of this.queues) {
      if (q.queue.length === 0 || q.isProcessing) continue;

      q.isProcessing = true;
      const item = q.queue.shift();
      if (!item) {
        q.isProcessing = false;
        continue;
      }

      const start = performance.now();
      try {
        platformBus.emitInternal(q.eventType, item.payload, item.source, {
          traceId: item.traceId,
          correlationId: item.correlationId ?? item.traceId,
          userId: item.userId,
          orgId: item.orgId,
        });
        q.totalProcessed++;
      } catch (e) {
        console.error(`[backpressure] Error draining "${q.eventType}":`, e);
      } finally {
        const duration = performance.now() - start;
        q.processingTimes.push(duration);
        if (q.processingTimes.length > 50) q.processingTimes.shift();
        q.isProcessing = false;
      }

      if (q.queue.length === 0) {
        q.backpressureActive = false;
      }
    }
  }

  getQueueMetrics(): QueueMetrics[] {
    return Array.from(this.queues.values()).map((q) => {
      const avg =
        q.processingTimes.length > 0
          ? q.processingTimes.reduce((s, v) => s + v, 0) /
            q.processingTimes.length
          : 0;
      return {
        eventType: q.eventType,
        queueDepth: q.queue.length,
        totalEnqueued: q.totalEnqueued,
        totalDropped: q.totalDropped,
        totalProcessed: q.totalProcessed,
        avgProcessingMs: Math.round(avg),
        isBackpressured: q.backpressureActive,
      };
    });
  }

  getQueueDepthByDomain(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [eventType, q] of this.queues) {
      const domain = eventType.split(/[:.]/)[0];
      result[domain] = (result[domain] ?? 0) + q.queue.length;
    }
    return result;
  }

  getTotalQueueDepth(): number {
    let total = 0;
    for (const q of this.queues.values()) total += q.queue.length;
    return total;
  }

  install(): () => void {
    if (this._installed) return () => {};
    this._installed = true;

    this._drainInterval = setInterval(() => {
      this.drainQueues();
    }, this.config.drainIntervalMs);

    return () => {
      this._installed = false;
      if (this._drainInterval) {
        clearInterval(this._drainInterval);
        this._drainInterval = null;
      }
    };
  }

  reset(): void {
    this.queues.clear();
    this.listenerTimings.clear();
    if (this._drainInterval) {
      clearInterval(this._drainInterval);
      this._drainInterval = null;
    }
    this._installed = false;
  }
}

export const backpressureManager = new BackpressureManager();
