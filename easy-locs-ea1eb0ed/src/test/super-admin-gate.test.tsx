import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import React from "react";

const hasRoleMock = vi.fn();
vi.mock("@/repositories/auth-utils.repository", () => ({
  hasRole: (...args: unknown[]) => hasRoleMock(...args),
}));

const useAuthSessionMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuthSession: () => useAuthSessionMock(),
}));

import SuperAdminGate from "@/components/auth/SuperAdminGate";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/admin/super-dashboard"
          element={
            <SuperAdminGate>
              <div>SUPER_DASHBOARD</div>
            </SuperAdminGate>
          }
        />
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route path="/dashboard" element={<div>DASHBOARD</div>} />
        <Route path="/verify-email" element={<div>VERIFY_EMAIL</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  hasRoleMock.mockReset();
  useAuthSessionMock.mockReset();
});

describe("SuperAdminGate", () => {
  it("redirects unauthenticated users to /login", async () => {
    useAuthSessionMock.mockReturnValue({
      user: null, loading: false, profileLoaded: true, emailVerified: false,
    });
    renderAt("/admin/super-dashboard");
    await waitFor(() => expect(screen.getByText("LOGIN")).toBeInTheDocument());
  });

  it("redirects non-super-admin users to /dashboard", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" }, loading: false, profileLoaded: true, emailVerified: true,
    });
    hasRoleMock.mockResolvedValue(false);
    renderAt("/admin/super-dashboard");
    await waitFor(() => expect(screen.getByText("DASHBOARD")).toBeInTheDocument());
  });

  it("renders children for super admin users", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" }, loading: false, profileLoaded: true, emailVerified: true,
    });
    hasRoleMock.mockResolvedValue(true);
    renderAt("/admin/super-dashboard");
    await waitFor(() => expect(screen.getByText("SUPER_DASHBOARD")).toBeInTheDocument());
  });

  it("fails closed (redirects to /dashboard) when hasRole throws", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" }, loading: false, profileLoaded: true, emailVerified: true,
    });
    hasRoleMock.mockRejectedValue(new Error("rpc failure"));
    renderAt("/admin/super-dashboard");
    await waitFor(() => expect(screen.getByText("DASHBOARD")).toBeInTheDocument());
  });

  it("fails closed (redirects to /dashboard) when hasRole returns null", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" }, loading: false, profileLoaded: true, emailVerified: true,
    });
    hasRoleMock.mockResolvedValue(null as unknown as boolean);
    renderAt("/admin/super-dashboard");
    await waitFor(() => expect(screen.getByText("DASHBOARD")).toBeInTheDocument());
  });

  it("redirects to /verify-email when email is not verified", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" }, loading: false, profileLoaded: true, emailVerified: false,
    });
    hasRoleMock.mockResolvedValue(true);
    renderAt("/admin/super-dashboard");
    await waitFor(() => expect(screen.getByText("VERIFY_EMAIL")).toBeInTheDocument());
  });

  it("shows a timeout error when profileLoaded never becomes true", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" }, loading: false, profileLoaded: false, emailVerified: true,
    });
    hasRoleMock.mockResolvedValue(true);
    renderAt("/admin/super-dashboard");
    await waitFor(
      () => expect(screen.getByText(/took too long to load/i)).toBeInTheDocument(),
      { timeout: 10000, interval: 200 },
    );
  }, 15000);

  it("does not redirect when already on /dashboard (loop guard)", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" }, loading: false, profileLoaded: true, emailVerified: true,
    });
    hasRoleMock.mockResolvedValue(false);
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <SuperAdminGate>
                <div>SUPER_DASHBOARD</div>
              </SuperAdminGate>
            }
          />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() =>
      expect(screen.getByText(/don't have access/i)).toBeInTheDocument()
    );
  });
});
