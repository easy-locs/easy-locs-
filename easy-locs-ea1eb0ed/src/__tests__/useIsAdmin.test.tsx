/**
 * Task #857 — Hook-level coverage for `useIsAdmin`.
 *
 * The shared `useIsAdmin` hook is the single source of truth that both the
 * dashboard sidebar and the admin route guard consume. These tests assert
 * the properties that prevent the original "sidebar says yes, route guard
 * says no" bug from coming back:
 *
 *   • the react-query key is scoped per user id, so changing the user id
 *     (account switch / sign-in) refetches against the new id and never
 *     serves a previous user's cached "yes";
 *   • after sign-out (`user = null`) the hook reports `isAdmin = false`;
 *   • non-allowlisted emails are short-circuited before any RPC is issued.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const useAuthSessionMock = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuthSession: () => useAuthSessionMock(),
}));

const hasRoleMock = vi.fn();
vi.mock("@/repositories/auth-utils.repository", () => ({
  hasRole: (...args: unknown[]) => hasRoleMock(...args),
}));

import { useIsAdmin, isAdminQueryKey } from "@/hooks/useIsAdmin";

const ALLOWED_EMAIL = "habboujabir@gmail.com";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

function renderUseIsAdmin(qc: QueryClient) {
  return renderHook(() => useIsAdmin(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    ),
  });
}

beforeEach(() => {
  hasRoleMock.mockReset();
  useAuthSessionMock.mockReset();
});

describe("useIsAdmin", () => {
  it("query key is scoped per user id, so changing user id refetches", async () => {
    // First user: u1 — admin RPC returns true.
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1", email: ALLOWED_EMAIL },
      loading: false,
      profileLoaded: true,
      emailVerified: true,
      session: null,
    });
    hasRoleMock.mockResolvedValue(true);

    const qc = makeQueryClient();
    const { result, rerender } = renderUseIsAdmin(qc);

    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    expect(hasRoleMock).toHaveBeenCalledWith("u1", "admin");
    expect(hasRoleMock).toHaveBeenCalledWith("u1", "owner");
    expect(qc.getQueryData(isAdminQueryKey("u1"))).toBe(true);

    // Switch user (account switch / new sign-in). The role RPC now returns
    // false; the hook must refetch under the new key — NOT serve the
    // previous user's cached "true".
    hasRoleMock.mockResolvedValue(false);
    useAuthSessionMock.mockReturnValue({
      user: { id: "u2", email: ALLOWED_EMAIL },
      loading: false,
      profileLoaded: true,
      emailVerified: true,
      session: null,
    });
    rerender();

    await waitFor(() => expect(result.current.isAdmin).toBe(false));
    expect(hasRoleMock).toHaveBeenCalledWith("u2", "admin");
    expect(qc.getQueryData(isAdminQueryKey("u2"))).toBe(false);
  });

  it("returns isAdmin=false after sign-out, even if a previous user was admin", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u1", email: ALLOWED_EMAIL },
      loading: false,
      profileLoaded: true,
      emailVerified: true,
      session: null,
    });
    hasRoleMock.mockResolvedValue(true);

    const qc = makeQueryClient();
    const { result, rerender } = renderUseIsAdmin(qc);
    await waitFor(() => expect(result.current.isAdmin).toBe(true));

    useAuthSessionMock.mockReturnValue({
      user: null,
      loading: false,
      profileLoaded: true,
      emailVerified: true,
      session: null,
    });
    rerender();
    await waitFor(() => expect(result.current.isAdmin).toBe(false));
  });

  it("non-allowlisted email is denied without issuing the role RPC", async () => {
    useAuthSessionMock.mockReturnValue({
      user: { id: "u9", email: "outsider@example.com" },
      loading: false,
      profileLoaded: true,
      emailVerified: true,
      session: null,
    });
    hasRoleMock.mockResolvedValue(true);

    const qc = makeQueryClient();
    const { result } = renderUseIsAdmin(qc);
    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.isAdmin).toBe(false);
    expect(hasRoleMock).not.toHaveBeenCalled();
  });
});
