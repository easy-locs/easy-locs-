/**
 * Task #857 — Admin role detection contract: sidebar ↔ route guard.
 *
 * The dashboard sidebar renders an admin-only group of links (System Audit
 * / Runtime Audit / Master Debug) and the `/admin/*` routes are wrapped by
 * AdminRoute. The historical bug was that these two surfaces disagreed: the
 * sidebar would advertise an admin link that the route guard then rejected,
 * or vice-versa. These tests pin the contract:
 *
 *   • admin user  → sidebar shows the Admin section AND AdminRoute renders
 *                   the protected children;
 *   • non-admin   → sidebar hides the Admin section AND AdminRoute does NOT
 *                   render the protected children (it bounces them);
 *   • the route guard re-evaluates the role check when the user id changes
 *     (sign-in / sign-out / account switch) — so a stale "yes" cannot leak
 *     into a new session.
 *
 * NOTE: AdminRoute today uses a silent `<Navigate to="/dashboard" replace />`
 * for non-admins rather than an in-place access-denied panel. The non-admin
 * assertions check the route gate's externally-visible behaviour (children
 * never mount and the user lands on /dashboard), which is the property that
 * matters for the sidebar/route-guard contract.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// ── Mocks: route-guard side ────────────────────────────────────────────────
const hasRoleMock = vi.fn();
vi.mock("@/repositories/auth-utils.repository", () => ({
  hasRole: (...args: unknown[]) => hasRoleMock(...args),
}));

const useAuthMock = vi.fn();
const useAuthSessionMock = vi.fn();
const useAuthProfileMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
  useAuthSession: () => useAuthSessionMock(),
  useAuthProfile: () => useAuthProfileMock(),
}));

// ── Mocks: sidebar side (DashboardLayout's heavy deps) ─────────────────────
vi.mock("@/lib/i18n", () => ({
  // Return `undefined` so DashboardLayout's `t("...") || "Fallback"` pattern
  // resolves to the English fallback strings the tests assert against.
  useI18n: () => ({ t: () => undefined as unknown as string }),
}));
vi.mock("@/hooks/useSubscriptionGating", () => ({
  useSubscriptionGating: () => ({ currentTier: "free", isSubscribed: false }),
}));
vi.mock("@/hooks/useCountryContext", () => ({
  useCountryContext: () => null,
  appendCountryToPath: (p: string) => p,
  isGlobalPage: () => true,
}));
vi.mock("@/lib/global-country-registry", () => ({
  getCountryEntryOrDefault: () => null,
}));
vi.mock("@/components/AppLogo", () => ({ default: () => <div /> }));
vi.mock("@/components/notifications/NotificationBell", () => ({
  default: () => <div />,
}));
vi.mock("@/components/ThemeSwitcher", () => ({ default: () => <div /> }));
vi.mock("@/components/communication-hub/HubQuickAccess", () => ({
  default: () => <div />,
}));

// ── Imports under test (after mocks above) ─────────────────────────────────
import AdminRoute from "@/components/auth/AdminRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const baseSession = {
  user: { id: "u1" },
  loading: false,
  profileLoaded: true,
  emailVerified: true,
  session: null,
};

const baseProfile = {
  orgId: null,
  allOrgs: [],
  userType: "landlord" as const,
  userCountry: "FR",
  userCurrency: "EUR",
  onboardingCompleted: true,
  subscription: { plan: "free", loading: false, subscribed: false },
};

function makeAuth(overrides: {
  userId?: string | null;
  plan?: string;
  metaRole?: string;
}) {
  const userId = overrides.userId === undefined ? "u1" : overrides.userId;
  const user = userId
    ? { id: userId, user_metadata: { role: overrides.metaRole ?? "" } }
    : null;
  return {
    user,
    session: null,
    loading: false,
    profileLoaded: true,
    emailVerified: true,
    signOut: vi.fn(),
    subscription: { plan: overrides.plan ?? "free", loading: false, subscribed: false },
    activeRole: "landlord",
    hasDualRole: false,
    switchRole: vi.fn(),
    orgId: null,
    allOrgs: [],
    switchOrg: vi.fn(),
  };
}

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin/protected"]}>
      <Routes>
        <Route
          path="/admin/protected"
          element={
            <AdminRoute>
              <div data-testid="admin-children">ADMIN_AREA</div>
            </AdminRoute>
          }
        />
        <Route path="/dashboard" element={<div data-testid="dashboard">DASHBOARD</div>} />
        <Route path="/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <DashboardLayout>
        <div>page</div>
      </DashboardLayout>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  hasRoleMock.mockReset();
  useAuthMock.mockReset();
  useAuthSessionMock.mockReset();
  useAuthProfileMock.mockReset();
  useAuthProfileMock.mockReturnValue(baseProfile);
});

describe("admin role detection — sidebar/route-guard contract", () => {
  describe("admin user", () => {
    beforeEach(() => {
      useAuthMock.mockReturnValue(makeAuth({ plan: "admin" }));
      useAuthSessionMock.mockReturnValue(baseSession);
      hasRoleMock.mockResolvedValue(true);
    });

    it("sidebar shows the admin-only links", () => {
      renderSidebar();
      // The admin-only group is appended inside the Settings section.
      expect(screen.getByText(/system audit/i)).toBeInTheDocument();
      expect(screen.getByText(/runtime audit/i)).toBeInTheDocument();
      expect(screen.getByText(/master debug/i)).toBeInTheDocument();
    });

    it("AdminRoute renders the protected children", async () => {
      renderAdminRoute();
      await waitFor(() =>
        expect(screen.getByTestId("admin-children")).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("dashboard")).not.toBeInTheDocument();
    });
  });

  describe("non-admin user", () => {
    beforeEach(() => {
      useAuthMock.mockReturnValue(makeAuth({ plan: "free", metaRole: "" }));
      useAuthSessionMock.mockReturnValue(baseSession);
      hasRoleMock.mockResolvedValue(false);
    });

    it("sidebar hides the admin-only links", () => {
      renderSidebar();
      expect(screen.queryByText(/system audit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/runtime audit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/master debug/i)).not.toBeInTheDocument();
    });

    it("AdminRoute does NOT render the protected children (route gate bounces the user)", async () => {
      renderAdminRoute();
      // The gate must land the user on /dashboard and never mount the
      // protected subtree — a silent leak would mean the route gate is
      // disagreeing with the sidebar's hidden admin links.
      await waitFor(() =>
        expect(screen.getByTestId("dashboard")).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("admin-children")).not.toBeInTheDocument();
    });
  });

  describe("re-evaluation when the user id changes", () => {
    it("AdminRoute re-checks the role when a new user signs in", async () => {
      // First mount: non-admin user u1 → no children.
      useAuthMock.mockReturnValue(makeAuth({ userId: "u1" }));
      useAuthSessionMock.mockReturnValue({ ...baseSession, user: { id: "u1" } });
      hasRoleMock.mockResolvedValue(false);

      const first = renderAdminRoute();
      await waitFor(() =>
        expect(screen.getByTestId("dashboard")).toBeInTheDocument(),
      );
      expect(hasRoleMock).toHaveBeenCalledWith("u1", "admin");
      const callsAfterFirst = hasRoleMock.mock.calls.length;
      first.unmount();
      cleanup();

      // Second mount under a different user id (account switch / sign-in)
      // → the hook MUST re-issue the RPC against the new id and now grant
      //   access. A stale cached "no" would silently keep the user out.
      useAuthMock.mockReturnValue(makeAuth({ userId: "u2", plan: "admin" }));
      useAuthSessionMock.mockReturnValue({ ...baseSession, user: { id: "u2" } });
      hasRoleMock.mockResolvedValue(true);

      renderAdminRoute();
      await waitFor(() =>
        expect(screen.getByTestId("admin-children")).toBeInTheDocument(),
      );
      expect(hasRoleMock).toHaveBeenCalledWith("u2", "admin");
      expect(hasRoleMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    });

    it("AdminRoute does not render protected children after sign-out", async () => {
      // Admin signed in → children render.
      useAuthMock.mockReturnValue(makeAuth({ userId: "u1", plan: "admin" }));
      useAuthSessionMock.mockReturnValue({ ...baseSession, user: { id: "u1" } });
      hasRoleMock.mockResolvedValue(true);

      const first = renderAdminRoute();
      await waitFor(() =>
        expect(screen.getByTestId("admin-children")).toBeInTheDocument(),
      );
      first.unmount();
      cleanup();

      // Signed out (user = null) → the gate must NOT render children even
      // though the previous mount resolved to admin.
      useAuthMock.mockReturnValue(makeAuth({ userId: null }));
      useAuthSessionMock.mockReturnValue({ ...baseSession, user: null });
      hasRoleMock.mockResolvedValue(true); // would falsely grant if id leaked

      renderAdminRoute();
      await waitFor(() =>
        expect(screen.queryByTestId("admin-children")).not.toBeInTheDocument(),
      );
    });
  });
});
