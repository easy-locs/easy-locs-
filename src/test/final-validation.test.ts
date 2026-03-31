/**
 * FINAL VALIDATION TESTS — Session lifecycle, subscription cleanup,
 * offline replay, and full integration with guards + queue.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  registerSubscription,
  clearAllSubscriptions,
  listSubscriptions,
  getSubscriptionHealth,
} from "@/lib/realtime/subscription-registry";
import {
  enqueue,
  drainAllQueues,
  clearQueueLogs,
  getOfflineTasks,
  clearOfflineTasks,
  replayOffline,
  getQueueHealth,
} from "@/lib/queue/action-queue";
import {
  enqueueSendMessage,
  enqueueCapturePayment,
  enqueueQrPayment,
  enqueueCreateOrder,
  enqueueAssignDriver,
} from "@/lib/queue/guarded-queue";
import {
  createActionGuard,
  acquireSinglePath,
  clearStructuredLogs,
  getStructuredLogs,
} from "@/lib/guards/action-guard";
import { teardownSession } from "@/lib/lifecycle/session-lifecycle";

// ══════════════════════════════════════════════════
// 1. SESSION LIFECYCLE — LOGOUT TEARDOWN
// ══════════════════════════════════════════════════

describe("Session Lifecycle — Logout Teardown", () => {
  beforeEach(() => {
    clearAllSubscriptions();
    drainAllQueues();
    clearQueueLogs();
    clearStructuredLogs();
    clearOfflineTasks();
  });

  it("teardownSession clears subscriptions + queues + logs in one call", () => {
    // Setup: create subscriptions
    registerSubscription("orbit.msg:conv1", () => () => {});
    registerSubscription("wallet:user1", () => () => {});
    expect(listSubscriptions().length).toBe(2);

    // Setup: add offline tasks
    localStorage.setItem("orbit_offline_queue", JSON.stringify([
      { id: "t1", domain: "orbit", action: "send", priority: 6, payload: {}, savedAt: Date.now() },
    ]));

    // Execute teardown
    teardownSession();

    // Verify everything is clean
    expect(listSubscriptions().length).toBe(0);
    expect(getOfflineTasks().length).toBe(0);
    expect(getStructuredLogs().length).toBe(0);
  });

  it("teardownSession is safe to call multiple times", () => {
    registerSubscription("test:1", () => () => {});
    teardownSession();
    teardownSession(); // should not throw
    expect(listSubscriptions().length).toBe(0);
  });
});

// ══════════════════════════════════════════════════
// 2. NAVIGATION REMOUNT — NO SUBSCRIPTION ACCUMULATION
// ══════════════════════════════════════════════════

describe("Navigation Remount — No Accumulation", () => {
  beforeEach(() => clearAllSubscriptions());

  it("10 mount/unmount cycles → 1 active subscription", () => {
    let activeCount = 0;

    for (let i = 0; i < 10; i++) {
      // Mount
      const unsub = registerSubscription("orbit.messages:conv999", () => {
        activeCount++;
        return () => { activeCount--; };
      });

      // Only first mount should actually subscribe
      if (i > 0) {
        // For subsequent mounts, unsub returns the existing cleanup
      }
    }

    // Only 1 subscription should exist
    expect(listSubscriptions().length).toBe(1);
    expect(activeCount).toBe(1);

    // Cleanup
    clearAllSubscriptions();
    expect(listSubscriptions().length).toBe(0);
  });

  it("mount → unmount → mount → unmount cycle is clean", () => {
    let subs = 0;

    // Mount 1
    const unsub1 = registerSubscription("wallet:balance", () => {
      subs++;
      return () => { subs--; };
    });
    expect(subs).toBe(1);

    // Unmount 1
    unsub1();
    expect(subs).toBe(0);

    // Mount 2 (should create NEW sub since previous was cleaned)
    const unsub2 = registerSubscription("wallet:balance", () => {
      subs++;
      return () => { subs--; };
    });
    expect(subs).toBe(1);

    // Unmount 2
    unsub2();
    expect(subs).toBe(0);
    expect(listSubscriptions().length).toBe(0);
  });
});

// ══════════════════════════════════════════════════
// 3. DOUBLE CLICK — ALL CRITICAL FLOWS
// ══════════════════════════════════════════════════

describe("Double Click Protection — All Flows", () => {
  beforeEach(() => {
    drainAllQueues();
    clearQueueLogs();
    clearStructuredLogs();
  });

  it("5x pay click → 1 capture", async () => {
    let caps = 0;
    const id = `dc_pay_${Date.now()}`;
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        enqueueCapturePayment(id, async () => { caps++; })
      )
    );
    expect(caps).toBe(1);
  });

  it("5x message click → 1 send", async () => {
    let sends = 0;
    const id = `dc_msg_${Date.now()}`;
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        enqueueSendMessage("conv_dc", id, async () => { sends++; })
      )
    );
    expect(sends).toBe(1);
  });

  it("5x QR scan → 1 debit", async () => {
    let debits = 0;
    const id = `dc_qr_${Date.now()}`;
    await Promise.all(
      Array.from({ length: 5 }, () =>
        enqueueQrPayment(id, async () => { debits++; })
      )
    );
    expect(debits).toBe(1);
  });

  it("5x order submit → 1 order", async () => {
    let orders = 0;
    const id = `dc_order_${Date.now()}`;
    await Promise.all(
      Array.from({ length: 5 }, () =>
        enqueueCreateOrder(id, async () => { orders++; })
      )
    );
    expect(orders).toBe(1);
  });

  it("5x driver assign → 1 assignment", async () => {
    let assigns = 0;
    const id = `dc_driver_${Date.now()}`;
    await Promise.all(
      Array.from({ length: 5 }, () =>
        enqueueAssignDriver(id, async () => { assigns++; })
      )
    );
    expect(assigns).toBe(1);
  });
});

// ══════════════════════════════════════════════════
// 4. OFFLINE → RECONNECT — NO DUPLICATION
// ══════════════════════════════════════════════════

describe("Offline → Reconnect — No Duplication", () => {
  beforeEach(() => {
    drainAllQueues();
    clearOfflineTasks();
  });

  it("offline task saved and replayed once", async () => {
    // Simulate a failed offline-capable task
    await enqueue("offline:msg", {
      id: "offline_msg_1",
      domain: "orbit",
      action: "send",
      priority: 6,
      maxRetries: 0,
      offlineCapable: true,
      offlinePayload: { conversationId: "c1", body: "hello" },
      execute: async () => { throw new Error("network_offline"); },
    });

    // Should be saved offline
    const pending = getOfflineTasks();
    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe("offline_msg_1");

    // Replay
    let replayed = 0;
    const result = await replayOffline((task) => {
      if (task.id === "offline_msg_1") {
        return async () => { replayed++; };
      }
      return null;
    });

    expect(result.replayed).toBe(1);
    expect(replayed).toBe(1);
    expect(getOfflineTasks().length).toBe(0); // cleared
  });

  it("replay does not create duplicates on second call", async () => {
    localStorage.setItem("orbit_offline_queue", JSON.stringify([
      { id: "replay_once", domain: "wallet", action: "transfer", priority: 10, payload: { amount: 50 }, savedAt: Date.now() },
    ]));

    let execCount = 0;

    // Replay 1
    await replayOffline((task) => async () => { execCount++; });
    expect(execCount).toBe(1);

    // Replay 2 (queue should be empty)
    await replayOffline((task) => async () => { execCount++; });
    expect(execCount).toBe(1); // no additional execution
  });
});

// ══════════════════════════════════════════════════
// 5. SUBSCRIPTION HEALTH MONITORING
// ══════════════════════════════════════════════════

describe("Subscription Health", () => {
  beforeEach(() => clearAllSubscriptions());

  it("health reports by domain correctly", () => {
    registerSubscription("orbit.messages:c1", () => () => {});
    registerSubscription("orbit.messages:c2", () => () => {});
    registerSubscription("orbit.call:s1", () => () => {});
    registerSubscription("wallet.balance:u1", () => () => {});

    const health = getSubscriptionHealth();
    expect(health.total).toBe(4);
    expect(health.byPrefix["orbit"]).toBe(3);
    expect(health.byPrefix["wallet"]).toBe(1);
  });

  it("health is zero after clearAll", () => {
    registerSubscription("a", () => () => {});
    registerSubscription("b", () => () => {});
    clearAllSubscriptions();

    const health = getSubscriptionHealth();
    expect(health.total).toBe(0);
  });
});

// ══════════════════════════════════════════════════
// 6. QUEUE HEALTH MONITORING
// ══════════════════════════════════════════════════

describe("Queue Health", () => {
  beforeEach(() => drainAllQueues());

  it("reports 0 pending after drain", () => {
    const health = getQueueHealth();
    expect(health.totalPending).toBe(0);
    expect(health.totalProcessing).toBe(0);
  });
});

// ══════════════════════════════════════════════════
// 7. STRUCTURED LOGS INTEGRITY
// ══════════════════════════════════════════════════

describe("Structured Logs", () => {
  beforeEach(() => clearStructuredLogs());

  it("guard logs contain domain + action + correlationId + requestId", async () => {
    const guard = createActionGuard("test.flow");
    await guard.execute(async () => "ok", { requestId: "req_123" });

    const logs = getStructuredLogs();
    const started = logs.find(l => l.status === "started");
    const success = logs.find(l => l.status === "success");

    expect(started).toBeDefined();
    expect(started!.domain).toBe("test");
    expect(started!.action).toBe("flow");
    expect(started!.requestId).toBe("req_123");
    expect(started!.correlationId).toBeTruthy();

    expect(success).toBeDefined();
    expect(success!.duration).toBeGreaterThanOrEqual(0);
  });

  it("failed guard logs error", async () => {
    const guard = createActionGuard("test.fail");
    await guard.execute(async () => { throw new Error("boom"); });

    const logs = getStructuredLogs();
    const failed = logs.find(l => l.status === "failed");
    expect(failed).toBeDefined();
    expect(failed!.error).toBe("boom");
  });
});

// ══════════════════════════════════════════════════
// 8. SINGLE-PATH LOCK INTEGRITY
// ══════════════════════════════════════════════════

describe("Single-Path Lock", () => {
  it("concurrent acquires → only first succeeds", () => {
    const r1 = acquireSinglePath("lock:test:1");
    const r2 = acquireSinglePath("lock:test:1");

    expect(r1).not.toBeNull();
    expect(r2).toBeNull();

    r1!(); // release

    const r3 = acquireSinglePath("lock:test:1");
    expect(r3).not.toBeNull();
    r3!();
  });

  it("different keys don't interfere", () => {
    const r1 = acquireSinglePath("lock:a");
    const r2 = acquireSinglePath("lock:b");

    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();

    r1!();
    r2!();
  });
});

// ══════════════════════════════════════════════════
// 9. FULL INTEGRATION — GUARD + QUEUE + SUBSCRIPTION
// ══════════════════════════════════════════════════

describe("Full Integration", () => {
  beforeEach(() => {
    clearAllSubscriptions();
    drainAllQueues();
    clearStructuredLogs();
    clearOfflineTasks();
  });

  it("complete flow: subscribe → send → cleanup", async () => {
    // 1. Subscribe
    let subActive = false;
    registerSubscription("orbit.messages:integration", () => {
      subActive = true;
      return () => { subActive = false; };
    });
    expect(subActive).toBe(true);

    // 2. Send message (guarded + queued)
    let sent = false;
    const msgId = `integration_${Date.now()}`;
    await enqueueSendMessage("conv_int", msgId, async () => { sent = true; });
    expect(sent).toBe(true);

    // 3. Verify logs
    const logs = getStructuredLogs();
    expect(logs.some(l => l.domain === "orbit" && l.status === "success")).toBe(true);

    // 4. Teardown
    teardownSession();
    expect(subActive).toBe(false);
    expect(listSubscriptions().length).toBe(0);
    expect(getStructuredLogs().length).toBe(0);
  });
});
