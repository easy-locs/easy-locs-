/**
 * TESTS: Action Queue Engine — priority, sequential, retry, offline, dedup, guarded integration.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  enqueue,
  getQueueHealth,
  getQueueLogs,
  clearQueueLogs,
  drainAllQueues,
  getOfflineTasks,
  clearOfflineTasks,
  replayOffline,
  QUEUE_PRIORITY,
} from "@/lib/queue/action-queue";
import {
  guardedEnqueue,
  enqueueSendMessage,
  enqueueCapturePayment,
  enqueueQrPayment,
  enqueueCreateOrder,
  enqueueAssignDriver,
} from "@/lib/queue/guarded-queue";

beforeEach(() => {
  drainAllQueues();
  clearQueueLogs();
  clearOfflineTasks();
});

// ══════════════════════════════════════════════════
// BASIC QUEUE BEHAVIOR
// ══════════════════════════════════════════════════

describe("Action Queue — Sequential Execution", () => {
  it("executes tasks sequentially on the same queue key", async () => {
    const order: number[] = [];

    const p1 = enqueue("seq:test", {
      id: "t1", domain: "test", action: "seq", priority: 5,
      execute: async () => { await sleep(20); order.push(1); return 1; },
    });

    const p2 = enqueue("seq:test", {
      id: "t2", domain: "test", action: "seq", priority: 5,
      execute: async () => { order.push(2); return 2; },
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.ok).toBe(true);
    expect(r1.data).toBe(1);
    expect(r2.ok).toBe(true);
    expect(order).toEqual([1, 2]); // sequential, not interleaved
  });

  it("different queue keys execute in parallel", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const makeTask = (key: string) => enqueue(key, {
      id: key, domain: "test", action: "parallel", priority: 5,
      execute: async () => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await sleep(30);
        concurrent--;
      },
    });

    await Promise.all([makeTask("a"), makeTask("b"), makeTask("c")]);
    expect(maxConcurrent).toBeGreaterThanOrEqual(2); // at least 2 ran in parallel
  });
});

describe("Action Queue — Priority Ordering", () => {
  it("higher priority tasks execute first", async () => {
    const order: string[] = [];

    // Block the queue with a slow task
    const blocker = enqueue("pri:test", {
      id: "blocker", domain: "test", action: "block", priority: 1,
      execute: async () => { await sleep(30); order.push("blocker"); },
    });

    // Enqueue low then high priority while blocked
    const low = enqueue("pri:test", {
      id: "low", domain: "test", action: "low", priority: 1,
      execute: async () => { order.push("low"); },
    });

    const high = enqueue("pri:test", {
      id: "high", domain: "test", action: "high", priority: 10,
      execute: async () => { order.push("high"); },
    });

    await Promise.all([blocker, high, low]);

    // blocker runs first (already started), then high (priority 10) before low (priority 1)
    expect(order[0]).toBe("blocker");
    expect(order[1]).toBe("high");
    expect(order[2]).toBe("low");
  });

  it("payment priority > message priority > tracking priority", () => {
    expect(QUEUE_PRIORITY.PAYMENT_CAPTURE).toBeGreaterThan(QUEUE_PRIORITY.MESSAGE_SEND);
    expect(QUEUE_PRIORITY.MESSAGE_SEND).toBeGreaterThan(QUEUE_PRIORITY.TRACKING);
    expect(QUEUE_PRIORITY.QR_PAYMENT).toBeGreaterThan(QUEUE_PRIORITY.ORDER_SUBMIT);
  });
});

describe("Action Queue — Task Deduplication", () => {
  it("same task ID on same queue key → deduplicated", async () => {
    let calls = 0;

    const r1 = enqueue("dedup:test", {
      id: "same", domain: "test", action: "dedup", priority: 5,
      execute: async () => { calls++; return "done"; },
    });

    const r2 = enqueue("dedup:test", {
      id: "same", domain: "test", action: "dedup", priority: 5,
      execute: async () => { calls++; return "done2"; },
    });

    await Promise.all([r1, r2]);

    // Second enqueue with same id should be deduplicated
    const logs = getQueueLogs();
    const dedups = logs.filter((l) => l.status === "deduplicated");
    expect(dedups.length).toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════
// RETRY WITH EXPONENTIAL BACKOFF
// ══════════════════════════════════════════════════

describe("Action Queue — Retry", () => {
  it("retries on failure with exponential backoff", async () => {
    let attempts = 0;

    const result = await enqueue("retry:test", {
      id: "r1", domain: "test", action: "retry", priority: 5,
      maxRetries: 2,
      execute: async () => {
        attempts++;
        if (attempts < 3) throw new Error("transient");
        return "recovered";
      },
    });

    expect(result.ok).toBe(true);
    expect(result.data).toBe("recovered");
    expect(result.retries).toBe(2);
    expect(attempts).toBe(3); // initial + 2 retries
  }, 15000);

  it("gives up after maxRetries exhausted", async () => {
    const result = await enqueue("retry:fail", {
      id: "rf1", domain: "test", action: "retry", priority: 5,
      maxRetries: 1,
      execute: async () => { throw new Error("permanent"); },
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe("permanent");
  }, 10000);
});

// ══════════════════════════════════════════════════
// OFFLINE PERSISTENCE
// ══════════════════════════════════════════════════

describe("Action Queue — Offline", () => {
  it("saves failed offline-capable task to localStorage", async () => {
    await enqueue("offline:test", {
      id: "off1", domain: "wallet", action: "transfer", priority: 10,
      maxRetries: 0,
      offlineCapable: true,
      offlinePayload: { amount: 100, currency: "AED" },
      execute: async () => { throw new Error("network_error"); },
    });

    const offline = getOfflineTasks();
    expect(offline.length).toBe(1);
    expect(offline[0].id).toBe("off1");
    expect(offline[0].payload.amount).toBe(100);
  });

  it("replays offline tasks with resolver", async () => {
    // Manually save an offline task
    localStorage.setItem("orbit_offline_queue", JSON.stringify([
      { id: "replay1", domain: "orbit", action: "message.send", priority: 6, payload: { text: "hello" }, savedAt: Date.now() },
    ]));

    let replayed = false;

    const result = await replayOffline((task) => {
      if (task.id === "replay1") {
        return async () => { replayed = true; };
      }
      return null;
    });

    expect(result.replayed).toBe(1);
    expect(replayed).toBe(true);
    expect(getOfflineTasks().length).toBe(0); // cleared after replay
  });

  it("clearOfflineTasks removes all", () => {
    localStorage.setItem("orbit_offline_queue", JSON.stringify([{ id: "x" }]));
    clearOfflineTasks();
    expect(getOfflineTasks().length).toBe(0);
  });
});

// ══════════════════════════════════════════════════
// QUEUE HEALTH MONITORING
// ══════════════════════════════════════════════════

describe("Action Queue — Health", () => {
  it("reports accurate health", async () => {
    const health = getQueueHealth();
    expect(health.totalPending).toBe(0);
    expect(health.totalProcessing).toBe(0);
  });
});

// ══════════════════════════════════════════════════
// GUARDED QUEUE — INTEGRATION
// ══════════════════════════════════════════════════

describe("Guarded Queue — Convenience Wrappers", () => {
  it("enqueueSendMessage works end-to-end", async () => {
    let sent = false;

    const result = await enqueueSendMessage(
      "conv123", "msg456",
      async () => { sent = true; return { id: "m1" }; },
    );

    expect(result.ok).toBe(true);
    expect(sent).toBe(true);
  });

  it("enqueueCapturePayment prevents double capture", async () => {
    let captures = 0;
    const payId = `pay_${Date.now()}`;

    const r1 = await enqueueCapturePayment(payId, async () => {
      captures++;
      return { captured: true };
    });

    // Same paymentId again — requestId dedup will catch it
    const r2 = await enqueueCapturePayment(payId, async () => {
      captures++;
      return { captured: true };
    });

    expect(captures).toBe(1);
    expect(r1.ok).toBe(true);
  });

  it("enqueueQrPayment blocks double scan", async () => {
    let debits = 0;
    const qrId = `qr_${Date.now()}`;

    await enqueueQrPayment(qrId, async () => { debits++; });
    await enqueueQrPayment(qrId, async () => { debits++; });

    expect(debits).toBe(1);
  });

  it("enqueueCreateOrder blocks double submit", async () => {
    let orders = 0;
    const draftId = `draft_${Date.now()}`;

    await enqueueCreateOrder(draftId, async () => { orders++; });
    await enqueueCreateOrder(draftId, async () => { orders++; });

    expect(orders).toBe(1);
  });

  it("enqueueAssignDriver blocks double assignment", async () => {
    let assigns = 0;
    const orderId = `ord_${Date.now()}`;

    await enqueueAssignDriver(orderId, async () => { assigns++; });
    await enqueueAssignDriver(orderId, async () => { assigns++; });

    expect(assigns).toBe(1);
  });
});

// ══════════════════════════════════════════════════
// SPAM CLICK SIMULATION
// ══════════════════════════════════════════════════

describe("Spam Click Simulation", () => {
  it("10 rapid payment clicks → 1 real capture", async () => {
    let captures = 0;
    const payId = `spam_${Date.now()}`;

    const promises = Array.from({ length: 10 }, () =>
      enqueueCapturePayment(payId, async () => {
        captures++;
        await sleep(10);
        return { ok: true };
      })
    );

    await Promise.all(promises);
    expect(captures).toBe(1);
  });

  it("10 rapid message sends → 1 real send", async () => {
    let sends = 0;
    const msgId = `spam_msg_${Date.now()}`;

    const promises = Array.from({ length: 10 }, () =>
      enqueueSendMessage("conv_spam", msgId, async () => {
        sends++;
        return { id: "m1" };
      })
    );

    await Promise.all(promises);
    expect(sends).toBe(1);
  });

  it("10 rapid order submits → 1 real order", async () => {
    let orders = 0;
    const draftId = `spam_draft_${Date.now()}`;

    const promises = Array.from({ length: 10 }, () =>
      enqueueCreateOrder(draftId, async () => {
        orders++;
        return { id: "o1" };
      })
    );

    await Promise.all(promises);
    expect(orders).toBe(1);
  });
});

// ══════════════════════════════════════════════════
// CROSS-DOMAIN SAFETY
// ══════════════════════════════════════════════════

describe("Cross-Domain Safety", () => {
  it("order + payment on different queues don't collide", async () => {
    const events: string[] = [];

    const orderP = enqueueCreateOrder(`xd_order_${Date.now()}`, async () => {
      events.push("order_created");
      await sleep(10);
    });

    const payP = enqueueCapturePayment(`xd_pay_${Date.now()}`, async () => {
      events.push("payment_captured");
    });

    await Promise.all([orderP, payP]);

    expect(events).toContain("order_created");
    expect(events).toContain("payment_captured");
    expect(events.length).toBe(2);
  });
});

// ── Helper ──

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
