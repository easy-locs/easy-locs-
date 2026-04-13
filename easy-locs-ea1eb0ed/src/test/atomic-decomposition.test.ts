/**
 * TESTS: Atomic decomposition — atoms, microns, molecules across all domains.
 */
import { describe, it, expect } from "vitest";

// ── Shared Atoms ──
import { createCorrelationId, createRequestId } from "@/domains/shared/atoms/create-correlation-id.atom";
import { isPaymentTerminal, isOrderTerminal, isDriverTerminal } from "@/domains/shared/atoms/status-checks.atom";
import { formatMoney, formatCompactMoney } from "@/domains/shared/atoms/format-money.atom";
import { buildEntityKey, parseEntityKey } from "@/domains/shared/atoms/build-entity-key.atom";

// ── Wallet ──
import { isValidAmount, isValidCurrency, buildWalletReference } from "@/domains/wallet/atoms/is-final-payment-status.atom";
import { validatePaymentInput } from "@/domains/wallet/microns/validate-payment-input.micron";
import { computeWalletDelta } from "@/domains/wallet/microns/compute-wallet-delta.micron";
import { createPaymentIntentDraft } from "@/domains/wallet/molecules/create-payment-intent.molecule";
import { selectFormattedBalance, selectTotalBalance } from "@/domains/wallet/wallet.selectors";

// ── Orbit ──
import { buildConversationKey, isValidMessageBody, truncatePreview } from "@/domains/orbit/atoms/build-conversation-key.atom";
import { validateMessageBody } from "@/domains/orbit/microns/validate-message-body.micron";
import { buildMessagePayload } from "@/domains/orbit/microns/build-message-payload.micron";
import { createMessageDraft } from "@/domains/orbit/molecules/create-message-draft.molecule";

// ── Radar ──
import { clampZoom, isValidCoordinate, distanceMeters } from "@/domains/radar/atoms/clamp-zoom.atom";
import { normalizePosition } from "@/domains/radar/microns/normalize-position.micron";
import { resolveRadarFocus } from "@/domains/radar/molecules/resolve-radar-focus.molecule";

// ── Me ──
import { isValidLanguage, normalizeEmail, isValidPhone } from "@/domains/me/atoms/is-valid-language.atom";
import { validatePreferences } from "@/domains/me/microns/validate-preferences.micron";
import { buildPreferencesUpdate } from "@/domains/me/molecules/build-preferences-update.molecule";

// ── Dashboard ──
import { formatKpiValue, formatActivityTimestamp } from "@/domains/dashboard/atoms/dashboard-format.atom";

// ── Guards ──
import { guardedSendMessage, guardedCreatePayment, guardedCreateOrder, guardedAssignDriver } from "@/lib/guards/guarded-actions";

describe("Shared Atoms", () => {
  it("createCorrelationId returns unique UUIDs", () => {
    const a = createCorrelationId();
    const b = createCorrelationId();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("createRequestId returns prefixed IDs", () => {
    expect(createRequestId()).toMatch(/^req_/);
  });

  it("isPaymentTerminal correctly classifies", () => {
    expect(isPaymentTerminal("captured")).toBe(true);
    expect(isPaymentTerminal("failed")).toBe(true);
    expect(isPaymentTerminal("created")).toBe(false);
    expect(isPaymentTerminal("authorized")).toBe(false);
  });

  it("isOrderTerminal correctly classifies", () => {
    expect(isOrderTerminal("delivered")).toBe(true);
    expect(isOrderTerminal("preparing")).toBe(false);
  });

  it("isDriverTerminal correctly classifies", () => {
    expect(isDriverTerminal("completed")).toBe(true);
    expect(isDriverTerminal("assigned")).toBe(false);
  });

  it("formatMoney formats correctly", () => {
    expect(formatMoney(1234.5, "USD")).toContain("1,234.50");
    expect(formatMoney(0, "AED")).toContain("0.00");
  });

  it("buildEntityKey / parseEntityKey round-trip", () => {
    const key = buildEntityKey("order", "abc123");
    expect(key).toBe("order:abc123");
    const parsed = parseEntityKey(key);
    expect(parsed).toEqual({ type: "order", id: "abc123" });
  });

  it("parseEntityKey returns null for invalid", () => {
    expect(parseEntityKey("nocolon")).toBe(null);
  });
});

describe("Wallet Atoms", () => {
  it("isValidAmount rejects bad values", () => {
    expect(isValidAmount(0)).toBe(false);
    expect(isValidAmount(-5)).toBe(false);
    expect(isValidAmount(NaN)).toBe(false);
    expect(isValidAmount(100)).toBe(true);
  });

  it("isValidCurrency validates", () => {
    expect(isValidCurrency("AED")).toBe(true);
    expect(isValidCurrency("XYZ")).toBe(false);
  });
});

describe("Wallet Microns", () => {
  it("validatePaymentInput catches missing userId", () => {
    const result = validatePaymentInput({ userId: "", amount: 10, currency: "AED" });
    expect(result.ok).toBe(false);
  });

  it("validatePaymentInput accepts valid input", () => {
    const result = validatePaymentInput({ userId: "u1", amount: 50, currency: "EUR" });
    expect(result.ok).toBe(true);
  });

  it("computeWalletDelta credit/debit logic", () => {
    const topup = computeWalletDelta("topup", 100);
    expect(topup.direction).toBe("credit");
    expect(topup.availableDelta).toBe(100);

    const payment = computeWalletDelta("payment", 50);
    expect(payment.direction).toBe("debit");
    expect(payment.availableDelta).toBe(-50);

    const escrowLock = computeWalletDelta("escrow_lock", 30);
    expect(escrowLock.escrowDelta).toBe(30);
    expect(escrowLock.availableDelta).toBe(-30);
  });
});

describe("Wallet Molecules", () => {
  it("createPaymentIntentDraft produces valid draft", () => {
    const draft = createPaymentIntentDraft({ userId: "u1", amount: 100, currency: "AED" });
    expect(draft.status).toBe("created");
    expect(draft.correlationId).toBeTruthy();
    expect(draft.amount).toBe(100);
  });

  it("createPaymentIntentDraft throws on invalid input", () => {
    expect(() => createPaymentIntentDraft({ userId: "", amount: 0, currency: "XYZ" })).toThrow();
  });
});

describe("Wallet Selectors", () => {
  it("selectFormattedBalance formats", () => {
    expect(selectFormattedBalance({ walletId: "w1", ownerUserId: "u1", currency: "USD", availableBalance: 250.5, escrowBalance: 0, pendingBalance: 0, status: "active", lastUpdatedAt: null })).toContain("250.50");
  });

  it("selectFormattedBalance handles null", () => {
    expect(selectFormattedBalance(null)).toBe("—");
  });

  it("selectTotalBalance sums all", () => {
    expect(selectTotalBalance({ walletId: "w1", ownerUserId: "u1", currency: "AED", availableBalance: 100, escrowBalance: 20, pendingBalance: 5, status: "active", lastUpdatedAt: null })).toBe(125);
  });
});

describe("Orbit Atoms", () => {
  it("buildConversationKey", () => {
    expect(buildConversationKey("direct", "abc")).toBe("direct:abc");
  });

  it("isValidMessageBody", () => {
    expect(isValidMessageBody("")).toBe(false);
    expect(isValidMessageBody("   ")).toBe(false);
    expect(isValidMessageBody("hello")).toBe(true);
  });

  it("truncatePreview truncates long messages", () => {
    const long = "a".repeat(100);
    const result = truncatePreview(long, 50);
    expect(result.length).toBe(100);
  });
});

describe("Orbit Microns", () => {
  it("validateMessageBody rejects empty", () => {
    const r = validateMessageBody("");
    expect(r.ok).toBe(false);
  });

  it("validateMessageBody sanitizes", () => {
    const r = validateMessageBody("  hello  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.sanitized).toBe("hello");
  });

  it("buildMessagePayload adds correlationId", () => {
    const p = buildMessagePayload({ conversationId: "c1", senderId: "s1", body: "hi" });
    expect(p.correlationId).toBeTruthy();
    expect(p.body).toBe("hi");
  });
});

describe("Orbit Molecules", () => {
  it("createMessageDraft validates and builds", () => {
    const draft = createMessageDraft({ conversationId: "c1", senderId: "s1", body: "  hello  " });
    expect(draft.body).toBe("hello");
    expect(draft.correlationId).toBeTruthy();
  });

  it("createMessageDraft throws on empty body", () => {
    expect(() => createMessageDraft({ conversationId: "c1", senderId: "s1", body: "" })).toThrow();
  });
});

describe("Radar Atoms", () => {
  it("clampZoom clamps", () => {
    expect(clampZoom(0)).toBe(1);
    expect(clampZoom(25)).toBe(22);
    expect(clampZoom(14)).toBe(14);
  });

  it("isValidCoordinate", () => {
    expect(isValidCoordinate(25.2, 55.3)).toBe(true);
    expect(isValidCoordinate(91, 0)).toBe(false);
  });

  it("distanceMeters calculates", () => {
    const d = distanceMeters(25.2, 55.3, 25.3, 55.4);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(20_000);
  });
});

describe("Radar Microns", () => {
  it("normalizePosition normalizes", () => {
    const p = normalizePosition(25.123456789, 55.987654321);
    expect(p.lat).toBe(25.123457);
    expect(p.lng).toBe(55.987654);
    expect(p.updatedAt).toBeTruthy();
  });

  it("normalizePosition throws on invalid", () => {
    expect(() => normalizePosition(999, 0)).toThrow();
  });
});

describe("Radar Molecules", () => {
  it("resolveRadarFocus builds focus", () => {
    const f = resolveRadarFocus(25.2, 55.3, "Dubai Marina", 16);
    expect(f.center.lat).toBe(25.2);
    expect(f.zoom).toBe(16);
    expect(f.label).toBe("Dubai Marina");
  });
});

describe("Me Atoms", () => {
  it("isValidLanguage validates", () => {
    expect(isValidLanguage("fr")).toBe(true);
    expect(isValidLanguage("en")).toBe(true);
    expect(isValidLanguage("zz")).toBe(false);
  });

  it("normalizeEmail", () => {
    expect(normalizeEmail("  User@Gmail.COM ")).toBe("user@gmail.com");
  });

  it("isValidPhone", () => {
    expect(isValidPhone("+971501234567")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
  });
});

describe("Me Microns", () => {
  it("validatePreferences catches bad language", () => {
    expect(validatePreferences({ language: "xx" }).ok).toBe(false);
  });

  it("validatePreferences accepts valid", () => {
    expect(validatePreferences({ language: "fr" }).ok).toBe(true);
  });
});

describe("Me Molecules", () => {
  it("buildPreferencesUpdate builds update", () => {
    const u = buildPreferencesUpdate({ language: "en", timezone: "UTC" });
    expect(u.language).toBe("en");
    expect(u.updatedAt).toBeTruthy();
  });

  it("buildPreferencesUpdate throws on invalid", () => {
    expect(() => buildPreferencesUpdate({ language: "zz", timezone: "UTC" })).toThrow();
  });
});

describe("Dashboard Atoms", () => {
  it("formatKpiValue formats", () => {
    expect(formatKpiValue(1_500_000)).toBe("1.5M");
    expect(formatKpiValue(42_000)).toBe("42.0K");
    expect(formatKpiValue(99)).toBe("99");
  });

  it("formatActivityTimestamp handles recent", () => {
    const now = new Date().toISOString();
    expect(formatActivityTimestamp(now)).toBe("just now");
  });
});

describe("Guarded Actions — Anti-double", () => {
  it("guardedSendMessage blocks duplicate requestId", async () => {
    const requestId = "test-msg-" + Date.now();
    let callCount = 0;
    const fn = async () => { callCount++; return "sent"; };

    const r1 = await guardedSendMessage(requestId, fn);
    expect(r1.ok).toBe(true);
    expect(callCount).toBe(1);

    // Same requestId within dedup window
    const r2 = await guardedSendMessage(requestId, fn);
    expect(r2.ok).toBe(true);
    expect(r2.deduplicated).toBe(true);
    expect(callCount).toBe(1); // NOT called again
  });

  it("guardedCreatePayment blocks concurrent", async () => {
    const requestId = "test-pay-" + Date.now();
    let callCount = 0;

    const slowFn = async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 50));
      return "paid";
    };

    const [r1, r2] = await Promise.all([
      guardedCreatePayment(requestId + "a", slowFn),
      guardedCreatePayment(requestId + "b", slowFn),
    ]);

    // Both should succeed since different requestIds
    expect(callCount).toBe(2);
  });

  it("guardedCreateOrder prevents double creation", async () => {
    const requestId = "test-order-" + Date.now();
    const fn = async () => "created";

    const r1 = await guardedCreateOrder(requestId, fn);
    const r2 = await guardedCreateOrder(requestId, fn);

    expect(r1.ok).toBe(true);
    expect(r2.deduplicated).toBe(true);
  });
});
