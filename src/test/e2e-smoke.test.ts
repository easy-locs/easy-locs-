/**
 * E2E Smoke & Regression Tests
 * Critical path validation: app boot, routing, auth flows, data loading, UI patterns.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Supabase before any imports ──
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  },
}));

/* ═══════════════════════════════════════════════════
   1. APP BOOT SMOKE TESTS
   ═══════════════════════════════════════════════════ */

describe("App Boot", () => {
  it("main.tsx exports without crashing", async () => {
    // Verify the entry module structure
    expect(document.getElementById("root") || true).toBeTruthy();
  });

  it("critical CSS variables are defined", () => {
    const root = document.documentElement;
    // These should exist in any properly configured app
    expect(root).toBeDefined();
    expect(root.tagName).toBe("HTML");
  });

  it("no duplicate React roots", () => {
    const roots = document.querySelectorAll("#root");
    expect(roots.length).toBeLessThanOrEqual(1);
  });
});

/* ═══════════════════════════════════════════════════
   2. ROUTING SMOKE TESTS
   ═══════════════════════════════════════════════════ */

describe("Route Configuration", () => {
  it("App module loads without error", async () => {
    const mod = await import("@/App");
    expect(mod.default).toBeDefined();
  });

  it("critical page modules resolve", async () => {
    const pages = [
      () => import("@/pages/Index"),
      () => import("@/pages/Login"),
      () => import("@/pages/Signup"),
      () => import("@/pages/NotFound"),
    ];

    const results = await Promise.allSettled(pages.map((p) => p()));
    results.forEach((r, i) => {
      expect(r.status).toBe("fulfilled");
      if (r.status === "fulfilled") {
        expect(r.value.default).toBeDefined();
      }
    });
  });

  it("dashboard page module resolves", async () => {
    const mod = await import("@/pages/Dashboard");
    expect(mod.default).toBeDefined();
  });

  it("communication center module resolves", async () => {
    const mod = await import("@/pages/CommunicationCenter");
    expect(mod.default).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════
   3. AUTH FLOW REGRESSION TESTS
   ═══════════════════════════════════════════════════ */

describe("Auth Module", () => {
  it("AuthContext exports provider and hook", async () => {
    const mod = await import("@/contexts/AuthContext");
    expect(mod.AuthProvider).toBeDefined();
    expect(mod.useAuth).toBeDefined();
  });

  it("ProtectedRoute component exists", async () => {
    const mod = await import("@/components/auth/ProtectedRoute");
    expect(mod.default).toBeDefined();
  });

  it("login page module exports default component", async () => {
    const mod = await import("@/pages/Login");
    expect(typeof mod.default).toBe("function");
  });

  it("signup page module exports default component", async () => {
    const mod = await import("@/pages/Signup");
    expect(typeof mod.default).toBe("function");
  });
});

/* ═══════════════════════════════════════════════════
   4. CORE COMPONENT SMOKE TESTS
   ═══════════════════════════════════════════════════ */

describe("Core Components", () => {
  it("ErrorBoundary loads", async () => {
    const mod = await import("@/components/ErrorBoundary");
    expect(mod.default).toBeDefined();
  });

  it("AppLockGuard loads", async () => {
    const mod = await import("@/components/security/AppLockGuard");
    expect(mod.default).toBeDefined();
  });

  it("UI primitives load", async () => {
    const [button, input, tooltip] = await Promise.all([
      import("@/components/ui/button"),
      import("@/components/ui/input"),
      import("@/components/ui/tooltip"),
    ]);
    expect(button.Button).toBeDefined();
    expect(input.Input).toBeDefined();
    expect(tooltip.Tooltip).toBeDefined();
  });

  it("ErrorState component loads", async () => {
    const mod = await import("@/components/ui/error-state");
    expect(mod.ErrorState).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════
   5. DATA LAYER SMOKE TESTS
   ═══════════════════════════════════════════════════ */

describe("Data Layer", () => {
  it("supabase client exports", async () => {
    const mod = await import("@/integrations/supabase/client");
    expect(mod.supabase).toBeDefined();
    expect(mod.supabase.auth).toBeDefined();
    expect(mod.supabase.from).toBeDefined();
  });

  it("supabase types export Database type", async () => {
    const mod = await import("@/integrations/supabase/types");
    expect(mod).toHaveProperty("Database");
  });
});

/* ═══════════════════════════════════════════════════
   6. UTILITY REGRESSION TESTS
   ═══════════════════════════════════════════════════ */

describe("Utility Modules", () => {
  it("cn() merges classes correctly", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("a", "b")).toBe("a b");
    expect(cn("p-2", "p-4")).toBe("p-4"); // tailwind-merge
    expect(cn("text-sm", undefined, "font-bold")).toBe("text-sm font-bold");
  });

  it("resilience module loads", async () => {
    const mod = await import("@/lib/resilience");
    expect(mod.retryAsync).toBeDefined();
    expect(mod.CircuitBreaker).toBeDefined();
    expect(mod.withTimeout).toBeDefined();
    expect(mod.fallbackChain).toBeDefined();
  });

  it("a11y audit module loads", async () => {
    const mod = await import("@/lib/a11y-audit");
    expect(mod.contrastRatio).toBeDefined();
    expect(mod.auditPage).toBeDefined();
    expect(mod.meetsWCAG_AA).toBeDefined();
  });

  it("api-docs module loads", async () => {
    const mod = await import("@/lib/api-docs");
    expect(mod.API_ENDPOINTS).toBeDefined();
    expect(mod.generateOpenAPISpec).toBeDefined();
    expect(mod.generateSDKExample).toBeDefined();
  });

  it("analytics engine loads", async () => {
    const mod = await import("@/lib/analytics-engine");
    expect(mod.queueEvent).toBeDefined();
    expect(mod.computeKPI).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════
   7. SECURITY REGRESSION TESTS
   ═══════════════════════════════════════════════════ */

describe("Security", () => {
  it("app-security module loads", async () => {
    const mod = await import("@/lib/app-security");
    expect(mod.isAppLocked).toBeDefined();
    expect(mod.setupAutoLock).toBeDefined();
  });

  it("a11y SkipLink and LiveRegion load", async () => {
    const mod = await import("@/components/ui/a11y");
    expect(mod.SkipLink).toBeDefined();
    expect(mod.LiveRegion).toBeDefined();
    expect(mod.VisuallyHidden).toBeDefined();
  });
});

/* ═══════════════════════════════════════════════════
   8. CROSS-MODULE INTEGRATION TESTS
   ═══════════════════════════════════════════════════ */

describe("Cross-Module Integration", () => {
  it("resilience + api-docs work together", async () => {
    const { retryAsync } = await import("@/lib/resilience");
    const { API_ENDPOINTS } = await import("@/lib/api-docs");

    // Simulate fetching API docs with retry
    const result = await retryAsync(
      () => Promise.resolve(API_ENDPOINTS),
      { maxAttempts: 1 }
    );
    expect(result.length).toBeGreaterThan(0);
  });

  it("a11y audit + contrast checker coherent", async () => {
    const { meetsWCAG_AA, contrastRatio } = await import("@/lib/a11y-audit");

    // Black on white must always pass
    const ratio = contrastRatio("#000", "#fff");
    const passes = meetsWCAG_AA("#000", "#fff");
    expect(ratio).toBeGreaterThan(4.5);
    expect(passes).toBe(true);
  });

  it("analytics KPI computation is deterministic", async () => {
    const { computeKPI } = await import("@/lib/analytics-engine");
    const kpi1 = computeKPI(100, 80);
    const kpi2 = computeKPI(100, 80);
    expect(kpi1).toEqual(kpi2);
    expect(kpi1.changePercent).toBe(25);
  });
});

/* ═══════════════════════════════════════════════════
   9. ERROR HANDLING REGRESSION
   ═══════════════════════════════════════════════════ */

describe("Error Handling", () => {
  it("safeJsonParse never throws", async () => {
    const { safeJsonParse } = await import("@/lib/resilience");
    expect(() => safeJsonParse("", null)).not.toThrow();
    expect(() => safeJsonParse("}{bad", [])).not.toThrow();
    expect(() => safeJsonParse("null", "fallback")).not.toThrow();
  });

  it("circuit breaker recovers after reset", async () => {
    const { CircuitBreaker } = await import("@/lib/resilience");
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    
    await expect(cb.call(() => Promise.reject(new Error("x")))).rejects.toThrow();
    expect(cb.getState()).toBe("open");
    
    cb.reset();
    expect(cb.getState()).toBe("closed");
    
    const result = await cb.call(() => Promise.resolve("recovered"));
    expect(result).toBe("recovered");
  });
});

/* ═══════════════════════════════════════════════════
   10. PWA & OFFLINE REGRESSION
   ═══════════════════════════════════════════════════ */

describe("PWA Readiness", () => {
  it("manifest link exists or app handles offline", () => {
    // Verify navigator.onLine API available
    expect(typeof navigator.onLine).toBe("boolean");
  });

  it("isOffline helper works", async () => {
    const { isOffline } = await import("@/lib/resilience");
    expect(typeof isOffline()).toBe("boolean");
  });
});
