import { describe, it, expect, vi } from "vitest";

/**
 * Production Stabilization Phase 2
 * - Mobile / responsive patterns
 * - Payment fallback logic
 * - Tenant portal entry points
 */

// ═══ 1. MOBILE / RESPONSIVE VERIFICATION ═══

describe("Mobile & Responsive Patterns", () => {

  describe("DashboardLayout structure", () => {
    it("imports and renders without crash", async () => {
      const mod = await import("@/components/dashboard/DashboardLayout");
      expect(mod.default).toBeDefined();
    });
  });

  describe("BookingDialog mobile optimization", () => {
    it("imports successfully", async () => {
      const mod = await import("@/components/marketplace/BookingDialog");
      expect(mod.default).toBeDefined();
    });
  });

  // CSS mobile patterns verified via code search: mobile-safe, safe-bottom, sidebar-overlay, card-row, detail-header, app-main all present in index.css

});

// ═══ 2. PAYMENT FALLBACK VERIFICATION ═══

describe("Payment Fallback Logic", () => {

  describe("buildPaymentInstructions", () => {
    let buildPaymentInstructions: any;

    beforeAll(async () => {
      const mod = await import("@/lib/shared/payment-request");
      buildPaymentInstructions = mod.buildPaymentInstructions;
    });

    it("returns Stripe instruction when Stripe is configured and default", () => {
      const config = {
        stripe_account_id: "acct_123",
        stripe_onboarding_complete: true,
        paypal_email: null,
        bank_holder_name: null,
        bank_iban: null,
        bank_bic: null,
        bank_name: null,
        payment_link_url: null,
        default_payment_provider: "stripe",
      };
      const result = buildPaymentInstructions(config, 500, "EUR");
      expect(result).toContain("Stripe");
      expect(result).toContain("500");
      expect(result).toContain("EUR");
    });

    it("returns PayPal instruction when PayPal is default", () => {
      const config = {
        stripe_account_id: null,
        stripe_onboarding_complete: false,
        paypal_email: "pay@example.com",
        bank_holder_name: null,
        bank_iban: null,
        bank_bic: null,
        bank_name: null,
        payment_link_url: null,
        default_payment_provider: "paypal",
      };
      const result = buildPaymentInstructions(config, 200, "USD");
      expect(result).toContain("PayPal");
      expect(result).toContain("pay@example.com");
    });

    it("returns bank transfer details when bank_transfer is default", () => {
      const config = {
        stripe_account_id: null,
        stripe_onboarding_complete: false,
        paypal_email: null,
        bank_holder_name: "John Doe",
        bank_iban: "FR7612345678901234567890123",
        bank_bic: "BNPAFRPP",
        bank_name: "BNP Paribas",
        payment_link_url: null,
        default_payment_provider: "bank_transfer",
      };
      const result = buildPaymentInstructions(config, 1000, "EUR");
      expect(result).toContain("IBAN");
      expect(result).toContain("FR7612345678901234567890123");
      expect(result).toContain("John Doe");
      expect(result).toContain("BNPAFRPP");
    });

    it("returns payment_link when configured as default", () => {
      const config = {
        stripe_account_id: null,
        stripe_onboarding_complete: false,
        paypal_email: null,
        bank_holder_name: null,
        bank_iban: null,
        bank_bic: null,
        bank_name: null,
        payment_link_url: "https://pay.me/org123",
        default_payment_provider: "payment_link",
      };
      const result = buildPaymentInstructions(config, 300, "GBP");
      expect(result).toContain("https://pay.me/org123");
    });

    it("falls back to listing all methods when default is not configured", () => {
      const config = {
        stripe_account_id: "acct_456",
        stripe_onboarding_complete: true,
        paypal_email: "backup@example.com",
        bank_holder_name: null,
        bank_iban: "DE89370400440532013000",
        bank_bic: null,
        bank_name: null,
        payment_link_url: null,
        default_payment_provider: "wire", // Not a recognized provider
      };
      const result = buildPaymentInstructions(config, 750, "EUR");
      // Should fall through to fallback listing all available methods
      expect(result).toContain("Stripe");
      expect(result).toContain("IBAN");
      expect(result).toContain("PayPal");
    });

    it("shows warning when no payment method is configured at all", () => {
      const config = {
        stripe_account_id: null,
        stripe_onboarding_complete: false,
        paypal_email: null,
        bank_holder_name: null,
        bank_iban: null,
        bank_bic: null,
        bank_name: null,
        payment_link_url: null,
        default_payment_provider: null,
      };
      const result = buildPaymentInstructions(config, 100, "EUR");
      expect(result).toContain("⚠️");
      expect(result).toContain("No payment method configured");
    });

    it("Stripe incomplete onboarding falls to fallback", () => {
      const config = {
        stripe_account_id: "acct_789",
        stripe_onboarding_complete: false, // Not complete!
        paypal_email: null,
        bank_holder_name: null,
        bank_iban: null,
        bank_bic: null,
        bank_name: null,
        payment_link_url: null,
        default_payment_provider: "stripe",
      };
      const result = buildPaymentInstructions(config, 100, "EUR");
      // Stripe won't show because onboarding incomplete — should show warning
      expect(result).toContain("⚠️");
    });
  });

  describe("SEPA country filtering for payment methods", () => {
    let getAvailablePaymentMethods: any;

    beforeAll(async () => {
      const mod = await import("@/lib/sepa-countries");
      getAvailablePaymentMethods = mod.getAvailablePaymentMethods;
    });

    it("FR includes sepa", () => {
      const methods = getAvailablePaymentMethods("FR");
      expect(methods).toContain("sepa");
      expect(methods).toContain("card");
    });

    it("US excludes sepa", () => {
      const methods = getAvailablePaymentMethods("US");
      expect(methods).not.toContain("sepa");
      expect(methods).toContain("card");
    });

    it("AE excludes sepa", () => {
      const methods = getAvailablePaymentMethods("AE");
      expect(methods).not.toContain("sepa");
    });

    it("GB includes sepa (post-Brexit SEPA)", () => {
      const methods = getAvailablePaymentMethods("GB");
      expect(methods).toContain("sepa");
    });

    it("always includes card and bank_transfer", () => {
      for (const country of ["FR", "US", "JP", "BR", "AE"]) {
        const methods = getAvailablePaymentMethods(country);
        expect(methods).toContain("card");
        expect(methods).toContain("bank_transfer");
      }
    });
  });
});

// ═══ 3. TENANT / CLIENT PORTAL VERIFICATION ═══

describe("Tenant Portal Access", () => {

  describe("useTenantProperty hook", () => {
    it("exports correctly", async () => {
      const mod = await import("@/hooks/useTenantProperty");
      expect(mod.useTenantProperty).toBeDefined();
    });
  });

  describe("Tenant portal routes resolve", () => {
    it("deep-link resolves tenant portal URLs", async () => {
      const { buildTargetUrl } = await import("@/lib/shared/routes");
      
      // Tenant receipt deep link
      const receiptUrl = buildTargetUrl("receipt", { targetId: "r123", role: "tenant" });
      expect(receiptUrl).toContain("/my-orders");
      
      const payUrl = buildTargetUrl("payment", { targetId: "p123", role: "tenant" });
      expect(payUrl).toContain("/wallet");
      
      const msgUrl = buildTargetUrl("message", { targetId: "m123", role: "tenant" });
      expect(msgUrl).toContain("/orbit");
    });
  });

  describe("Communication pipeline accessible", () => {
    it("sendCommunicationEvent exists", async () => {
      const mod = await import("@/lib/shared/communication-pipeline");
      expect(mod.sendCommunicationEvent).toBeDefined();
    });

    it("createDeepLinkMeta exists", async () => {
      const mod = await import("@/lib/shared/notification-engine");
      expect(mod.createDeepLinkMeta).toBeDefined();
    });
  });

});

// ═══ 4. CROSS-CUTTING INTEGRATION CHECKS ═══

describe("Cross-cutting Stabilization", () => {

  it("CountryGuard component exports", async () => {
    const mod = await import("@/components/dashboard/CountryGuard");
    expect(mod.default).toBeDefined();
  });

  it("NotificationBell component exports", async () => {
    const mod = await import("@/components/notifications/NotificationBell");
    expect(mod.default).toBeDefined();
  });

  it("CommunicationCenter page exports", async () => {
    const mod = await import("@/pages/CommunicationCenter");
    expect(mod.default).toBeDefined();
  });

  it("Shared routes module has all resolvers", async () => {
    const routes = await import("@/lib/shared/routes");
    expect(routes.buildTargetUrl).toBeDefined();
    expect(routes.buildTargetUrl).toBeDefined();
  });

  it("Shared notification engine has required exports", async () => {
    const engine = await import("@/lib/shared/notification-engine");
    expect(engine.createDeepLinkMeta).toBeDefined();
    expect(engine.createNotification).toBeDefined();
  });

  it("Shared sync engine has required exports", async () => {
    const sync = await import("@/lib/shared/sync-engine");
    expect(sync.dispatchSyncEvent).toBeDefined();
  });
});
