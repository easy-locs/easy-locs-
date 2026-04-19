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
        <Route path="/verify-account" element={<div>VERIFY_ACCOUNT</div>} />
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
      user: null, loading: false, emailVerified: false,
    });
    renderAt("/admin/super-dashboard");
    await waitFor(() => expect(screen.getByText("LOGIN")).toBeInTheDocument());
  });

  it("shows AdminAccessDenied(super-admin-required) when role is false", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" }, loading: false, emailVerified: true,
    });
    hasRoleMock.mockResolvedValue(false);
    renderAt("/admin/super-dashboard");
    await waitFor(() =>
      expect(screen.getByTestId("admin-access-denied")).toBeInTheDocument()
    );
    expect(screen.getByTestId("admin-access-denied")).toHaveAttribute(
      "data-reason",
      "super-admin-required",
    );
  });

  it("renders children for super admin users", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" }, loading: false, emailVerified: true,
    });
    hasRoleMock.mockResolvedValue(true);
    renderAt("/admin/super-dashboard");
    await waitFor(() => expect(screen.getByText("SUPER_DASHBOARD")).toBeInTheDocument());
  });

  it("shows AdminAccessDenied(super-admin-rpc-error) when hasRole throws", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" }, loading: false, emailVerified: true,
    });
    hasRoleMock.mockRejectedValue(new Error("rpc failure"));
    renderAt("/admin/super-dashboard");
    await waitFor(() =>
      expect(screen.getByTestId("admin-access-denied")).toBeInTheDocument()
    );
    expect(screen.getByTestId("admin-access-denied")).toHaveAttribute(
      "data-reason",
      "super-admin-rpc-error",
    );
  });

  it("shows AdminAccessDenied(super-admin-required) when hasRole returns null", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" }, loading: false, emailVerified: true,
    });
    hasRoleMock.mockResolvedValue(null as unknown as boolean);
    renderAt("/admin/super-dashboard");
    await waitFor(() =>
      expect(screen.getByTestId("admin-access-denied")).toBeInTheDocument()
    );
    expect(screen.getByTestId("admin-access-denied")).toHaveAttribute(
      "data-reason",
      "super-admin-required",
    );
  });

  it("redirects to /verify-account when email is not verified", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" }, loading: false, emailVerified: false,
    });
    hasRoleMock.mockResolvedValue(true);
    renderAt("/admin/super-dashboard");
    await waitFor(() => expect(screen.getByText("VERIFY_ACCOUNT")).toBeInTheDocument());
  });

  it("shows AdminAccessDenied(super-admin-required) when user lacks the role", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1" }, loading: false, emailVerified: true,
    });
    hasRoleMock.mockResolvedValue(false);
    render(
      <MemoryRouter initialEntries={["/admin/super-dashboard"]}>
        <Routes>
          <Route
            path="/admin/super-dashboard"
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
      expect(screen.getByTestId("admin-access-denied")).toBeInTheDocument()
    );
    expect(screen.getByTestId("admin-access-denied")).toHaveAttribute(
      "data-reason",
      "super-admin-required",
    );
  });
});
