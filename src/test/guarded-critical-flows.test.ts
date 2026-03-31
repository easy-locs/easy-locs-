/**
 * TESTS: Guarded critical flows — idempotency, single-path, state machines, subscription registry.
 *
 * Covers:
 * - Double click / double submit
 * - Retry with same requestId (dedup)
 * - Retry with different requestId (distinct)
 * - Concurrent flow blocking
 * - Action after terminal state
 * - Subscription registry deduplication
 * - Structured logs emission
 */
import { describe, it, expect, beforeEach } from "vitest";
import { createActionGuard, acquireSinglePath, isFlowLocked, getStructuredLogs, clearStructuredLogs } from "@/lib/guards/action-guard";
import { registerSubscription, removeSubscription, hasSubscription, listSubscriptions, clearAllSubscriptions, getSubscriptionHealth } from "@/lib/realtime/subscription-registry";
import { transitionPayment, transitionOrder, transitionDriver } from "@/domains/shared/state-machines";

// ══════════════════════════════════════════════════
// ACTION GUARD — DOUBLE CLICK / RETRY / CONCURRENT
// ══════════════════════════════════════════════════

describe("Action Guard — Double Click Prevention", () => {
  beforeEach(() => clearStructuredLogs());

  it("same requestId within dedup window → deduplicated", async () => {
    const guard = createActionGuard("test.double_click");
    const reqId = `dc_${Date.now()}`;
    let calls = 0;

    const r1 = await guard.execute(async () => { calls++; return "done"; }, { requestId: reqId });
    const r2 = await guard.execute(async () => { calls++; return "done"; }, { requestId: reqId });

    expect(calls).toBe(1);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r2.deduplicated).toBe(true);
  });

  it("different requestIds → two distinct executions", async () => {
    const guard = createActionGuard("test.distinct");
    let calls = 0;

    await guard.execute(async () => { calls++; }, { requestId: "a_" + Date.now() });
    await guard.execute(async () => { calls++; }, { requestId: "b_" + Date.now() });

    expect(calls).toBe(2);
  });

  it("emits structured logs for start + success", async () => {
    const guard = createActionGuard("test.logs");
    await guard.execute(async () => "ok", { requestId: "log_test_" + Date.now() });

    const logs = getStructuredLogs();
    const relevant = logs.filter((l) => l.domain === "test" && l.action === "logs");
    expect(relevant.some((l) => l.status === "started")).toBe(true);
    expect(relevant.some((l) => l.status === "success")).toBe(true);
  });

  it("emits structured logs for failure", async () => {
    const guard = createActionGuard("test.fail_log");
    await guard.execute(async () => { throw new Error("boom"); }, { requestId: "fail_" + Date.now() });

    const logs = getStructuredLogs();
    const failed = logs.find((l) => l.action === "fail_log" && l.status === "failed");
    expect(failed).toBeTruthy();
    expect(failed?.error).toBe("boom");
  });
});

describe("Single-Path Enforcement", () => {
  it("acquireSinglePath blocks concurrent same flowKey", () => {
    const key = "test.single:" + Date.now();
    const release1 = acquireSinglePath(key);
    expect(release1).not.toBeNull();
    expect(isFlowLocked(key)).toBe(true);

    const release2 = acquireSinglePath(key);
    expect(release2).toBeNull(); // BLOCKED

    release1!();
    expect(isFlowLocked(key)).toBe(false);

    const release3 = acquireSinglePath(key);
    expect(release3).not.toBeNull();
    release3!();
  });

  it("different flowKeys do not interfere", () => {
    const r1 = acquireSinglePath("flow_a_" + Date.now());
    const r2 = acquireSinglePath("flow_b_" + Date.now());
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    r1!();
    r2!();
  });
});

// ══════════════════════════════════════════════════
// SEND MESSAGE — IDEMPOTENCY
// ══════════════════════════════════════════════════

describe("Send Message Guard", () => {
  it("2 sends same requestId → 1 real send", async () => {
    const guard = createActionGuard("orbit.message.send");
    const reqId = `msg_${Date.now()}`;
    let sends = 0;

    const r1 = await guard.execute(async () => { sends++; return { id: "m1" }; }, { requestId: reqId });
    const r2 = await guard.execute(async () => { sends++; return { id: "m2" }; }, { requestId: reqId });

    expect(sends).toBe(1);
    expect(r1.data).toEqual({ id: "m1" });
    expect(r2.data).toEqual({ id: "m1" }); // returns cached result
    expect(r2.deduplicated).toBe(true);
  });

  it("2 sends different requestIds → 2 real sends", async () => {
    const guard = createActionGuard("orbit.message.send");
    let sends = 0;

    await guard.execute(async () => sends++, { requestId: `msg_a_${Date.now()}` });
    await guard.execute(async () => sends++, { requestId: `msg_b_${Date.now()}` });

    expect(sends).toBe(2);
  });

  it("single-path prevents concurrent send on same conversation", async () => {
    const convId = "conv_test";
    const key = `orbit.message.send:${convId}`;

    const release = acquireSinglePath(key);
    expect(release).not.toBeNull();

    const blocked = acquireSinglePath(key);
    expect(blocked).toBeNull();

    release!();
  });
});

// ══════════════════════════════════════════════════
// CALL — IDEMPOTENCY + STATE MACHINE
// ══════════════════════════════════════════════════

describe("Call Guard + State Machine", () => {
  it("2 start calls same requestId → 1 real call", async () => {
    const guard = createActionGuard("orbit.call.start");
    const reqId = `call_${Date.now()}`;
    let starts = 0;

    await guard.execute(async () => { starts++; }, { requestId: reqId });
    await guard.execute(async () => { starts++; }, { requestId: reqId });

    expect(starts).toBe(1);
  });

  it("hangup multiple → idempotent single-path", () => {
    const key = `orbit.call.end:session123`;
    const r1 = acquireSinglePath(key);
    expect(r1).not.toBeNull();

    const r2 = acquireSinglePath(key);
    expect(r2).toBeNull(); // second hangup blocked

    r1!();
  });
});

// ══════════════════════════════════════════════════
// PAYMENT — DOUBLE CAPTURE / REFUND PREVENTION
// ══════════════════════════════════════════════════

describe("Payment Guard + State Machine", () => {
  it("capture 2x same requestId → 1 real capture", async () => {
    const guard = createActionGuard("wallet.payment.capture");
    const reqId = `cap_${Date.now()}`;
    let captures = 0;

    await guard.execute(async () => { captures++; }, { requestId: reqId });
    await guard.execute(async () => { captures++; }, { requestId: reqId });

    expect(captures).toBe(1);
  });

  it("capture after refunded → blocked by state machine", () => {
    expect(transitionPayment("refunded", "CAPTURE")).toBeNull();
  });

  it("capture after failed → blocked by state machine", () => {
    expect(transitionPayment("failed", "CAPTURE")).toBeNull();
  });

  it("refund after cancelled → blocked by state machine", () => {
    expect(transitionPayment("cancelled", "REFUND")).toBeNull();
  });

  it("full payment lifecycle", () => {
    let s = transitionPayment("created", "CONFIRM");
    expect(s).toBe("pending_confirmation");
    s = transitionPayment(s!, "AUTHORIZE");
    expect(s).toBe("authorized");
    s = transitionPayment(s!, "CAPTURE");
    expect(s).toBe("captured");
    s = transitionPayment(s!, "REFUND");
    expect(s).toBe("refunded");
    // Terminal — no more transitions
    expect(transitionPayment(s!, "CAPTURE" as any)).toBeNull();
  });
});

// ══════════════════════════════════════════════════
// ORDER — DOUBLE SUBMIT / BACKWARD PREVENTION
// ══════════════════════════════════════════════════

describe("Order Guard + State Machine", () => {
  it("submit 2x same draftId → 1 real order", async () => {
    const guard = createActionGuard("order.create");
    const reqId = `ord_${Date.now()}`;
    let creates = 0;

    await guard.execute(async () => { creates++; }, { requestId: reqId });
    await guard.execute(async () => { creates++; }, { requestId: reqId });

    expect(creates).toBe(1);
  });

  it("cancel after delivered → blocked", () => {
    expect(transitionOrder("delivered", "CANCEL")).toBeNull();
  });

  it("deliver before pickup → blocked", () => {
    expect(transitionOrder("assigned", "DELIVER")).toBeNull();
  });

  it("full order lifecycle", () => {
    let s = transitionOrder("draft", "SUBMIT")!;
    expect(s).toBe("submitted");
    s = transitionOrder(s, "ACCEPT")!;
    s = transitionOrder(s, "PREPARE")!;
    s = transitionOrder(s, "READY")!;
    s = transitionOrder(s, "ASSIGN")!;
    s = transitionOrder(s, "PICKUP")!;
    s = transitionOrder(s, "DELIVER")!;
    expect(s).toBe("delivered");
    // Terminal
    expect(transitionOrder(s, "CANCEL")).toBeNull();
  });
});

// ══════════════════════════════════════════════════
// DRIVER — DOUBLE ASSIGN / OFFLINE PREVENTION
// ══════════════════════════════════════════════════

describe("Driver Guard + State Machine", () => {
  it("assign 2x same orderId → single-path blocks second", () => {
    const key = `driver.assign:order_abc`;
    const r1 = acquireSinglePath(key);
    const r2 = acquireSinglePath(key);
    expect(r1).not.toBeNull();
    expect(r2).toBeNull();
    r1!();
  });

  it("assign offline driver → blocked by state machine", () => {
    expect(transitionDriver("offline", "ASSIGN")).toBeNull();
  });

  it("complete before on_delivery → blocked", () => {
    expect(transitionDriver("assigned", "COMPLETE")).toBeNull();
  });

  it("full driver lifecycle", () => {
    let s = transitionDriver("available", "ASSIGN")!;
    expect(s).toBe("assigned");
    s = transitionDriver(s, "EN_ROUTE")!;
    s = transitionDriver(s, "ARRIVE_PICKUP")!;
    s = transitionDriver(s, "START_DELIVERY")!;
    s = transitionDriver(s, "COMPLETE")!;
    expect(s).toBe("completed");
  });
});

// ══════════════════════════════════════════════════
// QR PAYMENT — DOUBLE SCAN PREVENTION
// ══════════════════════════════════════════════════

describe("QR Payment Guard", () => {
  it("same qrSessionId scanned twice → deduped", async () => {
    const guard = createActionGuard("wallet.qr.pay");
    const reqId = `qr_${Date.now()}`;
    let debits = 0;

    await guard.execute(async () => { debits++; }, { requestId: reqId });
    await guard.execute(async () => { debits++; }, { requestId: reqId });

    expect(debits).toBe(1);
  });

  it("single-path blocks concurrent QR processing", () => {
    const key = `wallet.qr:session_xyz`;
    const r1 = acquireSinglePath(key);
    const r2 = acquireSinglePath(key);
    expect(r1).not.toBeNull();
    expect(r2).toBeNull();
    r1!();
  });
});

// ══════════════════════════════════════════════════
// SUBSCRIPTION REGISTRY — ANTI-DUPLICATION
// ══════════════════════════════════════════════════

describe("Subscription Registry", () => {
  beforeEach(() => clearAllSubscriptions());

  it("registerSubscription blocks duplicates", () => {
    let subCount = 0;
    const key = "orbit.messages:conv123";

    const unsub1 = registerSubscription(key, () => { subCount++; return () => {}; });
    const unsub2 = registerSubscription(key, () => { subCount++; return () => {}; });

    expect(subCount).toBe(1); // only called once
    expect(hasSubscription(key)).toBe(true);

    unsub1();
    expect(hasSubscription(key)).toBe(false);
  });

  it("different keys create distinct subscriptions", () => {
    let count = 0;
    registerSubscription("a", () => { count++; return () => {}; });
    registerSubscription("b", () => { count++; return () => {}; });

    expect(count).toBe(2);
    expect(listSubscriptions()).toEqual(expect.arrayContaining(["a", "b"]));
  });

  it("removeSubscription cleans up", () => {
    let cleaned = false;
    registerSubscription("test_remove", () => () => { cleaned = true; });

    removeSubscription("test_remove");
    expect(cleaned).toBe(true);
    expect(hasSubscription("test_remove")).toBe(false);
  });

  it("clearAllSubscriptions kills everything", () => {
    registerSubscription("x", () => () => {});
    registerSubscription("y", () => () => {});
    registerSubscription("z", () => () => {});

    expect(listSubscriptions().length).toBe(3);

    clearAllSubscriptions();
    expect(listSubscriptions().length).toBe(0);
  });

  it("getSubscriptionHealth reports correctly", () => {
    registerSubscription("orbit.msg:1", () => () => {});
    registerSubscription("orbit.msg:2", () => () => {});
    registerSubscription("wallet:user1", () => () => {});

    const health = getSubscriptionHealth();
    expect(health.count).toBe(3);
    expect(health.byDomain["orbit"]).toBe(2);
    expect(health.byDomain["wallet"]).toBe(1);
    expect(health.oldestAge).toBeGreaterThanOrEqual(0);
  });

  it("simulates mount/unmount/re-mount without accumulation", () => {
    let subs = 0;

    // Mount
    const unsub1 = registerSubscription("conv:123", () => { subs++; return () => { subs--; }; });
    expect(subs).toBe(1);

    // Unmount
    unsub1();
    expect(subs).toBe(0);

    // Re-mount
    const unsub2 = registerSubscription("conv:123", () => { subs++; return () => { subs--; }; });
    expect(subs).toBe(1);

    // Re-mount again (should NOT create new sub)
    const unsub3 = registerSubscription("conv:123", () => { subs++; return () => { subs--; }; });
    expect(subs).toBe(1); // still 1

    unsub2();
  });

  it("10 rapid re-registers → 1 active subscription", () => {
    let created = 0;
    const key = "stress:rapid";

    for (let i = 0; i < 10; i++) {
      registerSubscription(key, () => { created++; return () => {}; });
    }

    expect(created).toBe(1);
    expect(listSubscriptions().filter((k) => k === key).length).toBe(1);
  });
});

// ══════════════════════════════════════════════════
// COMBINED: Guard + Subscription (E2E pattern)
// ══════════════════════════════════════════════════

describe("Combined Guard + Subscription Flow", () => {
  beforeEach(() => {
    clearStructuredLogs();
    clearAllSubscriptions();
  });

  it("guarded send + subscription dedup = zero duplication", async () => {
    const guard = createActionGuard("orbit.message.send");
    const reqId = `e2e_${Date.now()}`;
    let sends = 0;
    let subs = 0;

    // Simulate subscription
    registerSubscription("orbit.messages:conv_e2e", () => { subs++; return () => {}; });
    registerSubscription("orbit.messages:conv_e2e", () => { subs++; return () => {}; }); // dupe blocked

    // Simulate guarded send
    await guard.execute(async () => sends++, { requestId: reqId });
    await guard.execute(async () => sends++, { requestId: reqId }); // dedup

    expect(sends).toBe(1);
    expect(subs).toBe(1);

    const logs = getStructuredLogs();
    expect(logs.some((l) => l.status === "deduplicated")).toBe(true);
  });
});
