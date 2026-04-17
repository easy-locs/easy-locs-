/**
 * L2 — Agent heartbeat & health model (task #810).
 *
 * Worker-side emitter contract:
 *   - emit() is best-effort: a failing RPC NEVER throws.
 *   - The emitter coalesces overlapping calls (only one inflight RPC).
 *   - deriveWorkerId is deterministic per-process and unique per-process.
 *   - The cadence floor is 1000ms (no accidental every-1ms storms).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createHeartbeatEmitter,
  deriveWorkerId,
  DEFAULT_HEARTBEAT_CADENCE_MS,
  type HeartbeatRpc,
  type HeartbeatRpcResult,
  type HeartbeatPayload,
} from "../../supabase/functions/_shared/execution/heartbeat-emitter.ts";

function recordingRpc(
  responder: (input: HeartbeatPayload) => Promise<HeartbeatRpcResult> | HeartbeatRpcResult =
    () => ({ ok: true, healthStatus: "healthy", reason: "ok" }),
): HeartbeatRpc & { calls: HeartbeatPayload[] } {
  const calls: HeartbeatPayload[] = [];
  return {
    calls,
    async call(input) {
      calls.push(input);
      return await responder(input);
    },
  };
}

describe("deriveWorkerId", () => {
  it("is deterministic within the same process (same boot uuid)", () => {
    const a = deriveWorkerId({ hostname: "h", pid: 42 });
    const b = deriveWorkerId({ hostname: "h", pid: 42 });
    expect(a).toBe(b);
    expect(a.startsWith("h:42:")).toBe(true);
  });

  it("changes when boot uuid is overridden (simulating a restart)", () => {
    const a = deriveWorkerId({ hostname: "h", pid: 42, bootUuid: "boot-1" });
    const b = deriveWorkerId({ hostname: "h", pid: 42, bootUuid: "boot-2" });
    expect(a).not.toBe(b);
  });

  it("differentiates by pid on the same host", () => {
    const a = deriveWorkerId({ hostname: "h", pid: 1, bootUuid: "x" });
    const b = deriveWorkerId({ hostname: "h", pid: 2, bootUuid: "x" });
    expect(a).not.toBe(b);
  });
});

describe("createHeartbeatEmitter — best-effort contract", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("never throws when the RPC rejects — emit() resolves cleanly", async () => {
    const failingRpc: HeartbeatRpc = {
      async call() { throw new Error("network down"); },
    };
    const observed: HeartbeatRpcResult[] = [];
    const beat = createHeartbeatEmitter({
      agentSlug: "marketplace.publish",
      workerId: "w-1",
      rpc: failingRpc,
      onResult: (r) => observed.push(r),
    });
    await expect(beat.emitNow()).resolves.toBeUndefined();
    expect(observed.length).toBe(1);
    expect(observed[0].ok).toBe(false);
    expect(observed[0].errorMessage).toMatch(/network down/);
  });

  it("never throws when the RPC returns an error envelope", async () => {
    const rpc: HeartbeatRpc = {
      async call() { return { ok: false, errorMessage: "agent_not_registered" }; },
    };
    const observed: HeartbeatRpcResult[] = [];
    const beat = createHeartbeatEmitter({
      agentSlug: "x.y", workerId: "w", rpc, onResult: (r) => observed.push(r),
    });
    await beat.emitNow();
    expect(observed[0]).toEqual(
      expect.objectContaining({ ok: false, errorMessage: "agent_not_registered" }),
    );
  });

  it("forwards in-flight / queue-depth / custom from the live getters", async () => {
    let inFlight = 3, queue = 7;
    const rpc = recordingRpc();
    const beat = createHeartbeatEmitter({
      agentSlug: "marketplace.publish",
      workerId: "w-1",
      rpc,
      getInFlight:  () => inFlight,
      getQueueDepth: () => queue,
      custom: () => ({ build: "abc123" }),
      region: "eu-west-1",
      version: "1.2.3",
    });
    await beat.emitNow();
    expect(rpc.calls).toHaveLength(1);
    expect(rpc.calls[0]).toEqual(expect.objectContaining({
      agentSlug: "marketplace.publish",
      workerId:  "w-1",
      inFlight:  3,
      queueDepth: 7,
      region:    "eu-west-1",
      version:   "1.2.3",
      custom:    { build: "abc123" },
    }));

    inFlight = 5; queue = 0;
    await beat.emitNow();
    expect(rpc.calls[1]).toEqual(expect.objectContaining({ inFlight: 5, queueDepth: 0 }));
  });

  it("normalises NaN / negative counters to 0 (defensive)", async () => {
    const rpc = recordingRpc();
    const beat = createHeartbeatEmitter({
      agentSlug: "x.y",
      workerId: "w",
      rpc,
      getInFlight:  () => -3,
      getQueueDepth: () => Number.NaN,
    });
    await beat.emitNow();
    expect(rpc.calls[0].inFlight).toBe(0);
    expect(rpc.calls[0].queueDepth).toBe(0);
  });

  it("coalesces overlapping emits — a second call while one is in-flight is a no-op", async () => {
    const resolvers: Array<(r: HeartbeatRpcResult) => void> = [];
    const callFn = vi.fn(
      () => new Promise<HeartbeatRpcResult>((res) => { resolvers.push(res); }),
    );
    const rpc: HeartbeatRpc = { call: callFn as unknown as HeartbeatRpc["call"] };
    const beat = createHeartbeatEmitter({
      agentSlug: "x.y", workerId: "w", rpc,
    });
    const p1 = beat.emitNow();
    const p2 = beat.emitNow();   // should NOT trigger a second RPC call
    expect(callFn.mock.calls.length).toBe(1);

    // Release the inflight call → both p1 and p2 resolve.
    resolvers[0]({ ok: true });
    await Promise.all([p1, p2]);
    expect(callFn.mock.calls.length).toBe(1);

    // Now a fresh emit IS allowed to fire and produces a second RPC call.
    const p3 = beat.emitNow();
    expect(callFn.mock.calls.length).toBe(2);
    resolvers[1]({ ok: true });
    await p3;
  });

  it("start() emits immediately and schedules at the configured cadence", async () => {
    const rpc = recordingRpc();
    const beat = createHeartbeatEmitter({
      agentSlug: "x.y", workerId: "w", rpc, cadenceMs: 5000,
    });
    expect(beat.cadenceMs).toBe(5000);
    beat.start();
    // Immediate emit happens via void emitOnce(); flush microtasks.
    await Promise.resolve(); await Promise.resolve();
    expect(rpc.calls.length).toBe(1);

    await vi.advanceTimersByTimeAsync(5000);
    expect(rpc.calls.length).toBe(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(rpc.calls.length).toBe(3);

    beat.stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(rpc.calls.length).toBe(3);  // no further emits after stop()
  });

  it("clamps cadence below 1000ms to 1000ms (no DDoS-yourself foot-gun)", () => {
    const rpc = recordingRpc();
    const beat = createHeartbeatEmitter({
      agentSlug: "x.y", workerId: "w", rpc, cadenceMs: 50,
    });
    expect(beat.cadenceMs).toBe(1000);
  });

  it("uses the documented default cadence when not specified", () => {
    const rpc = recordingRpc();
    const beat = createHeartbeatEmitter({ agentSlug: "x.y", workerId: "w", rpc });
    expect(beat.cadenceMs).toBe(DEFAULT_HEARTBEAT_CADENCE_MS);
  });
});
