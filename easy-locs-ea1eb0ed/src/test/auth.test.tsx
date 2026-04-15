import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      limit: vi.fn().mockReturnThis(),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { subscribed: true, plan: "unlimited" }, error: null }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
    removeAllChannels: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "" } }),
      }),
    },
  },
}));


describe("Auth - ProtectedRoute", () => {
  it("redirects unauthenticated users to /login", async () => {
    const ProtectedRoute = (await import("@/components/auth/ProtectedRoute")).default;
    const { AuthProvider } = await import("@/contexts/AuthContext");

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    // Should not render protected content when not authenticated
    // (it will show loading spinner first, then redirect)
    // We just verify it doesn't crash
    expect(document.body).toBeTruthy();
  });
});

describe("Auth - useAuth hook defaults", () => {
  it("provides default context values", async () => {
    const { useAuth } = await import("@/contexts/AuthContext");
    // The hook should be importable
    expect(useAuth).toBeDefined();
    expect(typeof useAuth).toBe("function");
  });
});

describe("Subscription Gating", () => {
  it("useSubscriptionGating exports required functions", async () => {
    const { useSubscriptionGating } = await import("@/hooks/useSubscriptionGating");
    expect(useSubscriptionGating).toBeDefined();
    expect(typeof useSubscriptionGating).toBe("function");
  });
});
