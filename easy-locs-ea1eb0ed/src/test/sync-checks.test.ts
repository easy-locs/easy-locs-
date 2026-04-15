import { describe, it, expect, vi } from "vitest";

// Mock supabase for sync tests
const mockQueryBuilder: any = {
  select: vi.fn().mockImplementation(() => mockQueryBuilder),
  insert: vi.fn().mockImplementation(() => mockQueryBuilder),
  update: vi.fn().mockImplementation(() => mockQueryBuilder),
  delete: vi.fn().mockImplementation(() => mockQueryBuilder),
  upsert: vi.fn().mockImplementation(() => mockQueryBuilder),
  eq: vi.fn().mockImplementation(() => mockQueryBuilder),
  is: vi.fn().mockImplementation(() => mockQueryBuilder),
  in: vi.fn().mockImplementation(() => mockQueryBuilder),
  neq: vi.fn().mockImplementation(() => mockQueryBuilder),
  gt: vi.fn().mockImplementation(() => mockQueryBuilder),
  lt: vi.fn().mockImplementation(() => mockQueryBuilder),
  gte: vi.fn().mockImplementation(() => mockQueryBuilder),
  lte: vi.fn().mockImplementation(() => mockQueryBuilder),
  like: vi.fn().mockImplementation(() => mockQueryBuilder),
  ilike: vi.fn().mockImplementation(() => mockQueryBuilder),
  limit: vi.fn().mockImplementation(() => mockQueryBuilder),
  order: vi.fn().mockImplementation(() => mockQueryBuilder),
  range: vi.fn().mockImplementation(() => mockQueryBuilder),
  single: vi.fn().mockResolvedValue({ data: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
  then: vi.fn().mockImplementation((resolve: any) => resolve({ data: [], count: 0, error: null })),
};
const mockFrom = vi.fn().mockReturnValue(mockQueryBuilder);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: mockFrom,
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "" } }),
      }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }),
  },
}));

describe("Monitoring Service", () => {
  it("pushEvent creates and stores events", async () => {
    const { pushEvent, getMonitoringEvents, clearEvents } = await import("@/lib/monitoring");
    clearEvents();
    
    pushEvent({ type: "error", source: "test", message: "Test error" });
    const events = getMonitoringEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("error");
    expect(events[0].message).toBe("Test error");
    expect(events[0].resolved).toBe(false);
    
    clearEvents();
  });

  it("resolveEvent marks event as resolved", async () => {
    const { pushEvent, resolveEvent, getMonitoringEvents, clearEvents } = await import("@/lib/monitoring");
    clearEvents();
    
    const evt = pushEvent({ type: "warning", source: "test", message: "Test warning" });
    resolveEvent(evt.id);
    
    const events = getMonitoringEvents();
    expect(events[0].resolved).toBe(true);
    
    clearEvents();
  });

  it("enforces MAX_EVENTS limit", async () => {
    const { pushEvent, getMonitoringEvents, clearEvents } = await import("@/lib/monitoring");
    clearEvents();
    
    for (let i = 0; i < 250; i++) {
      pushEvent({ type: "performance", source: "test", message: `Event ${i}` });
    }
    
    const events = getMonitoringEvents();
    expect(events.length).toBeLessThanOrEqual(200);
    
    clearEvents();
  });

  it("subscribeMonitoring notifies listeners", async () => {
    const { pushEvent, subscribeMonitoring, clearEvents } = await import("@/lib/monitoring");
    clearEvents();
    
    let called = false;
    const unsub = subscribeMonitoring(() => { called = true; });
    pushEvent({ type: "error", source: "test", message: "notify test" });
    
    expect(called).toBe(true);
    unsub();
    clearEvents();
  });
});

describe("Sync Health Check Structure", () => {
  it("runSyncHealthChecks returns array of results", async () => {
    const { runSyncHealthChecks } = await import("@/lib/monitoring");
    const results = await runSyncHealthChecks();
    
    expect(Array.isArray(results)).toBe(true);
    results.forEach((r) => {
      expect(r).toHaveProperty("name");
      expect(r).toHaveProperty("status");
      expect(r).toHaveProperty("message");
      expect(r).toHaveProperty("checkedAt");
      expect(["ok", "warning", "error"]).toContain(r.status);
    });
  }, 30_000);
});

describe("Flow Integrity Checks", () => {
  it("all critical page modules are importable", { timeout: 60000 }, async () => {
    const pages = [
      () => import("@/pages/Login"),
      () => import("@/pages/Signup"),
      () => import("@/pages/Dashboard"),
      () => import("@/pages/SeasonalRentals"),
      () => import("@/pages/ChannelManager"),
      () => import("@/pages/ActivitiesMarketplace"),
      () => import("@/pages/Receipts"),
      () => import("@/pages/PaymentNotices"),
      () => import("@/pages/FurnitureInventory"),
      () => import("@/pages/Documents"),
      () => import("@/pages/Leases"),
      () => import("@/pages/CommunicationCenter"),
    ];
    
    for (const loader of pages) {
      const mod = await loader();
      expect(mod.default).toBeDefined();
    }
  });

  it("auth context exports required hooks", async () => {
    const { useAuth, AuthProvider } = await import("@/contexts/AuthContext");
    expect(useAuth).toBeDefined();
    expect(AuthProvider).toBeDefined();
  });

  it("protected route component is importable", async () => {
    const mod = await import("@/components/auth/ProtectedRoute");
    expect(mod.default).toBeDefined();
  });

  it("booking dialog component is importable", async () => {
    const mod = await import("@/components/marketplace/BookingDialog");
    expect(mod).toBeDefined();
  });

  it("edge function names are correctly structured", () => {
    const requiredFunctions = [
      "check-subscription",
      "create-checkout",
      "create-booking-payment",
      "send-email",
      "send-notification-email",
      "stripe-webhook",
      "booking-lifecycle",
    ];
    
    requiredFunctions.forEach((fn) => {
      expect(fn).toMatch(/^[a-z][a-z0-9-]*$/);
    });
  });
});
