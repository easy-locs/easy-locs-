/**
 * Orbit Back-Pressure — Real-time flow control.
 *
 * Pure helpers that keep outbound realtime throughput under control when the
 * client is slow, offline, or the transport is saturated. Used by the
 * realtime owner to decide whether to send, buffer, drop, or coalesce a
 * message.
 */

export type BackpressureAction = "send" | "buffer" | "drop" | "coalesce";

export interface BackpressureState {
  /** Messages currently awaiting ack. */
  inFlight: number;
  /** Bytes currently awaiting ack. */
  bytesInFlight: number;
  /** RTT (ms) observed on the last successful ack. */
  lastRttMs: number;
  /** Consecutive failures. */
  failureStreak: number;
  /** Transport state. */
  connectionState: "online" | "reconnecting" | "offline";
}

export interface BackpressurePolicy {
  maxInFlight: number;
  maxBytesInFlight: number;
  coalesceThresholdMs: number;
  dropAfterFailures: number;
}

export const DEFAULT_POLICY: BackpressurePolicy = {
  maxInFlight: 64,
  maxBytesInFlight: 1_000_000,
  coalesceThresholdMs: 200,
  dropAfterFailures: 8,
};

export interface OutboundEnvelope {
  /** Low/normal/high — drops start from low. */
  priority: "low" | "normal" | "high";
  /** Transient types like typing/presence can be coalesced safely. */
  type: "message" | "presence" | "typing" | "receipt" | "control";
  /** Approximate size in bytes. */
  sizeBytes: number;
  /** Milliseconds since last identical coalescable event (if any). */
  sinceLastSimilarMs?: number;
}

export function decide(
  state: BackpressureState,
  envelope: OutboundEnvelope,
  policy: BackpressurePolicy = DEFAULT_POLICY,
): { action: BackpressureAction; reason: string } {
  if (state.connectionState === "offline") {
    if (envelope.type === "typing" || envelope.type === "presence") {
      return { action: "drop", reason: "offline_transient" };
    }
    return { action: "buffer", reason: "offline" };
  }

  if (
    state.failureStreak >= policy.dropAfterFailures &&
    envelope.priority === "low"
  ) {
    return { action: "drop", reason: "failure_streak_low_priority" };
  }

  if (
    (envelope.type === "typing" || envelope.type === "presence") &&
    envelope.sinceLastSimilarMs !== undefined &&
    envelope.sinceLastSimilarMs < policy.coalesceThresholdMs
  ) {
    return { action: "coalesce", reason: "recent_similar_event" };
  }

  const overCount = state.inFlight >= policy.maxInFlight;
  const overBytes = state.bytesInFlight + envelope.sizeBytes > policy.maxBytesInFlight;

  if (overCount || overBytes) {
    if (envelope.priority === "high") return { action: "send", reason: "high_priority_bypass" };
    return { action: "buffer", reason: overBytes ? "bytes_saturation" : "inflight_saturation" };
  }

  if (state.connectionState === "reconnecting" && envelope.priority !== "high") {
    return { action: "buffer", reason: "reconnecting" };
  }

  return { action: "send", reason: "ok" };
}

/**
 * Exponential reconnect delay with a cap, designed to match typical realtime
 * transports (Supabase Realtime, Socket.io).
 */
export function reconnectDelayMs(attempt: number, capMs = 30_000): number {
  const base = 500;
  const expo = Math.min(capMs, base * 2 ** Math.max(0, attempt));
  const jitter = Math.floor(expo * 0.3 * Math.random());
  return expo + jitter;
}

/**
 * Summary metric (p-est) for ops dashboards. Uses the classic EWMA so we don't
 * need to keep a sliding window.
 */
export class EwmaLatency {
  private value = 0;
  private hasValue = false;
  constructor(private readonly alpha = 0.2) {}

  push(sample: number): void {
    if (!this.hasValue) {
      this.value = sample;
      this.hasValue = true;
      return;
    }
    this.value = this.alpha * sample + (1 - this.alpha) * this.value;
  }

  get(): number {
    return Math.round(this.value * 100) / 100;
  }
}
