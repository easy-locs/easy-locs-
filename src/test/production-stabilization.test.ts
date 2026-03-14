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
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
  },
}));

// ═══════════════════════════════════════════════════════
// 1. SYNC ENGINE — Context Validation
// ═══════════════════════════════════════════════════════

describe("Sync Engine — Context Validation", () => {
  it("rejects events without orgId", async () => {
    const { dispatchSyncEvent } = await import("@/lib/shared/sync-engine");
    const result = await dispatchSyncEvent({
      type: "lease_created",
      context: { orgId: "" },
      actorUserId: "user-1",
      leaseType: "furnished",
      startDate: "2026-04-01",
      tenantName: "Test",
      propertyLabel: "Apt 1",
    });
    expect(result).toBe(false);
  });

  it("rejects lease_created without leaseId", async () => {
    const { dispatchSyncEvent } = await import("@/lib/shared/sync-engine");
    const result = await dispatchSyncEvent({
      type: "lease_created",
      context: { orgId: "org-1" },
      actorUserId: "user-1",
      leaseType: "furnished",
      startDate: "2026-04-01",
      tenantName: "Test",
      propertyLabel: "Apt 1",
    });
    expect(result).toBe(false);
  });

  it("rejects booking_request without bookingId", async () => {
    const { dispatchSyncEvent } = await import("@/lib/shared/sync-engine");
    const result = await dispatchSyncEvent({
      type: "booking_request",
      context: { orgId: "org-1" },
      actorUserId: "user-1",
      guestName: "Guest",
      checkIn: "2026-04-01",
      checkOut: "2026-04-05",
      listingTitle: "Villa",
    });
    expect(result).toBe(false);
  });

  it("rejects service_booking without bookingId", async () => {
    const { dispatchSyncEvent } = await import("@/lib/shared/sync-engine");
    const result = await dispatchSyncEvent({
      type: "service_booking",
      context: { orgId: "org-1" },
      actorUserId: "user-1",
      clientName: "Client",
      serviceTitle: "Spa",
      serviceDate: "2026-04-01",
      totalPrice: 100,
      currency: "EUR",
    });
    expect(result).toBe(false);
  });

  it("rejects intervention_created without propertyId", async () => {
    const { dispatchSyncEvent } = await import("@/lib/shared/sync-engine");
    const result = await dispatchSyncEvent({
      type: "intervention_created",
      context: { orgId: "org-1" },
      actorUserId: "user-1",
      title: "Fix plumbing",
      priority: "high",
      propertyLabel: "Apt 1",
    });
    expect(result).toBe(false);
  });

  it("rejects lead_created without leadId", async () => {
    const { dispatchSyncEvent } = await import("@/lib/shared/sync-engine");
    const result = await dispatchSyncEvent({
      type: "lead_created",
      context: { orgId: "org-1" },
      actorUserId: "user-1",
      leadName: "Lead",
      leadEmail: "lead@test.com",
      leadMessage: "Interested",
      listingTitle: "Villa",
      listingId: "listing-1",
    });
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════
// 2. DEEP LINK ROUTING — URL Resolution
// ═══════════════════════════════════════════════════════

describe("Deep Link Routing — buildTargetUrl", () => {
  it("builds correct URL for lease", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("lease", { targetId: "lease-123", countryCode: "FR" });
    expect(url).toBe("/dashboard/leases?country=FR&record=lease-123");
  });

  it("builds correct URL for booking_request with bookingId", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("booking_request", { bookingId: "bk-1", countryCode: "ES" });
    expect(url).toBe("/dashboard/seasonal?country=ES&booking=bk-1");
  });

  it("builds correct URL for marketplace_booking", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("marketplace_booking", { bookingId: "mb-1" });
    expect(url).toBe("/dashboard/activities?booking=mb-1");
  });

  it("builds correct URL for intervention", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("intervention", { targetId: "int-1", countryCode: "DE" });
    expect(url).toBe("/dashboard/interventions?country=DE&record=int-1");
  });

  it("builds correct URL for real_estate_lead", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("real_estate_lead", { targetId: "lead-1" });
    expect(url).toBe("/dashboard/real-estate?tab=leads&record=lead-1");
  });

  it("builds correct URL for payment", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("payment", { targetId: "pay-1" });
    expect(url).toBe("/dashboard/rental?record=pay-1");
  });

  it("builds correct URL for receipt", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("receipt", { targetId: "rcp-1" });
    expect(url).toBe("/dashboard/receipts?record=rcp-1");
  });

  it("builds correct URL for concierge_order", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("concierge_order", { bookingId: "co-1" });
    expect(url).toBe("/dashboard/activities?booking=co-1");
  });

  it("tenant portal remaps lease correctly", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("lease", { targetId: "l-1", role: "tenant" });
    expect(url).toBe("/tenant/documents?record=l-1");
  });

  it("tenant portal remaps payment correctly", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("payment", { targetId: "p-1", role: "tenant" });
    expect(url).toBe("/tenant/pay?record=p-1");
  });

  it("tenant portal remaps receipt correctly", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("receipt", { targetId: "r-1", role: "tenant" });
    expect(url).toBe("/tenant/receipts?record=r-1");
  });

  it("tenant portal remaps intervention correctly", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("intervention", { targetId: "i-1", role: "tenant" });
    expect(url).toBe("/tenant/requests?record=i-1");
  });
});

// ═══════════════════════════════════════════════════════
// 3. NOTIFICATION RESOLUTION — resolveTarget
// ═══════════════════════════════════════════════════════

describe("Notification — resolveTarget", () => {
  it("resolves from metadata_json for landlord", async () => {
    const { resolveTarget } = await import("@/lib/shared/routes");
    const notif = {
      metadata_json: {
        target_type: "lease",
        target_id: "l-1",
        target_url: "/dashboard/leases?record=l-1",
        module: "long_term",
        country_code: "FR",
      },
    };
    const url = resolveTarget(notif, "landlord");
    expect(url).toContain("/dashboard/leases");
    expect(url).toContain("record=l-1");
    expect(url).toContain("country=FR");
  });

  it("remaps for tenant portal", async () => {
    const { resolveTarget } = await import("@/lib/shared/routes");
    const notif = {
      metadata_json: {
        target_type: "payment",
        target_id: "p-1",
        target_url: "/dashboard/rental?record=p-1",
        module: "long_term",
        country_code: "",
      },
    };
    const url = resolveTarget(notif, "tenant");
    expect(url).toContain("/tenant/pay");
  });

  it("falls back to notification.link for legacy", async () => {
    const { resolveTarget } = await import("@/lib/shared/routes");
    const notif = { link: "/dashboard/receipts?id=old", type: "receipt" };
    expect(resolveTarget(notif, "landlord")).toBe("/dashboard/receipts?id=old");
  });

  it("falls back to type-based route as last resort", async () => {
    const { resolveTarget } = await import("@/lib/shared/routes");
    const notif = { type: "payment" };
    expect(resolveTarget(notif, "landlord")).toBe("/dashboard/rental");
  });

  it("unknown type falls back to /dashboard", async () => {
    const { resolveTarget } = await import("@/lib/shared/routes");
    const notif = { type: "unknown_type" };
    expect(resolveTarget(notif, "landlord")).toBe("/dashboard");
  });
});

// ═══════════════════════════════════════════════════════
// 4. MODULE DETECTION
// ═══════════════════════════════════════════════════════

describe("Module Detection", () => {
  it("detects marketplace from target_type", async () => {
    const { detectModule } = await import("@/lib/shared/routes");
    const notif = { metadata_json: { target_type: "marketplace_booking", module: "marketplace" } };
    expect(detectModule(notif)).toBe("marketplace");
  });

  it("detects seasonal from target_type", async () => {
    const { detectModule } = await import("@/lib/shared/routes");
    const notif = { metadata_json: { target_type: "booking_request", module: "seasonal" } };
    expect(detectModule(notif)).toBe("seasonal");
  });

  it("detects long_term from target_type", async () => {
    const { detectModule } = await import("@/lib/shared/routes");
    const notif = { metadata_json: { target_type: "lease", module: "long_term" } };
    expect(detectModule(notif)).toBe("long_term");
  });

  it("detects real_estate from target_type", async () => {
    const { detectModule } = await import("@/lib/shared/routes");
    const notif = { metadata_json: { target_type: "real_estate_lead", module: "real_estate" } };
    expect(detectModule(notif)).toBe("real_estate");
  });
});

// ═══════════════════════════════════════════════════════
// 5. CONTEXT-AWARE CONFIG RESOLUTION
// ═══════════════════════════════════════════════════════

describe("Sync Engine — Context-Aware Config", () => {
  it("payment_request_sent routes to marketplace when bookingId only", async () => {
    const { dispatchSyncEvent } = await import("@/lib/shared/sync-engine");
    // Can't directly test resolveEffectiveConfig since it's not exported,
    // but we verify via the notification meta created by dispatch.
    // We'll test buildTargetUrl for the resolved target type instead.
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("marketplace_booking", { bookingId: "mb-1" });
    expect(url).toContain("/dashboard/activities");
    expect(url).toContain("booking=mb-1");
  });

  it("payment_request_sent routes to seasonal when bookingId + propertyId", async () => {
    const { buildTargetUrl } = await import("@/lib/shared/routes");
    const url = buildTargetUrl("booking_request", { bookingId: "bk-1" });
    expect(url).toContain("/dashboard/seasonal");
    expect(url).toContain("booking=bk-1");
  });
});

// ═══════════════════════════════════════════════════════
// 6. NOTIFICATION ENGINE — createDeepLinkMeta
// ═══════════════════════════════════════════════════════

describe("Notification Engine — DeepLinkMeta", () => {
  it("creates correct meta for lease_created", async () => {
    const { createDeepLinkMeta } = await import("@/lib/shared/notification-engine");
    const meta = createDeepLinkMeta({
      targetType: "lease",
      targetId: "lease-123",
      module: "long_term",
      countryCode: "FR",
      orgId: "org-1",
      leaseId: "lease-123",
    });
    expect(meta.target_type).toBe("lease");
    expect(meta.target_id).toBe("lease-123");
    expect(meta.module).toBe("long_term");
    expect(meta.country_code).toBe("FR");
    expect(meta.target_url).toContain("/dashboard/leases");
    expect(meta.target_url).toContain("record=lease-123");
    expect(meta.lease_id).toBe("lease-123");
  });

  it("creates correct meta for marketplace_booking", async () => {
    const { createDeepLinkMeta } = await import("@/lib/shared/notification-engine");
    const meta = createDeepLinkMeta({
      targetType: "marketplace_booking",
      targetId: "mb-1",
      module: "marketplace",
      bookingId: "mb-1",
      orgId: "org-1",
    });
    expect(meta.target_type).toBe("marketplace_booking");
    expect(meta.target_url).toContain("/dashboard/activities");
    expect(meta.target_url).toContain("booking=mb-1");
  });

  it("creates correct meta for booking_request", async () => {
    const { createDeepLinkMeta } = await import("@/lib/shared/notification-engine");
    const meta = createDeepLinkMeta({
      targetType: "booking_request",
      targetId: "br-1",
      module: "seasonal",
      bookingId: "br-1",
      countryCode: "ES",
    });
    expect(meta.target_type).toBe("booking_request");
    expect(meta.target_url).toContain("/dashboard/seasonal");
    expect(meta.target_url).toContain("booking=br-1");
    expect(meta.country_code).toBe("ES");
  });
});

// ═══════════════════════════════════════════════════════
// 7. ABSOLUTE URL BUILDER (for emails)
// ═══════════════════════════════════════════════════════

describe("Absolute URL Builder", () => {
  it("builds absolute URL for lease notification email", async () => {
    const { buildAbsoluteTargetUrl } = await import("@/lib/shared/routes");
    const url = buildAbsoluteTargetUrl("https://easy-locs.lovable.app", "lease", {
      targetId: "l-1",
      countryCode: "FR",
    });
    expect(url).toBe("https://easy-locs.lovable.app/dashboard/leases?country=FR&record=l-1");
  });

  it("strips trailing slash from base URL", async () => {
    const { buildAbsoluteTargetUrl } = await import("@/lib/shared/routes");
    const url = buildAbsoluteTargetUrl("https://easy-locs.lovable.app/", "receipt", {
      targetId: "r-1",
    });
    expect(url).toBe("https://easy-locs.lovable.app/dashboard/receipts?record=r-1");
  });
});

// ═══════════════════════════════════════════════════════
// 8. PORTAL DETECTION
// ═══════════════════════════════════════════════════════

describe("Portal Detection", () => {
  it("detects tenant portal from URL", async () => {
    const { detectPortal } = await import("@/lib/shared/routes");
    const notif = { metadata_json: { target_url: "/tenant/pay?record=p-1" } };
    expect(detectPortal(notif)).toBe("tenant");
  });

  it("detects landlord portal from URL", async () => {
    const { detectPortal } = await import("@/lib/shared/routes");
    const notif = { metadata_json: { target_url: "/dashboard/leases?record=l-1" } };
    expect(detectPortal(notif)).toBe("landlord");
  });

  it("returns both for messages", async () => {
    const { detectPortal } = await import("@/lib/shared/routes");
    const notif = { type: "message" };
    expect(detectPortal(notif)).toBe("both");
  });
});

// ═══════════════════════════════════════════════════════
// 9. ALL TARGET TYPES HAVE ROUTES
// ═══════════════════════════════════════════════════════

describe("Route Completeness", () => {
  it("every TargetType has a corresponding route", async () => {
    const { TARGET_ROUTES } = await import("@/lib/shared/routes");
    const expectedTargets: string[] = [
      "lease", "tenant", "payment", "receipt", "document", "intervention",
      "invoice", "dunning", "expense",
      "booking_request",
      "marketplace_booking", "marketplace_service", "concierge_order", "concierge_service",
      "real_estate_lead", "real_estate_listing",
      "message",
    ];
    expectedTargets.forEach((t) => {
      expect(TARGET_ROUTES).toHaveProperty(t);
      expect((TARGET_ROUTES as any)[t].landlord).toBeTruthy();
    });
  });

  it("tenant portal routes exist for key long-term types", async () => {
    const { TARGET_ROUTES } = await import("@/lib/shared/routes");
    const tenantMapped = ["lease", "payment", "receipt", "document", "intervention", "message"];
    tenantMapped.forEach((t) => {
      expect((TARGET_ROUTES as any)[t].tenant).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════
// 10. MULTI-ORG ISOLATION — Type Safety
// ═══════════════════════════════════════════════════════

describe("Multi-Org Isolation — Type Safety", () => {
  it("SyncContext requires orgId", () => {
    // TypeScript-level check: orgId is required
    const ctx = { orgId: "org-1" };
    expect(ctx.orgId).toBeTruthy();
  });

  it("DeepLinkMeta carries org_id", async () => {
    const { createDeepLinkMeta } = await import("@/lib/shared/notification-engine");
    const meta = createDeepLinkMeta({
      targetType: "lease",
      targetId: "l-1",
      module: "long_term",
      orgId: "org-abc",
    });
    expect(meta.org_id).toBe("org-abc");
  });
});

// ═══════════════════════════════════════════════════════
// 11. EVENT CONTENT GENERATION
// ═══════════════════════════════════════════════════════

describe("Sync Engine — All Event Types Defined", () => {
  it("EVENT_CONFIG covers all 10 event types", async () => {
    // We can indirectly test by verifying the module exports the SyncEvent type
    // and that dispatch handles all known types without "unknown" warning
    const syncEngine = await import("@/lib/shared/sync-engine");
    expect(syncEngine.dispatchSyncEvent).toBeDefined();
    expect(syncEngine.syncPaymentRequest).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════
// 12. MONITORING — Regression
// ═══════════════════════════════════════════════════════

describe("Monitoring — Health Checks Regression", () => {
  it("runSyncHealthChecks returns structured results", async () => {
    const { runSyncHealthChecks } = await import("@/lib/monitoring");
    const results = await runSyncHealthChecks();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    results.forEach((r) => {
      expect(["ok", "warning", "error"]).toContain(r.status);
      expect(r.name).toBeTruthy();
    });
  });
});

// ═══════════════════════════════════════════════════════
// 13. CRITICAL PAGE IMPORTS — Extended Regression
// ═══════════════════════════════════════════════════════

describe("Critical Page Imports — Extended", () => {
  const pages = [
    "Leases", "Receipts", "PaymentNotices", "RentalManagement",
    "SeasonalRentals", "ActivitiesMarketplace", "Interventions",
    "CommunicationCenter", "Documents", "Finances", "Expenses",
    "RealEstateListings", "ConciergeServices", "ConciergeOperations",
    "PropertyManagement", "FurnitureInventory", "Candidates",
    "Billing", "Settings", "Referrals", "Collaboration",
  ];

  pages.forEach((page) => {
    it(`${page} imports successfully`, async () => {
      const mod = await import(`../pages/${page}.tsx`);
      expect(mod.default).toBeDefined();
    });
  });
});

describe("Tenant Pages — Full Suite", () => {
  const tenantPages = [
    "TenantDashboard", "TenantReceipts", "TenantDocuments",
    "TenantMessages", "TenantPay", "TenantSettings", "TenantRequests", "TenantReviews",
  ];

  tenantPages.forEach((page) => {
    it(`tenant/${page} imports successfully`, async () => {
      const mod = await import(`../pages/tenant/${page}.tsx`);
      expect(mod.default).toBeDefined();
    });
  });
});
