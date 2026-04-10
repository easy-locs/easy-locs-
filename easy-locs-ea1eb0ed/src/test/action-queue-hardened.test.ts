/**
 * ACTION QUEUE — Full Prod Hardened Tests
 * Tests all 6 blocker fixes:
 * 1. Dedup returns shared real result
 * 2. Offline replay preserves failed tasks
 * 3. Context propagation (requestId/correlationId to execute)
 * 4. Non-retryable errors skip retry
 * 5. Empty queues cleaned from Map
 * 6. Offline payloads contain full data
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueue,
  drainAllQueues,
  clearQueueLogs,
  getQueueHealth,
  getOfflineTasks,
  clearOfflineTasks,
  replayOffline,
  isNonRetryableError,
  QUEUE_PRIORITY,
  type QueueExecutionContext,
} from "@/lib/queue/action-queue";

beforeEach(() => {
  drainAllQueues();
  clearQueueLogs();
  clearOfflineTasks();
});

describe("FIX #1: Dedup returns shared real result", () => {
  it("two enqueues with same taskId return the SAME promise with real data", async () => {
    let execCount = 0;

    const task = {
      id: "pay-1",
      domain: "wallet",
      action: "capture",
      priority: 10,
      execute: async () => {
        execCount++;
        await new Promise((r) => setTimeout(r, 50));
        return { captured: true, amount: 100 };
      },
    };

    const [r1, r2] = await Promise.all([
      enqueue("wallet:pay-1", task),
      enqueue("wallet:pay-1", task),
    ]);

    expect(execCount).toBe(1);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r1.data).toEqual({ captured: true, amount: 100 });
    expect(r2.data).toEqual({ captured: true, amount: 100 });
  });

  it("10 spam clicks return the same real result", async () => {
    let execCount = 0;
    const task = {
      id: "spam-1",
      domain: "wallet",
      action: "capture",
      priority: 10,
      execute: async () => {
        execCount++;
        return "real-result";
      },
    };

    const results = await Promise.all(
      Array.from({ length: 10 }, () => enqueue("spam:key", task))
    );

    expect(execCount).toBe(1);
    for (const r of results) {
      expect(r.ok).toBe(true);
      expect(r.data).toBe("real-result");
    }
  });
});

describe("FIX #2: Offline replay preserves failed tasks", () => {
  it("only removes successfully replayed tasks", async () => {
    const tasks = [
      { id: "ok-1", domain: "wallet", action: "capture", priority: 10, payload: { amount: 50 }, savedAt: Date.now() },
      { id: "fail-1", domain: "wallet", action: "capture", priority: 10, payload: { amount: 100 }, savedAt: Date.now() },
    ];
    localStorage.setItem("orbit_offline_queue", JSON.stringify(tasks));

    const result = await replayOffline((task) => {
      if (task.id === "ok-1") return async () => "success";
      if (task.id === "fail-1") return async () => { throw new Error("network"); };
      return null;
    });

    expect(result.replayed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(1);

    const remaining = getOfflineTasks();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe("fail-1");
  });

  it("clears storage when all tasks succeed", async () => {
    const tasks = [
      { id: "ok-1", domain: "d", action: "a", priority: 5, payload: { x: 1 }, savedAt: Date.now() },
    ];
    localStorage.setItem("orbit_offline_queue", JSON.stringify(tasks));

    const result = await replayOffline(() => async () => "done");

    expect(result.replayed).toBe(1);
    expect(result.remaining).toBe(0);
    expect(getOfflineTasks().length).toBe(0);
  });
});

describe("FIX #3: Context propagation", () => {
  it("execute receives requestId and correlationId", async () => {
    let receivedCtx: QueueExecutionContext | null = null;

    await enqueue("ctx-test", {
      id: "t1",
      domain: "test",
      action: "check",
      priority: 5,
      requestId: "req-abc",
      correlationId: "corr-xyz",
      execute: async (ctx) => {
        receivedCtx = ctx;
        return "ok";
      },
    });

    expect(receivedCtx).not.toBeNull();
    expect(receivedCtx!.requestId).toBe("req-abc");
    expect(receivedCtx!.correlationId).toBe("corr-xyz");
    expect(receivedCtx!.attempt).toBe(0);
  });

  it("auto-generates requestId/correlationId if not provided", async () => {
    let receivedCtx: QueueExecutionContext | null = null;

    await enqueue("ctx-test2", {
      id: "t2",
      domain: "test",
      action: "check",
      priority: 5,
      execute: async (ctx) => {
        receivedCtx = ctx;
        return "ok";
      },
    });

    expect(receivedCtx!.requestId).toBeTruthy();
    expect(receivedCtx!.correlationId).toBeTruthy();
    expect(receivedCtx!.requestId.length).toBeGreaterThan(10);
  });
});

describe("FIX #4: Non-retryable errors", () => {
  it("flow_locked skips retries entirely", async () => {
    let attempts = 0;

    const result = await enqueue("nr-test", {
      id: "nr1",
      domain: "wallet",
      action: "capture",
      priority: 10,
      maxRetries: 5,
      execute: async () => {
        attempts++;
        throw new Error("flow_locked");
      },
    });

    expect(attempts).toBe(1);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("flow_locked");
  });

  it("invalid_state skips retries", async () => {
    let attempts = 0;

    const result = await enqueue("nr-test2", {
      id: "nr2",
      domain: "order",
      action: "submit",
      priority: 8,
      maxRetries: 3,
      execute: async () => {
        attempts++;
        throw new Error("invalid_state");
      },
    });

    expect(attempts).toBe(1);
    expect(result.ok).toBe(false);
  });

  it("classifies non-retryable errors correctly", () => {
    expect(isNonRetryableError("terminal_state")).toBe(true);
    expect(isNonRetryableError("duplicate_terminal_action")).toBe(true);
    expect(isNonRetryableError("flow_locked")).toBe(true);
    expect(isNonRetryableError("validation_failed")).toBe(true);
    expect(isNonRetryableError("network_error")).toBe(false);
    expect(isNonRetryableError("timeout")).toBe(false);
  });

  it("network errors ARE retried", async () => {
    let attempts = 0;

    const result = await enqueue("retry-test", {
      id: "rt1",
      domain: "wallet",
      action: "capture",
      priority: 10,
      maxRetries: 2,
      execute: async () => {
        attempts++;
        if (attempts < 3) throw new Error("network_error");
        return "success";
      },
    });

    expect(attempts).toBe(3);
    expect(result.ok).toBe(true);
    expect(result.data).toBe("success");
  });

  it("non-retryable errors are NOT saved offline", async () => {
    await enqueue("nr-offline", {
      id: "nro1",
      domain: "wallet",
      action: "capture",
      priority: 10,
      maxRetries: 0,
      offlineCapable: true,
      offlinePayload: { amount: 100 },
      execute: async () => { throw new Error("flow_locked"); },
    });

    expect(getOfflineTasks().length).toBe(0);
  });
});

describe("FIX #5: Memory cleanup", () => {
  it("queue deleted from Map after task completes", async () => {
    await enqueue("cleanup-test", {
      id: "c1",
      domain: "test",
      action: "check",
      priority: 5,
      execute: async () => "done",
    });

    const health = getQueueHealth();
    expect(health.activeQueues).toBe(0);
    expect(health.totalPending).toBe(0);
  });

  it("queue deleted after failed task too", async () => {
    await enqueue("cleanup-fail", {
      id: "cf1",
      domain: "test",
      action: "fail",
      priority: 5,
      execute: async () => { throw new Error("boom"); },
    });

    expect(getQueueHealth().activeQueues).toBe(0);
  });
});

describe("FIX #6: Offline payloads contain full data", () => {
  it("saves requestId, correlationId, and full payload", async () => {
    await enqueue("offline-full", {
      id: "of1",
      domain: "wallet",
      action: "capture",
      priority: 10,
      maxRetries: 0,
      offlineCapable: true,
      offlinePayload: { paymentId: "pay123", amount: 50, currency: "EUR" },
      requestId: "req-offline-1",
      correlationId: "corr-offline-1",
      execute: async () => { throw new Error("network_timeout"); },
    });

    const saved = getOfflineTasks();
    expect(saved.length).toBe(1);
    expect(saved[0].payload).toEqual({ paymentId: "pay123", amount: 50, currency: "EUR" });
    expect(saved[0].requestId).toBe("req-offline-1");
    expect(saved[0].correlationId).toBe("corr-offline-1");
  });
});

describe("Sequential + Priority", () => {
  it("same queue key tasks run sequentially (max 1 concurrent)", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const makeTask = (id: string) => enqueue("serial-q", {
      id,
      domain: "test",
      action: "serial",
      priority: 5,
      execute: async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise((r) => setTimeout(r, 20));
        concurrent--;
      },
    });

    await Promise.all([makeTask("a"), makeTask("b"), makeTask("c")]);
    expect(maxConcurrent).toBe(1);
  });
});
