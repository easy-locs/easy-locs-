/**
 * ACTION GUARD TESTS — Verify idempotency, dedup, logging, single-path.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createActionGuard,
  acquireSinglePath,
  isFlowLocked,
  getStructuredLogs,
  clearStructuredLogs,
} from "@/lib/guards/action-guard";

beforeEach(() => {
  clearStructuredLogs();
});

describe("createActionGuard", () => {
  it("executes action and returns success", async () => {
    const guard = createActionGuard("wallet.transfer");
    const result = await guard.execute(async () => ({ txId: "tx-1" }));

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ txId: "tx-1" });
    expect(result.correlationId).toBeDefined();
    expect(result.requestId).toBeDefined();
  });

  it("deduplicates same requestId within window", async () => {
    const guard = createActionGuard("wallet.transfer");
    const requestId = "fixed-req-1";

    const r1 = await guard.execute(async () => "first", { requestId });
    const r2 = await guard.execute(async () => "second", { requestId });

    expect(r1.ok).toBe(true);
    expect(r1.data).toBe("first");
    expect(r2.ok).toBe(true);
    expect(r2.deduplicated).toBe(true);
    expect(r2.data).toBe("first"); // returns cached result
  });

  it("does NOT deduplicate different requestIds", async () => {
    const guard = createActionGuard("orbit.send");

    const r1 = await guard.execute(async () => "a", { requestId: "req-a" });
    const r2 = await guard.execute(async () => "b", { requestId: "req-b" });

    expect(r1.data).toBe("a");
    expect(r2.data).toBe("b");
    expect(r2.deduplicated).toBeFalsy();
  });

  it("handles errors gracefully", async () => {
    const guard = createActionGuard("payment.capture");
    const result = await guard.execute(async () => {
      throw new Error("insufficient_funds");
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("insufficient_funds");
  });

  it("logs structured entries for each execution", async () => {
    const guard = createActionGuard("order.create");

    await guard.execute(async () => "ok", { correlationId: "corr-1" });

    const logs = getStructuredLogs();
    expect(logs.length).toBeGreaterThanOrEqual(2); // started + success
    expect(logs.some(l => l.status === "started")).toBe(true);
    expect(logs.some(l => l.status === "success")).toBe(true);
    expect(logs[0].correlationId).toBe("corr-1");
  });

  it("logs failed entries with error detail", async () => {
    const guard = createActionGuard("wallet.transfer");

    await guard.execute(async () => { throw new Error("boom"); });

    const logs = getStructuredLogs();
    const failLog = logs.find(l => l.status === "failed");
    expect(failLog).toBeDefined();
    expect(failLog!.error).toBe("boom");
  });

  it("preserves custom metadata in logs", async () => {
    const guard = createActionGuard("qr.payment");

    await guard.execute(async () => "ok", {
      metadata: { qrSessionId: "qr-1", amount: 50 },
    });

    const logs = getStructuredLogs();
    expect(logs[0].metadata).toEqual({ qrSessionId: "qr-1", amount: 50 });
  });
});

describe("acquireSinglePath", () => {
  it("allows first acquisition", () => {
    const release = acquireSinglePath("test-flow-1");
    expect(release).not.toBeNull();
    release!();
  });

  it("blocks concurrent acquisition of same flow", () => {
    const release = acquireSinglePath("test-flow-2");
    expect(release).not.toBeNull();

    const second = acquireSinglePath("test-flow-2");
    expect(second).toBeNull(); // blocked

    release!();

    // Now available again
    const third = acquireSinglePath("test-flow-2");
    expect(third).not.toBeNull();
    third!();
  });

  it("allows different flows concurrently", () => {
    const r1 = acquireSinglePath("flow-a");
    const r2 = acquireSinglePath("flow-b");

    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();

    r1!();
    r2!();
  });
});

describe("isFlowLocked", () => {
  it("returns false when not locked", () => {
    expect(isFlowLocked("unlocked-flow")).toBe(false);
  });

  it("returns true when locked", () => {
    const release = acquireSinglePath("locked-flow");
    expect(isFlowLocked("locked-flow")).toBe(true);
    release!();
    expect(isFlowLocked("locked-flow")).toBe(false);
  });
});
