import { describe, it, expect } from "vitest";
import {
  reconcile,
  runningBalance,
  type LedgerEntryLite,
  type GatewayTxnLite,
} from "@/domains/wallet/reconciliation";
import {
  computeSplit,
  buildIdempotencyKey,
  classifyStripeError,
  nextRetry,
  shouldProcessWebhook,
} from "@/domains/wallet/stripe-connect";

const date = "2026-04-16";

function ledger(ref: string, amount: number, type: "credit" | "debit" = "credit", currency = "AED"): LedgerEntryLite {
  return {
    id: `l_${ref}`,
    reference: ref,
    type,
    amount,
    currency,
    occurredAt: `${date}T10:00:00Z`,
    status: "posted",
  };
}

function gateway(
  ref: string,
  amount: number,
  direction: "credit" | "debit" = "credit",
  currency = "AED",
  status: GatewayTxnLite["status"] = "succeeded",
): GatewayTxnLite {
  return {
    id: `g_${ref}`,
    reference: ref,
    amount,
    currency,
    direction,
    occurredAt: `${date}T10:00:00Z`,
    status,
  };
}

describe("wallet/reconciliation", () => {
  it("healthy when every ref matches", () => {
    const r = reconcile(
      date,
      [ledger("a", 10), ledger("b", 20)],
      [gateway("a", 10), gateway("b", 20)],
    );
    expect(r.healthy).toBe(true);
    expect(r.matched).toBe(2);
    expect(r.discrepancies).toHaveLength(0);
  });

  it("detects missing_in_ledger", () => {
    const r = reconcile(date, [ledger("a", 10)], [gateway("a", 10), gateway("b", 20)]);
    expect(r.healthy).toBe(false);
    expect(r.discrepancies.some((d) => d.kind === "missing_in_ledger" && d.reference === "b")).toBe(true);
  });

  it("detects amount_mismatch", () => {
    const r = reconcile(date, [ledger("a", 10)], [gateway("a", 12)]);
    expect(r.discrepancies[0].kind).toBe("amount_mismatch");
  });

  it("detects currency_mismatch", () => {
    const r = reconcile(date, [ledger("a", 10, "credit", "AED")], [gateway("a", 10, "credit", "USD")]);
    expect(r.discrepancies[0].kind).toBe("currency_mismatch");
  });

  it("ignores reversed ledger entries", () => {
    const reversed: LedgerEntryLite = { ...ledger("a", 10), status: "reversed" };
    const r = reconcile(date, [reversed], []);
    expect(r.ledgerCount).toBe(0);
  });

  it("ignores failed gateway entries", () => {
    const r = reconcile(date, [], [gateway("a", 10, "credit", "AED", "failed")]);
    expect(r.gatewayCount).toBe(0);
  });

  it("runningBalance applies sign correctly", () => {
    expect(
      runningBalance([ledger("a", 100, "credit"), ledger("b", 30, "debit")]),
    ).toBe(70);
  });

  it("runningBalance skips reversed entries", () => {
    const reversed: LedgerEntryLite = { ...ledger("a", 50, "credit"), status: "reversed" };
    expect(runningBalance([reversed, ledger("b", 20, "credit")])).toBe(20);
  });

  it("detects direction_mismatch (debit/credit inversion)", () => {
    const r = reconcile(
      date,
      [ledger("a", 10, "credit")],
      [gateway("a", 10, "debit")],
    );
    expect(r.healthy).toBe(false);
    expect(r.discrepancies[0].kind).toBe("direction_mismatch");
    expect(r.matched).toBe(0);
  });
});

describe("wallet/stripe-connect", () => {
  it("computeSplit respects platform fee", () => {
    const s = computeSplit({ grossAmount: 100, currency: "USD", platformFeePct: 0.15 });
    expect(s.platformFee).toBe(15);
    expect(s.driverAmount).toBe(85);
  });

  it("computeSplit adds tip to driver amount", () => {
    const s = computeSplit({ grossAmount: 50, currency: "USD", platformFeePct: 0.2, tip: 5 });
    expect(s.driverAmount).toBe(45);
  });

  it("computeSplit rejects invalid platformFeePct", () => {
    expect(() => computeSplit({ grossAmount: 10, currency: "USD", platformFeePct: 0.9 })).toThrow();
  });

  it("computeSplit rejects negative driver payout", () => {
    expect(() =>
      computeSplit({ grossAmount: 10, currency: "USD", platformFeePct: 0.2, processingFee: 15 }),
    ).toThrow(/negative/);
  });

  it("computeSplit rejects negative fees/tips", () => {
    expect(() =>
      computeSplit({ grossAmount: 10, currency: "USD", platformFeePct: 0.2, tip: -1 }),
    ).toThrow();
    expect(() =>
      computeSplit({ grossAmount: 10, currency: "USD", platformFeePct: 0.2, processingFee: -1 }),
    ).toThrow();
  });

  it("idempotencyKey is deterministic", () => {
    const k1 = buildIdempotencyKey({ jobId: "j1", driverId: "d1", grossAmount: 42.5, currency: "AED", purpose: "transfer" });
    const k2 = buildIdempotencyKey({ jobId: "j1", driverId: "d1", grossAmount: 42.5, currency: "AED", purpose: "transfer" });
    expect(k1).toBe(k2);
    expect(k1).toContain("4250aed");
  });

  it("classifyStripeError flags 5xx as retryable", () => {
    expect(classifyStripeError({ status: 503 })).toBe("retryable");
    expect(classifyStripeError({ status: 429 })).toBe("retryable");
    expect(classifyStripeError({ status: 400 })).toBe("permanent");
  });

  it("classifyStripeError flags connection errors", () => {
    expect(classifyStripeError({ type: "api_connection_error" })).toBe("retryable");
  });

  it("nextRetry backs off exponentially within cap", () => {
    const d0 = nextRetry(0, { status: 503 }, { baseMs: 100, capMs: 1000 });
    const d1 = nextRetry(1, { status: 503 }, { baseMs: 100, capMs: 1000 });
    expect(d0.shouldRetry).toBe(true);
    expect(d1.shouldRetry).toBe(true);
    expect(d1.delayMs).toBeGreaterThanOrEqual(d0.delayMs);
    expect(d1.delayMs).toBeLessThanOrEqual(1300);
  });

  it("nextRetry stops on permanent errors", () => {
    const d = nextRetry(0, { status: 400 });
    expect(d.shouldRetry).toBe(false);
  });

  it("nextRetry stops at maxAttempts", () => {
    const d = nextRetry(5, { status: 503 }, { maxAttempts: 5 });
    expect(d.shouldRetry).toBe(false);
  });

  it("shouldProcessWebhook dedupes", () => {
    const seen = new Set(["evt_1"]);
    expect(shouldProcessWebhook({ eventId: "evt_1", seenEventIds: seen }).process).toBe(false);
    expect(shouldProcessWebhook({ eventId: "evt_2", seenEventIds: seen }).process).toBe(true);
  });

  it("shouldProcessWebhook enforces attempt cap", () => {
    const r = shouldProcessWebhook({
      eventId: "evt_x",
      seenEventIds: new Set(),
      deliveryAttempt: 50,
      maxDeliveryAttempts: 25,
    });
    expect(r.process).toBe(false);
    expect(r.reason).toBe("attempt_cap_exceeded");
  });
});
