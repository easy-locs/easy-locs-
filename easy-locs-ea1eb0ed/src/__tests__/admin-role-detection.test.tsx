/**
 * Task #857 — Admin role detection contract: sidebar ↔ route guard.
 *
<<<<<<< HEAD
 * Task #856 introduced `useIsAdmin` as the single source of truth for admin
 * status. The dashboard sidebar (`DashboardLayout`) and the `AdminRoute`
 * route guard now both consume that hook. These tests pin the contract so a
 * future refactor cannot silently reintroduce the original split-brain bug:
 *
 *   • admin user  → sidebar shows the Admin section AND `/admin` renders
 *                   the protected children;
 *   • non-admin   → sidebar hides the Admin section AND `/admin` renders
 *                   the `AdminAccessDenied` panel (NOT a silent redirect);
 *
 * The hook's own per-user-id refetch behaviour is covered separately in
 * `useIsAdmin.test.tsx`.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
=======
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
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)

const useAuthMock = vi.fn();
const useAuthSessionMock = vi.fn();
const useAuthProfileMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
  useAuthSession: () => useAuthSessionMock(),
  useAuthProfile: () => useAuthProfileMock(),
}));

<<<<<<< HEAD
const useIsAdminMock = vi.fn();
vi.mock("@/hooks/useIsAdmin", () => ({
  useIsAdmin: () => useIsAdminMock(),
}));

vi.mock("@/lib/i18n", () => ({
=======
// ── Mocks: sidebar side (DashboardLayout's heavy deps) ─────────────────────
vi.mock("@/lib/i18n", () => ({
  // Return `undefined` so DashboardLayout's `t("...") || "Fallback"` pattern
  // resolves to the English fallback strings the tests assert against.
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)
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

<<<<<<< HEAD
import AdminRoute from "@/components/auth/AdminRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const ALLOWED_EMAIL = "habboujabir@gmail.com";

const baseSession = {
  user: { id: "u1", email: ALLOWED_EMAIL },
=======
// ── Imports under test (after mocks above) ─────────────────────────────────
import AdminRoute from "@/components/auth/AdminRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const baseSession = {
  user: { id: "u1" },
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)
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

<<<<<<< HEAD
function makeAuth(overrides: { userId?: string | null; email?: string } = {}) {
  const userId = overrides.userId === undefined ? "u1" : overrides.userId;
  const user = userId
    ? { id: userId, email: overrides.email ?? ALLOWED_EMAIL, user_metadata: {} }
=======
function makeAuth(overrides: {
  userId?: string | null;
  plan?: string;
  metaRole?: string;
}) {
  const userId = overrides.userId === undefined ? "u1" : overrides.userId;
  const user = userId
    ? { id: userId, user_metadata: { role: overrides.metaRole ?? "" } }
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)
    : null;
  return {
    user,
    session: null,
    loading: false,
    profileLoaded: true,
    emailVerified: true,
    signOut: vi.fn(),
<<<<<<< HEAD
    subscription: { plan: "free", loading: false, subscribed: false },
=======
    subscription: { plan: overrides.plan ?? "free", loading: false, subscribed: false },
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)
    activeRole: "landlord",
    hasDualRole: false,
    switchRole: vi.fn(),
    orgId: null,
    allOrgs: [],
    switchOrg: vi.fn(),
  };
}

<<<<<<< HEAD
function withProviders(ui: ReactNode, initialEntry: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

function renderAdminRoute() {
  return render(
    withProviders(
=======
function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin/protected"]}>
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)
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
<<<<<<< HEAD
        <Route path="/login" element={<div data-testid="login">LOGIN</div>} />
      </Routes>,
      "/admin/protected",
    ),
=======
        <Route path="/login" element={<div>LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)
  );
}

function renderSidebar() {
  return render(
<<<<<<< HEAD
    withProviders(
      <Routes>
        <Route
          path="/dashboard"
          element={<DashboardLayout><div>page</div></DashboardLayout>}
        />
      </Routes>,
      "/dashboard",
    ),
=======
    <MemoryRouter initialEntries={["/dashboard"]}>
      <DashboardLayout>
        <div>page</div>
      </DashboardLayout>
    </MemoryRouter>,
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)
  );
}

beforeEach(() => {
<<<<<<< HEAD
  useAuthMock.mockReset();
  useAuthSessionMock.mockReset();
  useAuthProfileMock.mockReset();
  useIsAdminMock.mockReset();
=======
  hasRoleMock.mockReset();
  useAuthMock.mockReset();
  useAuthSessionMock.mockReset();
  useAuthProfileMock.mockReset();
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)
  useAuthProfileMock.mockReturnValue(baseProfile);
});

describe("admin role detection — sidebar/route-guard contract", () => {
  describe("admin user", () => {
    beforeEach(() => {
<<<<<<< HEAD
      useAuthMock.mockReturnValue(makeAuth());
      useAuthSessionMock.mockReturnValue(baseSession);
      useIsAdminMock.mockReturnValue({
        isAdmin: true,
        isLoading: false,
        isFetched: true,
      });
=======
      useAuthMock.mockReturnValue(makeAuth({ plan: "admin" }));
      useAuthSessionMock.mockReturnValue(baseSession);
      hasRoleMock.mockResolvedValue(true);
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)
    });

    it("sidebar shows the admin-only links", () => {
      renderSidebar();
<<<<<<< HEAD
=======
      // The admin-only group is appended inside the Settings section.
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)
      expect(screen.getByText(/system audit/i)).toBeInTheDocument();
      expect(screen.getByText(/runtime audit/i)).toBeInTheDocument();
      expect(screen.getByText(/master debug/i)).toBeInTheDocument();
    });

    it("AdminRoute renders the protected children", async () => {
      renderAdminRoute();
      await waitFor(() =>
        expect(screen.getByTestId("admin-children")).toBeInTheDocument(),
      );
<<<<<<< HEAD
      expect(screen.queryByText(/accès admin requis/i)).not.toBeInTheDocument();
=======
      expect(screen.queryByTestId("dashboard")).not.toBeInTheDocument();
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)
    });
  });

  describe("non-admin user", () => {
    beforeEach(() => {
<<<<<<< HEAD
      useAuthMock.mockReturnValue(makeAuth({ email: "not-allowed@example.com" }));
      useAuthSessionMock.mockReturnValue({
        ...baseSession,
        user: { id: "u1", email: "not-allowed@example.com" },
      });
      useIsAdminMock.mockReturnValue({
        isAdmin: false,
        isLoading: false,
        isFetched: true,
      });
=======
      useAuthMock.mockReturnValue(makeAuth({ plan: "free", metaRole: "" }));
      useAuthSessionMock.mockReturnValue(baseSession);
      hasRoleMock.mockResolvedValue(false);
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)
    });

    it("sidebar hides the admin-only links", () => {
      renderSidebar();
      expect(screen.queryByText(/system audit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/runtime audit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/master debug/i)).not.toBeInTheDocument();
    });

<<<<<<< HEAD
    it("AdminRoute renders the access-denied panel (not a silent redirect)", async () => {
      renderAdminRoute();
      // The shared AdminAccessDenied panel must mount in place — children
      // must NOT mount and the user must NOT have been silently bounced
      // to /dashboard (which was the previous, confusing behaviour).
      await waitFor(() =>
        expect(screen.getByText(/accès admin requis/i)).toBeInTheDocument(),
      );
      expect(screen.queryByTestId("admin-children")).not.toBeInTheDocument();
      expect(screen.queryByTestId("dashboard")).not.toBeInTheDocument();
    });
  });

  describe("loading state", () => {
    it("AdminRoute shows neither children nor the denied panel while the role check is pending", () => {
      useAuthMock.mockReturnValue(makeAuth());
      useAuthSessionMock.mockReturnValue(baseSession);
      useIsAdminMock.mockReturnValue({
        isAdmin: false,
        isLoading: true,
        isFetched: false,
      });
      renderAdminRoute();
      expect(screen.queryByText(/accès admin requis/i)).not.toBeInTheDocument();
      expect(screen.queryByTestId("admin-children")).not.toBeInTheDocument();
=======
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
>>>>>>> 2641eee74 (Task #857: Add automated tests for admin role detection across sidebar and route guard)
    });
  });
});
