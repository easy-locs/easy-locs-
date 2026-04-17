/**
 * L4 — /admin/agents cockpit (#813) · route-level role gate.
 *
 * The cockpit is super-admin-only. The render path goes through
 * SuperAdminGate — these tests assert the negative path (admin without
 * super_admin) is bounced and the positive path renders the cockpit
 * scaffold. The agents repo and Supabase client are stubbed out so the
 * test exercises only the gate + route wiring.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const hasRoleMock = vi.fn();
vi.mock("@/repositories/auth-utils.repository", () => ({
  hasRole: (...args: unknown[]) => hasRoleMock(...args),
}));

const useAuthSessionMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuthSession: () => useAuthSessionMock(),
}));

vi.mock("@/hooks/useUiEngine", () => ({ useUiEngine: () => undefined }));
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: () => undefined }),
}));

vi.mock("@/lib/admin/agents-repo", () => ({
  agentsRepo: {
    listAgents: vi.fn(async () => []),
    listAgentRuns: vi.fn(async () => []),
    listAgentEvents: vi.fn(async () => []),
    setAgentStatus: vi.fn(async () => ({ ok: true })),
    getAgent: vi.fn(async () => null),
  },
}));

import SuperAdminGate from "@/components/auth/SuperAdminGate";
import AdminAgentsPage from "@/pages/admin/AdminAgentsPage";

function renderRoute() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/admin/agents"]}>
        <Routes>
          <Route
            path="/admin/agents"
            element={
              <SuperAdminGate>
                <AdminAgentsPage />
              </SuperAdminGate>
            }
          />
          <Route path="/login" element={<div>LOGIN</div>} />
          <Route path="/dashboard" element={<div>DASHBOARD</div>} />
          <Route path="/verify-email" element={<div>VERIFY_EMAIL</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  hasRoleMock.mockReset();
  useAuthSessionMock.mockReset();
});

describe("/admin/agents route gate", () => {
  it("redirects an authenticated non-super-admin away from the cockpit", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" },
      loading: false,
      profileLoaded: true,
      emailVerified: true,
    });
    hasRoleMock.mockResolvedValue(false);

    renderRoute();

    await waitFor(() =>
      expect(screen.getByText("DASHBOARD")).toBeInTheDocument(),
    );
    // The page heading must not have rendered.
    expect(screen.queryByText(/agents cockpit/i)).not.toBeInTheDocument();
  });

  it("renders the cockpit shell for a super-admin user", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" },
      loading: false,
      profileLoaded: true,
      emailVerified: true,
    });
    hasRoleMock.mockResolvedValue(true);

    renderRoute();

    // Empty-state copy of the cockpit page is the canonical "I made it
    // through the gate" signal — no agents are seeded for this test.
    await waitFor(() =>
      expect(
        screen.getByText(/no agents registered yet/i),
      ).toBeInTheDocument(),
    );
  });
});
