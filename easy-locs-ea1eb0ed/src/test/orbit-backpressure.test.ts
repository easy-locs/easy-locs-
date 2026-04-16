import { describe, it, expect } from "vitest";
import {
  decide,
  reconnectDelayMs,
  EwmaLatency,
  DEFAULT_POLICY,
  type BackpressureState,
  type OutboundEnvelope,
} from "@/domains/orbit/backpressure";

const healthy: BackpressureState = {
  inFlight: 2,
  bytesInFlight: 5_000,
  lastRttMs: 120,
  failureStreak: 0,
  connectionState: "online",
};

const msg: OutboundEnvelope = { priority: "normal", type: "message", sizeBytes: 800 };

describe("orbit/backpressure", () => {
  it("sends on healthy transport", () => {
    expect(decide(healthy, msg).action).toBe("send");
  });

  it("buffers normal traffic when offline", () => {
    expect(decide({ ...healthy, connectionState: "offline" }, msg).action).toBe("buffer");
  });

  it("drops transient events when offline", () => {
    const typing: OutboundEnvelope = { priority: "low", type: "typing", sizeBytes: 40 };
    expect(decide({ ...healthy, connectionState: "offline" }, typing).action).toBe("drop");
  });

  it("coalesces frequent similar transient events", () => {
    const env: OutboundEnvelope = {
      priority: "low",
      type: "typing",
      sizeBytes: 40,
      sinceLastSimilarMs: 50,
    };
    expect(decide(healthy, env).action).toBe("coalesce");
  });

  it("buffers when inflight exceeds policy", () => {
    const saturated = { ...healthy, inFlight: DEFAULT_POLICY.maxInFlight + 1 };
    expect(decide(saturated, msg).action).toBe("buffer");
  });

  it("buffers when bytes-in-flight exceeds policy", () => {
    const saturated = { ...healthy, bytesInFlight: DEFAULT_POLICY.maxBytesInFlight };
    expect(decide(saturated, msg).action).toBe("buffer");
  });

  it("high-priority bypasses saturation", () => {
    const saturated = { ...healthy, inFlight: DEFAULT_POLICY.maxInFlight + 10 };
    const hp: OutboundEnvelope = { ...msg, priority: "high" };
    expect(decide(saturated, hp).action).toBe("send");
  });

  it("drops low-priority on failure streak", () => {
    const failing = { ...healthy, failureStreak: DEFAULT_POLICY.dropAfterFailures + 1 };
    const lp: OutboundEnvelope = { ...msg, priority: "low" };
    expect(decide(failing, lp).action).toBe("drop");
  });

  it("buffers during reconnecting except high-priority", () => {
    const rc = { ...healthy, connectionState: "reconnecting" as const };
    expect(decide(rc, msg).action).toBe("buffer");
    expect(decide(rc, { ...msg, priority: "high" }).action).toBe("send");
  });

  it("reconnect delay grows exponentially with cap", () => {
    const d0 = reconnectDelayMs(0);
    const d5 = reconnectDelayMs(5);
    const dcap = reconnectDelayMs(20, 30_000);
    expect(d5).toBeGreaterThan(d0);
    expect(dcap).toBeLessThanOrEqual(30_000 * 1.3);
  });

  it("EWMA smooths latency samples", () => {
    const e = new EwmaLatency(0.5);
    e.push(100);
    e.push(200);
    const v = e.get();
    expect(v).toBeGreaterThan(100);
    expect(v).toBeLessThan(200);
  });
});
