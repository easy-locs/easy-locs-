/**
 * Task #1049 — regression coverage for the `ProtectedRoute` profile-loaded
 * timeout fallback.
 *
 * Before the fix, `ProtectedRoute` rendered an `InlineSkeleton` for as long
 * as `profileLoaded` stayed `false`, with no upper bound. If profile
 * hydration in `AuthContext` stalled past its own 2s safety timeout (or a
 * state update was dropped after a `TOKEN_REFRESHED` / account swap) a
 * verified super admin would be trapped on a permanent skeleton at
 * `/dashboard`. The fix mirrors the `useProfileTimeout` pattern from
 * `AppRouters.tsx` so a stalled `profileLoaded` cannot trap the user
 * forever.
 *
 * Two assertions lock the fix:
 *   1. A verified user with `profileLoaded = true` renders children
 *      without redirecting (the happy path the audit confirms must work).
 *   2. A verified user whose `profileLoaded` never flips eventually
 *      escapes the skeleton via the 2s timeout fallback.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const useAuthSessionMock = vi.fn();
const useAuthProfileMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuthSession: () => useAuthSessionMock(),
  useAuthProfile: () => useAuthProfileMock(),
}));

vi.mock("@/hooks/useIsAdmin", () => ({
  useIsAdmin: () => ({
    isAdmin: true,
    isLoading: false,
    isFetched: true,
    denialReason: null,
    email: "habboujabir@gmail.com",
  }),
}));

vi.mock("@/components/auth/AdminAccessDenied", () => ({
  default: () => <div data-testid="admin-denied" />,
}));

import ProtectedRoute from "@/components/auth/ProtectedRoute";

const verifiedSession = {
  user: { id: "u-super-admin", email: "habboujabir@gmail.com" },
  session: {},
  loading: false,
  emailConfirmed: true,
  phoneVerified: false,
  profileLoaded: true,
};

const subscribedProfile = {
  subscription: { loading: false, subscribed: true },
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div data-testid="dashboard">DASHBOARD</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div data-testid="login" />} />
        <Route path="/verify-account" element={<div data-testid="verify" />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuthSessionMock.mockReset();
  useAuthProfileMock.mockReset();
  useAuthProfileMock.mockReturnValue(subscribedProfile);
});

describe("ProtectedRoute (task #1049)", () => {
  it("renders children for a verified user with a loaded profile (no silent redirect)", () => {
    useAuthSessionMock.mockReturnValue(verifiedSession);

    renderAt("/dashboard");

    expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("login")).toBeNull();
    expect(screen.queryByTestId("verify")).toBeNull();
  });

  it("falls back out of the skeleton after 2s when profileLoaded never flips", () => {
    vi.useFakeTimers();
    try {
      useAuthSessionMock.mockReturnValue({
        ...verifiedSession,
        profileLoaded: false,
      });

      renderAt("/dashboard");

      // Initially still in the skeleton — no dashboard yet.
      expect(screen.queryByTestId("dashboard")).toBeNull();

      // Advance past the 2s timeout fallback.
      act(() => {
        vi.advanceTimersByTime(2_001);
      });

      expect(screen.getByTestId("dashboard")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
