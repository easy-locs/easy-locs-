import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInvoke = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockMaybeSingle = vi.fn();

const chainable = {
  select: (...a: unknown[]) => {
    mockSelect(...a);
    return {
      eq: (...b: unknown[]) => {
        mockEq(...b);
        return {
          limit: (...c: unknown[]) => {
            mockLimit(...c);
            return { maybeSingle: () => mockMaybeSingle() };
          },
          maybeSingle: () => mockMaybeSingle(),
          in: (...i: unknown[]) => {
            mockIn(...i);
            return {
              order: (...c: unknown[]) => {
                mockOrder(...c);
                return {
                  limit: (...d: unknown[]) => {
                    mockLimit(...d);
                    return { maybeSingle: () => mockMaybeSingle() };
                  },
                };
              },
            };
          },
        };
      },
      in: (...b: unknown[]) => {
        mockIn(...b);
        return {
          order: (...c: unknown[]) => {
            mockOrder(...c);
            return {
              limit: (...d: unknown[]) => {
                mockLimit(...d);
                return { maybeSingle: () => mockMaybeSingle() };
              },
            };
          },
        };
      },
    };
  },
};

vi.mock("@/services/db", () => ({
  db: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return chainable;
    },
    channel: vi.fn(),
    removeChannel: vi.fn(),
    getChannels: vi.fn(),
    removeAllChannels: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Mobile Money Payment Repository", () => {
  it("initiateMobileMoneyPayment invokes correct edge function and passes provider/phone", async () => {
    const { initiateMobileMoneyPayment } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({
      data: { tx_ref: "FLW-TX-123", status: "pending" },
      error: null,
    });

    const result = await initiateMobileMoneyPayment({
      provider: "mpesa",
      phone_number: "+254712345678",
      amount: 1000,
      currency: "KES",
      order_id: "order-1",
    });

    expect(mockInvoke).toHaveBeenCalledWith("mobile-money-payment", {
      body: {
        provider: "mpesa",
        phone_number: "+254712345678",
        amount: 1000,
        currency: "KES",
        order_id: "order-1",
      },
    });
    expect(result.tx_ref).toBe("FLW-TX-123");
    expect(result.status).toBe("pending");
  });

  it("checkMobileMoneyStatus sends action:status with tx_ref to the same edge function", async () => {
    const { checkMobileMoneyStatus } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({
      data: { status: "completed", message: "Transaction successful" },
      error: null,
    });

    const result = await checkMobileMoneyStatus("FLW-TX-123");

    expect(mockInvoke).toHaveBeenCalledWith("mobile-money-payment", {
      body: { action: "status", tx_ref: "FLW-TX-123" },
    });
    expect(result.status).toBe("completed");
  });

  it("throws on edge function error to prevent silent failures", async () => {
    const { initiateMobileMoneyPayment } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: "Provider unreachable" },
    });

    await expect(
      initiateMobileMoneyPayment({
        provider: "mpesa",
        phone_number: "+254712345678",
        amount: 1000,
        currency: "KES",
      })
    ).rejects.toThrow();
  });
});

describe("Crypto Payment Repository", () => {
  it("createCryptoCharge invokes crypto-payment edge function", async () => {
    const { createCryptoCharge } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({
      data: { charge_id: "CB-CHARGE-1", hosted_url: "https://commerce.coinbase.com/charges/CB-CHARGE-1" },
      error: null,
    });

    const result = await createCryptoCharge({
      amount: 50,
      currency: "USD",
      order_id: "order-2",
      description: "Test crypto payment",
    });

    expect(mockInvoke).toHaveBeenCalledWith("crypto-payment", {
      body: { amount: 50, currency: "USD", order_id: "order-2", description: "Test crypto payment" },
    });
    expect(result.charge_id).toBe("CB-CHARGE-1");
    expect(result.hosted_url).toContain("coinbase.com");
  });

  it("checkCryptoChargeStatus sends action:status with charge_id", async () => {
    const { checkCryptoChargeStatus } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({
      data: { status: "completed", charge_id: "CB-CHARGE-1" },
      error: null,
    });

    const result = await checkCryptoChargeStatus("CB-CHARGE-1");

    expect(mockInvoke).toHaveBeenCalledWith("crypto-payment", {
      body: { action: "status", charge_id: "CB-CHARGE-1" },
    });
    expect(result.status).toBe("completed");
    expect(result.charge_id).toBe("CB-CHARGE-1");
  });
});

describe("Subscription Repository", () => {
  it("createSubscription invokes create-subscription with price_id", async () => {
    const { createSubscription } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({
      data: { url: "https://checkout.stripe.com/session/cs_test_123" },
      error: null,
    });

    const result = await createSubscription({
      price_id: "price_team_monthly_real",
      plan_id: "team_monthly",
    });

    expect(mockInvoke).toHaveBeenCalledWith("create-subscription", {
      body: { price_id: "price_team_monthly_real", plan_id: "team_monthly" },
    });
    expect(result.url).toContain("stripe.com");
  });

  it("manageSubscription routes cancel action to manage-subscription", async () => {
    const { manageSubscription } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({
      data: { status: "cancelled", cancel_at: "2025-02-01" },
      error: null,
    });

    const result = await manageSubscription({ action: "cancel" });

    expect(mockInvoke).toHaveBeenCalledWith("manage-subscription", {
      body: { action: "cancel" },
    });
    expect(result.status).toBe("cancelled");
  });

  it("fetchCurrentSubscription queries subscriptions table with active statuses", async () => {
    const { fetchCurrentSubscription } = await import("@/repositories/payments.repository");
    mockMaybeSingle.mockResolvedValue({
      data: { id: "sub-1", status: "active", stripe_subscription_id: "sub_stripe_123" },
      error: null,
    });

    await fetchCurrentSubscription("user-123");

    expect(mockFrom).toHaveBeenCalledWith("subscriptions");
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
    expect(mockIn).toHaveBeenCalledWith("status", ["active", "past_due", "trialing"]);
  });
});

describe("Refund Repository", () => {
  it("requestRefund sends action:request with booking ownership context", async () => {
    const { requestRefund } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({
      data: { success: true, refund_id: "ref-123", amount: 50, currency: "EUR" },
      error: null,
    });

    const result = await requestRefund({
      booking_id: "booking-abc",
      booking_type: "marketplace",
      reason: "Product was damaged",
    });

    expect(mockInvoke).toHaveBeenCalledWith("refund-admin", {
      body: {
        action: "request",
        booking_id: "booking-abc",
        booking_type: "marketplace",
        reason: "Product was damaged",
      },
    });
    expect(result.success).toBe(true);
    expect(result.refund_id).toBe("ref-123");
  });

  it("fetchPendingRefunds sends action:list with status filter", async () => {
    const { fetchPendingRefunds } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({
      data: { refunds: [{ id: "ref-1", refund_status: "pending", amount: 25 }] },
      error: null,
    });

    const result = await fetchPendingRefunds({ status: "pending" });

    expect(mockInvoke).toHaveBeenCalledWith("refund-admin", {
      body: { action: "list", status: "pending" },
    });
    expect(result.refunds).toHaveLength(1);
    expect(result.refunds[0].refund_status).toBe("pending");
  });

  it("approveRefund sends action:approve with refund_id as body field", async () => {
    const { approveRefund } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({
      data: { success: true, refund_method: "stripe_refund", stripe_refund_id: "re_stripe_1" },
      error: null,
    });

    const result = await approveRefund({ refund_id: "ref-1" });

    expect(mockInvoke).toHaveBeenCalledWith("refund-admin", {
      body: { action: "approve", refund_id: "ref-1" },
    });
    expect(result.success).toBe(true);
    expect(result.refund_method).toBe("stripe_refund");
  });

  it("rejectRefund sends action:reject with reason", async () => {
    const { rejectRefund } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const result = await rejectRefund({ refund_id: "ref-1", reason: "Not eligible per policy" });

    expect(mockInvoke).toHaveBeenCalledWith("refund-admin", {
      body: { action: "reject", refund_id: "ref-1", reason: "Not eligible per policy" },
    });
    expect(result.success).toBe(true);
  });
});

describe("Payment method → repository function mapping", () => {
  it("each payment method invokes a distinct edge function", async () => {
    const {
      initiateMobileMoneyPayment,
      createCryptoCharge,
      createSubscription,
      requestRefund,
    } = await import("@/repositories/payments.repository");

    const calls = [
      { fn: () => { mockInvoke.mockResolvedValue({ data: {}, error: null }); return initiateMobileMoneyPayment({ provider: "mpesa", phone_number: "+254", amount: 1, currency: "KES" }); }, expected: "mobile-money-payment" },
      { fn: () => { mockInvoke.mockResolvedValue({ data: {}, error: null }); return createCryptoCharge({ amount: 1, currency: "USD" }); }, expected: "crypto-payment" },
      { fn: () => { mockInvoke.mockResolvedValue({ data: {}, error: null }); return createSubscription({ price_id: "p1" }); }, expected: "create-subscription" },
      { fn: () => { mockInvoke.mockResolvedValue({ data: {}, error: null }); return requestRefund({ booking_id: "b1" }); }, expected: "refund-admin" },
    ];

    for (const call of calls) {
      vi.clearAllMocks();
      await call.fn();
      expect(mockInvoke.mock.calls[0][0]).toBe(call.expected);
    }
  });

  it("all payment repository functions propagate errors instead of silently failing", async () => {
    const {
      initiateMobileMoneyPayment,
      createCryptoCharge,
      createSubscription,
    } = await import("@/repositories/payments.repository");

    mockInvoke.mockResolvedValue({ data: null, error: new Error("Network error") });

    await expect(initiateMobileMoneyPayment({ provider: "mpesa", phone_number: "+254", amount: 1, currency: "KES" })).rejects.toThrow();
    await expect(createCryptoCharge({ amount: 1, currency: "USD" })).rejects.toThrow();
    await expect(createSubscription({ price_id: "p1" })).rejects.toThrow();
  });
});

describe("Repository error propagation across all payment functions", () => {
  it("every payment function throws on edge function error — no silent fallbacks", async () => {
    const repo = await import("@/repositories/payments.repository");

    const fns: Array<{ name: string; call: () => Promise<unknown> }> = [
      { name: "initiateMobileMoneyPayment", call: () => repo.initiateMobileMoneyPayment({ provider: "mpesa", phone_number: "+254", amount: 1, currency: "KES" }) },
      { name: "checkMobileMoneyStatus", call: () => repo.checkMobileMoneyStatus("ref") },
      { name: "createCryptoCharge", call: () => repo.createCryptoCharge({ amount: 1, currency: "USD" }) },
      { name: "checkCryptoChargeStatus", call: () => repo.checkCryptoChargeStatus("id") },
      { name: "createSubscription", call: () => repo.createSubscription({ price_id: "p1" }) },
      { name: "manageSubscription", call: () => repo.manageSubscription({ action: "cancel" }) },
      { name: "requestRefund", call: () => repo.requestRefund({ booking_id: "b1" }) },
      { name: "approveRefund", call: () => repo.approveRefund({ refund_id: "r1" }) },
      { name: "rejectRefund", call: () => repo.rejectRefund({ refund_id: "r1" }) },
    ];

    for (const { name, call } of fns) {
      vi.clearAllMocks();
      mockInvoke.mockResolvedValue({ data: null, error: new Error(`${name} failed`) });
      await expect(call()).rejects.toThrow();
    }
  });
});

describe("Repository request body contracts", () => {
  it("approve/reject never sends booking_id/booking_type — server derives from refund_request", async () => {
    const { approveRefund, rejectRefund } = await import("@/repositories/payments.repository");

    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

    await approveRefund({ refund_id: "ref-1" });
    const approveBody = mockInvoke.mock.calls[0][1].body;
    expect(approveBody).not.toHaveProperty("booking_id");
    expect(approveBody).not.toHaveProperty("booking_type");
    expect(approveBody.action).toBe("approve");
    expect(approveBody.refund_id).toBe("ref-1");

    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });

    await rejectRefund({ refund_id: "ref-2", reason: "policy" });
    const rejectBody = mockInvoke.mock.calls[0][1].body;
    expect(rejectBody).not.toHaveProperty("booking_id");
    expect(rejectBody.action).toBe("reject");
    expect(rejectBody.refund_id).toBe("ref-2");
  });

  it("mobile money status check sends only action and tx_ref", async () => {
    const { checkMobileMoneyStatus } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({ data: { status: "pending" }, error: null });

    await checkMobileMoneyStatus("TX-REF-1");
    const body = mockInvoke.mock.calls[0][1].body;
    expect(Object.keys(body).sort()).toEqual(["action", "tx_ref"]);
    expect(body.action).toBe("status");
  });

  it("crypto status check sends only action and charge_id", async () => {
    const { checkCryptoChargeStatus } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({ data: { status: "pending" }, error: null });

    await checkCryptoChargeStatus("CB-123");
    const body = mockInvoke.mock.calls[0][1].body;
    expect(Object.keys(body).sort()).toEqual(["action", "charge_id"]);
    expect(body.action).toBe("status");
  });

  it("subscription portal invokes subscription-portal edge function", async () => {
    const { openSubscriptionPortal } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({ data: { url: "https://billing.stripe.com/session/abc" }, error: null });

    const result = await openSubscriptionPortal();
    expect(mockInvoke.mock.calls[0][0]).toBe("subscription-portal");
    expect(result.url).toContain("stripe.com");
  });

  it("mobile money payment passes order_id when provided", async () => {
    const { initiateMobileMoneyPayment } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({ data: { tx_ref: "ref", status: "pending" }, error: null });

    await initiateMobileMoneyPayment({
      provider: "wave", phone_number: "+221", amount: 5000, currency: "XOF", order_id: "ord-99",
    });

    expect(mockInvoke.mock.calls[0][1].body.order_id).toBe("ord-99");
  });

  it("crypto charge passes order_id and description", async () => {
    const { createCryptoCharge } = await import("@/repositories/payments.repository");
    mockInvoke.mockResolvedValue({ data: { charge_id: "c1", hosted_url: "https://x.com" }, error: null });

    await createCryptoCharge({
      amount: 100, currency: "EUR", order_id: "ord-50", description: "Test order",
    });

    const body = mockInvoke.mock.calls[0][1].body;
    expect(body.order_id).toBe("ord-50");
    expect(body.description).toBe("Test order");
  });
});

describe("Subscription data retrieval", () => {
  it("fetchCurrentSubscription filters for active/past_due/trialing statuses only", async () => {
    const { fetchCurrentSubscription } = await import("@/repositories/payments.repository");
    mockMaybeSingle.mockResolvedValue({
      data: { id: "sub-1", status: "active", plan: "team" },
      error: null,
    });

    await fetchCurrentSubscription("user-abc");

    expect(mockFrom).toHaveBeenCalledWith("subscriptions");
    expect(mockIn).toHaveBeenCalledWith("status", ["active", "past_due", "trialing"]);
    expect(mockEq).toHaveBeenCalledWith("user_id", "user-abc");
  });

  it("returns null when no active subscription exists", async () => {
    const { fetchCurrentSubscription } = await import("@/repositories/payments.repository");
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await fetchCurrentSubscription("user-no-sub");
    expect(result).toBeNull();
  });
});
