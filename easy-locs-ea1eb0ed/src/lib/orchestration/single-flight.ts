/**
 * Single-flight orchestration primitive — Task #1004 (Hardening).
 *
 * Goals:
 *   1. Two callers asking for the same flow at the same time share one
 *      execution (no duplicate work).
 *   2. A worker that crashes mid-flow does not strand the lock — it
 *      times out via heartbeat and the next caller can resume.
 *   3. State transitions are explicit and observable.
 *
 * Storage is intentionally process-local. Cross-process single-flight
 * uses the same contract on top of `idempotency_keys` (see
 * src/lib/idempotency) — wire both layers when a flow may run on
 * multiple workers.
 */
export type FlowState = "idle" | "running" | "succeeded" | "failed" | "timeout";

export interface SingleFlightOptions {
  timeoutMs?: number;
  heartbeatMs?: number;
  onStateChange?: (key: string, from: FlowState, to: FlowState) => void;
}

interface FlightEntry<T> {
  state: FlowState;
  promise: Promise<T>;
  startedAt: number;
  lastBeatAt: number;
  heartbeat?: ReturnType<typeof setInterval>;
}

const VALID_TRANSITIONS: Record<FlowState, FlowState[]> = {
  idle: ["running"],
  running: ["succeeded", "failed", "timeout"],
  succeeded: ["idle", "running"],
  failed: ["idle", "running"],
  timeout: ["idle", "running"],
};

export class SingleFlight {
  private inflight = new Map<string, FlightEntry<unknown>>();
  private listeners: SingleFlightOptions["onStateChange"][] = [];

  on(listener: NonNullable<SingleFlightOptions["onStateChange"]>): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(key: string, from: FlowState, to: FlowState) {
    if (!VALID_TRANSITIONS[from].includes(to)) {
      throw new Error(`[single-flight] invalid transition ${from} -> ${to} for ${key}`);
    }
    for (const l of this.listeners) {
      try {
        l?.(key, from, to);
      } catch {
        /* listener errors must not break the flow */
      }
    }
  }

  /**
   * Run `fn` under a key. Concurrent callers share the same promise.
   * If a previous run timed out, the next call starts a fresh attempt.
   */
  run<T>(key: string, fn: () => Promise<T>, options: SingleFlightOptions = {}): Promise<T> {
    const existing = this.inflight.get(key) as FlightEntry<T> | undefined;
    const timeoutMs = options.timeoutMs ?? 30_000;
    const heartbeatMs = options.heartbeatMs ?? Math.max(1_000, Math.floor(timeoutMs / 5));

    if (existing && existing.state === "running") {
      const stalled = Date.now() - existing.lastBeatAt > timeoutMs * 2;
      if (!stalled) return existing.promise;
      this.cleanup(key, existing);
      this.emit(key, "running", "timeout");
    }

    if (options.onStateChange) this.on(options.onStateChange);

    this.emit(key, "idle", "running");

    const startedAt = Date.now();
    const promise = (async () => {
      try {
        const result = await Promise.race([
          fn(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`single-flight timeout: ${key}`)), timeoutMs),
          ),
        ]);
        this.emit(key, "running", "succeeded");
        return result;
      } catch (e) {
        const isTimeout = (e as Error).message?.startsWith("single-flight timeout");
        this.emit(key, "running", isTimeout ? "timeout" : "failed");
        throw e;
      } finally {
        const entry = this.inflight.get(key);
        if (entry) this.cleanup(key, entry);
      }
    })();

    const entry: FlightEntry<T> = {
      state: "running",
      promise,
      startedAt,
      lastBeatAt: startedAt,
    };
    entry.heartbeat = setInterval(() => {
      entry.lastBeatAt = Date.now();
    }, heartbeatMs);
    this.inflight.set(key, entry as FlightEntry<unknown>);
    return promise;
  }

  private cleanup(key: string, entry: FlightEntry<unknown>) {
    if (entry.heartbeat) clearInterval(entry.heartbeat);
    this.inflight.delete(key);
  }

  isRunning(key: string): boolean {
    return this.inflight.get(key)?.state === "running";
  }

  size(): number {
    return this.inflight.size;
  }
}

export const globalSingleFlight = new SingleFlight();
