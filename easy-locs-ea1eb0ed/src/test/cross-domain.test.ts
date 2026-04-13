import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { platformBus } from "@/lib/shared/platform-bus";
import { CANONICAL_EVENTS } from "@/domains/shared/canonical-events";
import { transitionPayment, transitionOrder, transitionDriver } from "@/domains/shared/state-machines";

const unsubs: (() => void)[] = [];

beforeEach(() => {
  platformBus.clear();
  platformBus.clearLogs();
});

afterEach(() => {
  unsubs.forEach((u) => u());
  unsubs.length = 0;
  platformBus.clear();
  platformBus.clearLogs();
});

describe("Cross-domain: Order → Payment flow", () => {
  it("order submission triggers payment via event, not direct import", () => {
    const handler = vi.fn();
    unsubs.push(platformBus.on(CANONICAL_EVENTS.WALLET_TRANSACTION_CREATED, handler));

    const orderStatus = transitionOrder("draft", "SUBMIT");
    expect(orderStatus).toBe("submitted");

    const paymentStatus = transitionPayment("created", "CONFIRM");
    expect(paymentStatus).toBe("pending_confirmation");

    platformBus.emit(
      CANONICAL_EVENTS.WALLET_TRANSACTION_CREATED,
      { transactionId: "tx-1", orderId: "order-1" },
      "wallet"
    );

    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe("Cross-domain: Order → Driver → Delivery", () => {
  it("order ready triggers driver assignment via state machine", () => {
    let orderStatus = transitionOrder("draft", "SUBMIT");
    orderStatus = transitionOrder(orderStatus!, "ACCEPT");
    orderStatus = transitionOrder(orderStatus!, "PREPARE");
    orderStatus = transitionOrder(orderStatus!, "READY");
    expect(orderStatus).toBe("ready");

    let driverStatus = transitionDriver("available", "ASSIGN");
    expect(driverStatus).toBe("assigned");

    orderStatus = transitionOrder(orderStatus!, "ASSIGN");
    expect(orderStatus).toBe("assigned");
  });

  it("driver follows delivery lifecycle independently", () => {
    let d = transitionDriver("assigned", "EN_ROUTE");
    expect(d).toBe("on_route_to_pickup");
    d = transitionDriver(d!, "ARRIVE_PICKUP");
    expect(d).toBe("waiting_pickup");
    d = transitionDriver(d!, "START_DELIVERY");
    expect(d).toBe("on_delivery");
    d = transitionDriver(d!, "COMPLETE");
    expect(d).toBe("completed");
  });
});

describe("Cross-domain: Payment refund flow", () => {
  it("captured payment can be refunded", () => {
    let p = transitionPayment("created", "CONFIRM");
    p = transitionPayment(p!, "AUTHORIZE");
    p = transitionPayment(p!, "CAPTURE");
    expect(p).toBe("captured");

    p = transitionPayment(p!, "REFUND");
    expect(p).toBe("refunded");

    p = transitionPayment(p!, "REFUND");
    expect(p).toBeNull();
  });
});

describe("Cross-domain: Event bus isolation", () => {
  it("wallet events don't leak to orbit listeners", () => {
    const orbitHandler = vi.fn();
    const walletHandler = vi.fn();

    unsubs.push(platformBus.on(CANONICAL_EVENTS.MESSAGE_SENT, orbitHandler));
    unsubs.push(platformBus.on(CANONICAL_EVENTS.WALLET_PAYMENT_SUCCESS, walletHandler));

    platformBus.emit(CANONICAL_EVENTS.WALLET_PAYMENT_SUCCESS, { txId: "tx-1" }, "wallet");

    expect(walletHandler).toHaveBeenCalledTimes(1);
    expect(orbitHandler).not.toHaveBeenCalled();
  });

  it("multiple domains can listen to the same event independently", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();

    unsubs.push(platformBus.on(CANONICAL_EVENTS.ORDER_CREATED, h1));
    unsubs.push(platformBus.on(CANONICAL_EVENTS.ORDER_CREATED, h2));

    platformBus.emit(CANONICAL_EVENTS.ORDER_CREATED, { orderId: "o-1" }, "marketplace");

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it("unsubscribed handlers don't fire", () => {
    const handler = vi.fn();
    const unsub = platformBus.on(CANONICAL_EVENTS.DELIVERY_COMPLETED, handler);
    unsub();

    platformBus.emit(CANONICAL_EVENTS.DELIVERY_COMPLETED, {}, "system");
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("Dashboard read-only guarantee", () => {
  it("dashboard selectors file has no supabase imports", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../domains/dashboard/selectors.ts"),
      "utf-8"
    );
    expect(content).not.toContain("supabase.from");
    expect(content).not.toContain(".insert(");
    expect(content).not.toContain(".update(");
    expect(content).not.toContain(".delete(");
  });

  it("dashboard index doesn't export write operations", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const content = fs.readFileSync(
      path.resolve(__dirname, "../domains/dashboard/index.ts"),
      "utf-8"
    );
    expect(content).not.toContain("create");
    expect(content).not.toContain("update");
    expect(content).not.toContain("delete");
    expect(content).not.toContain("insert");
  });
});
