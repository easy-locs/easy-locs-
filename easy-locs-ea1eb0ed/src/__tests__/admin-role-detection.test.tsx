/**
 * Task #857 — Admin role detection contract: sidebar ↔ route guard.
 *
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

const useAuthMock = vi.fn();
const useAuthSessionMock = vi.fn();
const useAuthProfileMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
  useAuthSession: () => useAuthSessionMock(),
  useAuthProfile: () => useAuthProfileMock(),
}));

const useIsAdminMock = vi.fn();
vi.mock("@/hooks/useIsAdmin", () => ({
  useIsAdmin: () => useIsAdminMock(),
}));

vi.mock("@/lib/i18n", () => ({
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

import AdminRoute from "@/components/auth/AdminRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const ALLOWED_EMAIL = "habboujabir@gmail.com";

const baseSession = {
  user: { id: "u1", email: ALLOWED_EMAIL },
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

function makeAuth(overrides: { userId?: string | null; email?: string } = {}) {
  const userId = overrides.userId === undefined ? "u1" : overrides.userId;
  const user = userId
    ? { id: userId, email: overrides.email ?? ALLOWED_EMAIL, user_metadata: {} }
    : null;
  return {
    user,
    session: null,
    loading: false,
    profileLoaded: true,
    emailVerified: true,
    signOut: vi.fn(),
    subscription: { plan: "free", loading: false, subscribed: false },
    activeRole: "landlord",
    hasDualRole: false,
    switchRole: vi.fn(),
    orgId: null,
    allOrgs: [],
    switchOrg: vi.fn(),
  };
}

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
        <Route path="/login" element={<div data-testid="login">LOGIN</div>} />
      </Routes>,
      "/admin/protected",
    ),
  );
}

function renderSidebar() {
  return render(
    withProviders(
      <Routes>
        <Route
          path="/dashboard"
          element={<DashboardLayout><div>page</div></DashboardLayout>}
        />
      </Routes>,
      "/dashboard",
    ),
  );
}

beforeEach(() => {
  useAuthMock.mockReset();
  useAuthSessionMock.mockReset();
  useAuthProfileMock.mockReset();
  useIsAdminMock.mockReset();
  useAuthProfileMock.mockReturnValue(baseProfile);
});

describe("admin role detection — sidebar/route-guard contract", () => {
  describe("admin user", () => {
    beforeEach(() => {
      useAuthMock.mockReturnValue(makeAuth());
      useAuthSessionMock.mockReturnValue(baseSession);
      useIsAdminMock.mockReturnValue({
        isAdmin: true,
        isLoading: false,
        isFetched: true,
      });
    });

    it("sidebar shows the admin-only links", () => {
      renderSidebar();
      expect(screen.getByText(/system audit/i)).toBeInTheDocument();
      expect(screen.getByText(/runtime audit/i)).toBeInTheDocument();
      expect(screen.getByText(/master debug/i)).toBeInTheDocument();
    });

    it("AdminRoute renders the protected children", async () => {
      renderAdminRoute();
      await waitFor(() =>
        expect(screen.getByTestId("admin-children")).toBeInTheDocument(),
      );
      expect(screen.queryByText(/accès admin requis/i)).not.toBeInTheDocument();
    });
  });

  describe("non-admin user", () => {
    beforeEach(() => {
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
    });

    it("sidebar hides the admin-only links", () => {
      renderSidebar();
      expect(screen.queryByText(/system audit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/runtime audit/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/master debug/i)).not.toBeInTheDocument();
    });

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
    });
  });
});
