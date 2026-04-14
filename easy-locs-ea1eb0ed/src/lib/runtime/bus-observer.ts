/**
 * BusObserver — Single typed instrumentation layer for the platformBus.
 *
 * Uses only documented public APIs (no monkeypatching, no `as any`):
 *   - platformBus.addInterceptor()  — observe emits before dispatch
 *   - platformBus.setTimingReporter() — per-listener latency + failure detection
 *
 * Latency semantics: emit-to-consume (time from emit() call to when the
 * listener starts executing), tracked via performance.now() timestamps.
 *
 * Replay correlation: a per-type deque of pending events is maintained.
 * Each new interceptor call for a type advances (pops) the previous head,
 * so fan-out failures all see the correct event for their emit.
 *
 * Dead-pipeline detection: event counter is reset by the flux auditor
 * once per scan cycle via resetEventCounter().
 *
 * Install once at app startup (busObserver.install()); teardown is idempotent.
 */
import { platformBus, type PlatformEvent } from "@/lib/shared/platform-bus";

export interface BusLatencyMetric {
  eventType: string;
  samples: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  lastMeasuredAt: string | null;
}

export interface BusEventRecord {
  event: string;
  timestamp: number;
}

type FailureCallback = (event: PlatformEvent, type: string) => void;
type EmitCallback = (type: string) => void;

interface LatencyStat {
  samples: number[];
  totalMs: number;
  maxMs: number;
}

/** Per-type queue entry: one entry per emit() call. */
interface PendingEntry {
  /** performance.now() at the moment addInterceptor fired (just before dispatch). */
  emitPerfTime: number;
  /** Minimal PlatformEvent reconstructed from interceptor args for replay. */
  event: PlatformEvent;
}

const MAX_LATENCY_SAMPLES = 200;
const MAX_EVENT_HISTORY = 500;
const MAX_QUEUE_DEPTH = 100;

class BusObserver {
  private latencyStats = new Map<string, LatencyStat>();

  /**
   * Per-type FIFO deque of pending emit entries.
   * Interceptor pushes; the NEXT interceptor for the same type pops the head
   * (marking the previous emit's listeners as fully dispatched).
   * This lets all fan-out listeners see the correct event for their emit.
   */
  private pendingQueue = new Map<string, PendingEntry[]>();

  private eventHistory: BusEventRecord[] = [];
  private eventCounter = 0;
  private lastEventCountReset = Date.now();

  private failureCallbacks: FailureCallback[] = [];
  private emitCallbacks: EmitCallback[] = [];
  private teardowns: Array<() => void> = [];
  private installed = false;

  install(): () => void {
    if (this.installed) return () => {};
    this.installed = true;

    // addInterceptor fires synchronously before dispatch.
    // We advance the queue (pop previous head) and push a new entry for this emit.
    const offIntercept = platformBus.addInterceptor((type, payload, source) => {
      const wallClockMs = Date.now();
      const emitPerfTime = performance.now();

      // Advance the queue: pop the previous head for this type (fully dispatched).
      const queue = this.pendingQueue.get(type);
      if (queue && queue.length > 0) queue.shift();

      // Push this emit's entry
      const entry: PendingEntry = {
        emitPerfTime,
        event: {
          type,
          payload,
          // Cast matches how platformBus._emitCore itself casts source internally.
          source: source as PlatformEvent["source"],
          timestamp: wallClockMs,
        },
      };
      if (!this.pendingQueue.has(type)) this.pendingQueue.set(type, []);
      const q = this.pendingQueue.get(type)!;
      q.push(entry);
      if (q.length > MAX_QUEUE_DEPTH) q.shift(); // overflow guard

      // Event tracking
      this.eventCounter++;
      this.eventHistory.push({ event: type, timestamp: wallClockMs });
      if (this.eventHistory.length > MAX_EVENT_HISTORY) {
        this.eventHistory.splice(0, this.eventHistory.length - MAX_EVENT_HISTORY);
      }

      for (const cb of this.emitCallbacks) {
        try { cb(type); } catch {}
      }

      return "pass";
    });

    // setTimingReporter fires per typed listener invocation.
    // durationMs = listener execution time (performance.now() delta).
    // Emit-to-consume = listenerStartPerfTime - emitPerfTime.
    const offTimer = platformBus.setTimingReporter((type, durationMs, success) => {
      const queue = this.pendingQueue.get(type);
      const head = queue && queue.length > 0 ? queue[0] : null;

      if (head !== null) {
        // Emit-to-consume: approximate listener start time from report-call time minus duration
        const reportCallPerfTime = performance.now();
        const listenerStartPerfTime = reportCallPerfTime - durationMs;
        const emitToConsumeMs = Math.max(0, listenerStartPerfTime - head.emitPerfTime);

        if (!this.latencyStats.has(type)) {
          this.latencyStats.set(type, { samples: [], totalMs: 0, maxMs: 0 });
        }
        const stat = this.latencyStats.get(type)!;
        // Ring buffer: when at capacity evict the oldest sample and subtract its
        // value from totalMs so that avgLatencyMs = totalMs / samples.length
        // remains accurate and doesn't inflate over time.
        if (stat.samples.length >= MAX_LATENCY_SAMPLES) {
          const evicted = stat.samples.shift()!;
          stat.totalMs -= evicted;
        }
        stat.samples.push(emitToConsumeMs);
        stat.totalMs += emitToConsumeMs;
        if (emitToConsumeMs > stat.maxMs) stat.maxMs = emitToConsumeMs;
      }

      if (!success && head !== null) {
        for (const cb of this.failureCallbacks) {
          try { cb(head.event, type); } catch {}
        }
      }
    });

    this.teardowns.push(offIntercept, offTimer);
    return () => this.teardown();
  }

  onFailure(cb: FailureCallback): () => void {
    this.failureCallbacks.push(cb);
    return () => {
      this.failureCallbacks = this.failureCallbacks.filter(f => f !== cb);
    };
  }

  onEmit(cb: EmitCallback): () => void {
    this.emitCallbacks.push(cb);
    return () => {
      this.emitCallbacks = this.emitCallbacks.filter(f => f !== cb);
    };
  }

  getLatencyMetrics(): Record<string, BusLatencyMetric> {
    const result: Record<string, BusLatencyMetric> = {};
    for (const [type, stat] of this.latencyStats) {
      if (stat.samples.length === 0) continue;
      const sorted = [...stat.samples].sort((a, b) => a - b);
      const avg = stat.totalMs / stat.samples.length;
      const p95Idx = Math.min(Math.floor(sorted.length * 0.95), sorted.length - 1);
      result[type] = {
        eventType: type,
        samples: stat.samples.length,
        avgLatencyMs: Math.round(avg),
        maxLatencyMs: Math.round(stat.maxMs),
        p95LatencyMs: Math.round(sorted[p95Idx] ?? stat.maxMs),
        lastMeasuredAt: new Date().toISOString(),
      };
    }
    return result;
  }

  getEventHistory(): BusEventRecord[] {
    return this.eventHistory;
  }

  getEventCounter(): number {
    return this.eventCounter;
  }

  /**
   * Reset the event counter and reset timestamp.
   * Called by the flux auditor once per scan cycle to enable per-window
   * dead-pipeline detection ("no events in last N seconds").
   */
  resetEventCounter(): void {
    this.eventCounter = 0;
    this.lastEventCountReset = Date.now();
  }

  getLastEventCountReset(): number {
    return this.lastEventCountReset;
  }

  isInstalled(): boolean {
    return this.installed;
  }

  teardown(): void {
    for (const fn of this.teardowns) fn();
    this.teardowns = [];
    this.installed = false;
  }
}

export const busObserver = new BusObserver();
