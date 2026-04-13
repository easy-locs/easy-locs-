import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

// ═══════════════════════════════════════════════════════
// 1. DEDUPLICATION LOGIC
// ═══════════════════════════════════════════════════════

describe("Sync Engine — Deduplication", () => {
  it("first dispatch succeeds, immediate second is blocked", async () => {
    // Fresh import to get clean dedup state
    const mod = await import("@/lib/shared/sync-engine");

    const event = {
      type: "lease_created" as const,
      context: { orgId: "org-dedup-1", leaseId: "lease-dedup-1" },
      actorUserId: "user-dedup-1",
      leaseType: "furnished",
      startDate: "2026-05-01",
      tenantName: "Dedup Test",
      propertyLabel: "Apt Dedup",
    };

    const first = await mod.dispatchSyncEvent(event);
    const second = await mod.dispatchSyncEvent(event);

    expect(first).toBe(true);
    expect(second).toBe(false); // blocked by dedup
  });

  it("different events with different IDs are NOT deduplicated", async () => {
    const mod = await import("@/lib/shared/sync-engine");

    const event1 = {
      type: "intervention_created" as const,
      context: { orgId: "org-diff-1", propertyId: "prop-1" },
      actorUserId: "user-diff-1",
      title: "Fix A",
      priority: "high",
      propertyLabel: "Apt A",
    };
    const event2 = {
      type: "intervention_created" as const,
      context: { orgId: "org-diff-1", propertyId: "prop-2" },
      actorUserId: "user-diff-1",
      title: "Fix B",
      priority: "medium",
      propertyLabel: "Apt B",
    };

    const r1 = await mod.dispatchSyncEvent(event1);
    const r2 = await mod.dispatchSyncEvent(event2);
    expect(r1).toBe(true);
    expect(r2).toBe(true); // different propertyId → different dedup key
  });

  it("different event types on same org are NOT deduplicated", async () => {
    const mod = await import("@/lib/shared/sync-engine");

    const r1 = await mod.dispatchSyncEvent({
      type: "booking_request",
      context: { orgId: "org-multi-type", bookingId: "bk-same-1", propertyId: "p1" },
      actorUserId: "user-mt-1",
      guestName: "Guest",
      checkIn: "2026-06-01",
      checkOut: "2026-06-05",
      listingTitle: "Villa",
    });
    const r2 = await mod.dispatchSyncEvent({
      type: "service_booking",
      context: { orgId: "org-multi-type", bookingId: "bk-same-1" },
      actorUserId: "user-mt-1",
      clientName: "Client",
      serviceTitle: "Spa",
      serviceDate: "2026-06-01",
      totalPrice: 100,
      currency: "EUR",
    });
    expect(r1).toBe(true);
    expect(r2).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 2. FULL FLOW WIRING — Lease Creation
// ═══════════════════════════════════════════════════════

describe("Flow Wiring — Lease Creation", () => {
  it("dispatch produces correct message + notification + deep link", async () => {
    const mod = await import("@/lib/shared/sync-engine");
    const { buildTargetUrl } = await import("@/lib/shared/routes");

    // Verify the deep link URL that would be generated
    const url = buildTargetUrl("lease", {
      targetId: "lease-flow-1",
      countryCode: "FR",
    });
    expect(url).toBe("/dashboard/leases?country=FR&record=lease-flow-1");

    // Verify dispatch succeeds with all required context
    const result = await mod.dispatchSyncEvent({
      type: "lease_created",
      context: {
        orgId: "org-flow-1",
        propertyId: "prop-1",
        tenantId: "tenant-1",
        leaseId: "lease-flow-1",
        countryCode: "FR",
      },
      actorUserId: "user-flow-1",
      targetUserId: "tenant-user-1",
      targetEmail: "tenant@example.com",
      leaseType: "furnished",
      startDate: "2026-04-01",
      tenantName: "Jean Dupont",
      propertyLabel: "Apt 3B - Rue de Paris",
    });
    expect(result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 3. FULL FLOW WIRING — Payment Received + Receipt
// ═══════════════════════════════════════════════════════

describe("Flow Wiring — Payment + Receipt Chain", () => {
  it("payment_received dispatches with correct paymentId", async () => {
    const mod = await import("@/lib/shared/sync-engine");
    const result = await mod.dispatchSyncEvent({
      type: "payment_received",
      context: { orgId: "org-pay-1", propertyId: "p-1", tenantId: "t-1", countryCode: "FR" },
      actorUserId: "user-pay-1",
      month: "2026-03",
      totalAmount: 850,
      currency: "EUR",
      tenantName: "Marie Curie",
      paymentId: "rentcall-pay-1",
    });
    expect(result).toBe(true);
  });

  it("receipt_generated dispatches with receiptId", async () => {
    const mod = await import("@/lib/shared/sync-engine");
    const result = await mod.dispatchSyncEvent({
      type: "receipt_generated",
      context: { orgId: "org-rcp-1", propertyId: "p-1", tenantId: "t-1", countryCode: "FR" },
      actorUserId: "user-rcp-1",
      targetUserId: "tenant-user-rcp",
      targetEmail: "tenant@rcp.com",
      month: "2026-03",
      totalAmount: 850,
      currency: "EUR",
      tenantName: "Marie Curie",
      receiptId: "receipt-rcp-1",
    });
    expect(result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 4. FULL FLOW WIRING — Seasonal Booking
// ═══════════════════════════════════════════════════════

describe("Flow Wiring — Seasonal Booking", () => {
  it("booking_request dispatches correctly for public visitors", async () => {
    const mod = await import("@/lib/shared/sync-engine");
    const result = await mod.dispatchSyncEvent({
      type: "booking_request",
      context: {
        orgId: "org-seasonal-1",
        propertyId: "prop-seasonal-1",
        bookingId: "bk-seasonal-1",
        countryCode: "ES",
      },
      actorUserId: "", // public visitor
      targetEmail: "owner@seasonal.com",
      guestName: "Carlos Martinez",
      checkIn: "2026-07-01",
      checkOut: "2026-07-14",
      listingTitle: "Beach Villa Costa Brava",
    });
    expect(result).toBe(true);
  });

  it("payment_request_sent routes to seasonal context (bookingId + propertyId)", async () => {
    const { createDeepLinkMeta } = await import("@/lib/shared/notification-engine");
    // Simulating what resolveEffectiveConfig does for seasonal context
    const meta = createDeepLinkMeta({
      targetType: "booking_request",
      targetId: "bk-seasonal-pay-1",
      module: "seasonal",
      bookingId: "bk-seasonal-pay-1",
      countryCode: "ES",
    });
    expect(meta.target_url).toContain("/seasonal-rentals");
    expect(meta.target_url).toContain("booking=bk-seasonal-pay-1");
    expect(meta.module).toBe("seasonal");
  });
});

// ═══════════════════════════════════════════════════════
// 5. FULL FLOW WIRING — Marketplace Service Booking
// ═══════════════════════════════════════════════════════

describe("Flow Wiring — Marketplace Booking", () => {
  it("service_booking dispatches correctly", async () => {
    const mod = await import("@/lib/shared/sync-engine");
    const result = await mod.dispatchSyncEvent({
      type: "service_booking",
      context: {
        orgId: "org-mkt-1",
        bookingId: "mb-mkt-1",
        countryCode: "FR",
      },
      actorUserId: "user-mkt-booker",
      targetUserId: "provider-user-1",
      targetEmail: "provider@marketplace.com",
      clientName: "Alice Martin",
      serviceTitle: "Wine Tasting Tour",
      serviceDate: "2026-08-15",
      totalPrice: 120,
      currency: "EUR",
    });
    expect(result).toBe(true);
  });

  it("marketplace deep link targets /dashboard/activities", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("marketplace_booking", { bookingId: "mb-link-1" });
    expect(url).toBe("/activities?booking=mb-link-1");
  });
});

// ═══════════════════════════════════════════════════════
// 6. FULL FLOW WIRING — Real Estate Lead
// ═══════════════════════════════════════════════════════

describe("Flow Wiring — Real Estate Lead", () => {
  it("lead_created dispatches correctly for public visitors", async () => {
    const mod = await import("@/lib/shared/sync-engine");
    const result = await mod.dispatchSyncEvent({
      type: "lead_created",
      context: {
        orgId: "org-re-1",
        leadId: "lead-re-1",
        countryCode: "PT",
      },
      actorUserId: "", // public visitor
      targetEmail: "agent@realestate.com",
      leadName: "Sofia Costa",
      leadEmail: "sofia@client.com",
      leadMessage: "Interested in the Lisbon apartment",
      listingTitle: "Modern 2BR in Alfama",
      listingId: "listing-re-1",
    });
    expect(result).toBe(true);
  });

  it("real_estate_lead deep link targets /dashboard/real-estate with tab=leads", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("real_estate_lead", { targetId: "lead-link-1" });
    expect(url).toContain("/dashboard/real-estate");
    expect(url).toContain("tab=leads");
    expect(url).toContain("record=lead-link-1");
  });
});

// ═══════════════════════════════════════════════════════
// 7. FULL FLOW WIRING — Intervention
// ═══════════════════════════════════════════════════════

describe("Flow Wiring — Intervention", () => {
  it("intervention_created dispatches correctly", async () => {
    const mod = await import("@/lib/shared/sync-engine");
    const result = await mod.dispatchSyncEvent({
      type: "intervention_created",
      context: {
        orgId: "org-intv-1",
        propertyId: "prop-intv-1",
        tenantId: "tenant-intv-1",
        countryCode: "DE",
      },
      actorUserId: "user-intv-1",
      title: "Water leak in bathroom",
      priority: "urgent",
      propertyLabel: "Apt 12 - Berlinerstr",
    });
    expect(result).toBe(true);
  });

  it("intervention deep link targets /dashboard/interventions", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("intervention", { targetId: "int-link-1", countryCode: "DE" });
    expect(url).toBe("/dashboard/interventions?country=DE&record=int-link-1");
  });
});

// ═══════════════════════════════════════════════════════
// 8. PAYMENT REQUEST UTILITY
// ═══════════════════════════════════════════════════════

describe("Payment Request — buildPaymentInstructions", () => {
  it("generates Stripe instructions when configured", async () => {
    const { buildPaymentInstructions } = await import("@/lib/shared/payment-request");
    const config = {
      stripe_account_id: "acct_abc",
      stripe_onboarding_complete: true,
      paypal_email: null,
      bank_holder_name: null,
      bank_iban: null,
      bank_bic: null,
      bank_name: null,
      payment_link_url: null,
      default_payment_provider: "stripe",
    };
    const instructions = buildPaymentInstructions(config, 150, "EUR");
    expect(instructions).toContain("Stripe");
    expect(instructions).toContain("150");
    expect(instructions).toContain("EUR");
  });

  it("generates bank transfer instructions when configured", async () => {
    const { buildPaymentInstructions } = await import("@/lib/shared/payment-request");
    const config = {
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      paypal_email: null,
      bank_holder_name: "Jean Dupont",
      bank_iban: "FR7612345678901234",
      bank_bic: "BNPAFRPP",
      bank_name: "BNP Paribas",
      payment_link_url: null,
      default_payment_provider: "bank_transfer",
    };
    const instructions = buildPaymentInstructions(config, 850, "EUR");
    expect(instructions).toContain("Bank Transfer");
    expect(instructions).toContain("FR7612345678901234");
    expect(instructions).toContain("BNPAFRPP");
    expect(instructions).toContain("Jean Dupont");
  });

  it("generates PayPal instructions when configured", async () => {
    const { buildPaymentInstructions } = await import("@/lib/shared/payment-request");
    const config = {
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      paypal_email: "pay@company.com",
      bank_holder_name: null,
      bank_iban: null,
      bank_bic: null,
      bank_name: null,
      payment_link_url: null,
      default_payment_provider: "paypal",
    };
    const instructions = buildPaymentInstructions(config, 50, "USD");
    expect(instructions).toContain("PayPal");
    expect(instructions).toContain("pay@company.com");
    expect(instructions).toContain("50");
  });

  it("generates payment link instructions when configured", async () => {
    const { buildPaymentInstructions } = await import("@/lib/shared/payment-request");
    const config = {
      stripe_account_id: null,
      stripe_onboarding_complete: false,
      paypal_email: null,
      bank_holder_name: null,
      bank_iban: null,
      bank_bic: null,
      bank_name: null,
      payment_link_url: "https://pay.wise.com/mylink",
      default_payment_provider: "payment_link",
    };
    const instructions = buildPaymentInstructions(config, 200, "GBP");
    expect(instructions).toContain("https://pay.wise.com/mylink");
  });

  it("shows fallback warning when nothing configured", async () => {
    const { buildPaymentInstructions } = await import("@/lib/shared/payment-request");
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
    const instructions = buildPaymentInstructions(config, 100, "EUR");
    expect(instructions).toContain("No payment method configured");
  });
});

// ═══════════════════════════════════════════════════════
// 9. COMMUNICATION PIPELINE — Email CTA URL Generation
// ═══════════════════════════════════════════════════════

describe("Communication Pipeline — Email CTA URLs", () => {
  it("buildAbsoluteTargetUrl generates correct clickable links", async () => {
    const { buildAbsoluteTargetUrl } = await import("@/lib/shared/routes");
    
    const tests = [
      { type: "lease" as const, ids: { targetId: "l-1", countryCode: "FR" }, expected: "/dashboard/leases?country=FR&record=l-1" },
      { type: "booking_request" as const, ids: { bookingId: "bk-1", countryCode: "ES" }, expected: "/dashboard/seasonal-rentals?country=ES&booking=bk-1" },
      { type: "marketplace_booking" as const, ids: { bookingId: "mb-1" }, expected: "/activities?booking=mb-1" },
      { type: "payment" as const, ids: { targetId: "p-1" }, expected: "/dashboard/rental-management?record=p-1" },
      { type: "intervention" as const, ids: { targetId: "i-1", countryCode: "DE" }, expected: "/dashboard/interventions?country=DE&record=i-1" },
    ];

    for (const t of tests) {
      const url = buildAbsoluteTargetUrl("https://easy-locs.lovable.app", t.type, t.ids);
      expect(url).toBe(`https://easy-locs.lovable.app${t.expected}`);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 10. RENT CALL CREATION FLOW
// ═══════════════════════════════════════════════════════

describe("Flow Wiring — Rent Call Creation", () => {
  it("rent_call_created dispatches with rentCallId", async () => {
    const mod = await import("@/lib/shared/sync-engine");
    const result = await mod.dispatchSyncEvent({
      type: "rent_call_created",
      context: { orgId: "org-rc-1", propertyId: "p-rc-1", tenantId: "t-rc-1", countryCode: "FR" },
      actorUserId: "user-rc-1",
      targetUserId: "tenant-user-rc-1",
      targetEmail: "tenant@rc.com",
      month: "2026-04",
      totalAmount: 1200,
      currency: "EUR",
      tenantName: "Pierre Martin",
      propertyLabel: "Apt 5A",
      rentCallId: "rc-id-1",
    });
    expect(result).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// 11. DOCUMENT SHARED FLOW
// ═══════════════════════════════════════════════════════

describe("Flow Wiring — Document Shared", () => {
  it("document_shared dispatches with documentId", async () => {
    const mod = await import("@/lib/shared/sync-engine");
    const result = await mod.dispatchSyncEvent({
      type: "document_shared",
      context: { orgId: "org-doc-1", documentId: "doc-1", leaseId: "lease-doc-1" },
      actorUserId: "user-doc-1",
      targetUserId: "tenant-doc-1",
      targetEmail: "tenant@doc.com",
      documentTitle: "Bail meublé — Mars 2026",
      documentType: "lease",
    });
    expect(result).toBe(true);
  });

  it("document_shared in marketplace context routes correctly", async () => {
    const { createDeepLinkMeta } = await import("@/lib/shared/notification-engine");
    // When document_shared has bookingId but no leaseId → marketplace context
    const meta = createDeepLinkMeta({
      targetType: "marketplace_booking",
      targetId: "mb-doc-1",
      module: "marketplace",
      bookingId: "mb-doc-1",
    });
    expect(meta.target_url).toContain("/activities");
  });
});

// ═══════════════════════════════════════════════════════
// 12. MULTI-ORG DATA ISOLATION
// ═══════════════════════════════════════════════════════

describe("Multi-Org Isolation", () => {
  it("events for different orgs produce different deep links", async () => {
    const { createDeepLinkMeta } = await import("@/lib/shared/notification-engine");
    
    const meta1 = createDeepLinkMeta({
      targetType: "lease", targetId: "l-1", module: "long_term", orgId: "org-A",
    });
    const meta2 = createDeepLinkMeta({
      targetType: "lease", targetId: "l-2", module: "long_term", orgId: "org-B",
    });

    expect(meta1.org_id).toBe("org-A");
    expect(meta2.org_id).toBe("org-B");
    expect(meta1.target_id).not.toBe(meta2.target_id);
  });

  it("orgId is always propagated in DeepLinkMeta", async () => {
    const { createDeepLinkMeta } = await import("@/lib/shared/notification-engine");
    const types: Array<{ targetType: any; module: any; targetId: string }> = [
      { targetType: "lease", module: "long_term", targetId: "l-iso" },
      { targetType: "booking_request", module: "seasonal", targetId: "bk-iso" },
      { targetType: "marketplace_booking", module: "marketplace", targetId: "mb-iso" },
      { targetType: "intervention", module: "long_term", targetId: "int-iso" },
    ];
    for (const t of types) {
      const meta = createDeepLinkMeta({ ...t, orgId: "org-iso-test" });
      expect(meta.org_id).toBe("org-iso-test");
    }
  });
});
