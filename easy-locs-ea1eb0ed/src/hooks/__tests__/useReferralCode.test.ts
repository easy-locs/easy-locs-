import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { REFERRAL_CODE_KEY, referralMemoryCache } from "@/lib/referral-cache";
import type { ReferralCodeRow } from "@/services/referral.service";

const mockUser = { id: "user-123", email: "test@test.com" };

const mockReferralRow: ReferralCodeRow = {
  id: "row-1",
  code: "ABC123",
  owner_user_id: "user-123",
  reward_amount: 10,
  reward_currency: "AED",
  max_uses: null,
  use_count: 0,
  is_active: true,
  created_at: "2025-01-01T00:00:00Z",
  expires_at: null,
};

function buildAuthReturn(user: typeof mockUser | null) {
  return {
    user,
    session: null,
    loading: false,
    profileLoaded: true,
    emailVerified: true,
    orgId: null,
    allOrgs: [],
    userType: "landlord" as const,
    userCountry: "FR",
    userCurrency: "EUR",
    onboardingCompleted: false,
    subscription: { plan: "free", status: "active" },
    activeRole: "landlord" as const,
    hasDualRole: false,
    switchOrg: vi.fn(),
    switchRole: vi.fn(),
    refreshSubscription: vi.fn().mockResolvedValue(undefined),
    refreshProfile: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
}

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/referral.service", () => ({
  referralService: {
    getOrCreateCode: vi.fn(),
  },
}));

import { useAuth } from "@/contexts/AuthContext";
import { referralService } from "@/services/referral.service";
import { useReferralCode } from "../useReferralCode";

const mockUseAuth = vi.mocked(useAuth);
const mockGetOrCreateCode = vi.mocked(referralService.getOrCreateCode);

describe("useReferralCode – storage failure resilience", () => {
  beforeEach(() => {
    localStorage.clear();
    referralMemoryCache.clear();
    mockUseAuth.mockReturnValue(buildAuthReturn(mockUser));
    mockGetOrCreateCode.mockResolvedValue(mockReferralRow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to API code when localStorage.getItem throws (private browsing)", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("localStorage is not available");
    });

    const { result } = renderHook(() => useReferralCode());

    await waitFor(() => {
      expect(result.current).toBe("ABC123");
    });
  });

  it("fetches code from API when localStorage.getItem throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("storage access denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});

    const { result } = renderHook(() => useReferralCode());

    await waitFor(() => {
      expect(result.current).toBe("ABC123");
    });
    expect(mockGetOrCreateCode).toHaveBeenCalledWith("user-123");
  });

  it("still returns API code when localStorage.setItem throws (quota exceeded)", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });

    const { result } = renderHook(() => useReferralCode());

    await waitFor(() => {
      expect(result.current).toBe("ABC123");
    });
  });

  it("falls back to API when localStorage has invalid JSON", async () => {
    localStorage.setItem(REFERRAL_CODE_KEY, "not-valid-json{{{");

    const { result } = renderHook(() => useReferralCode());
    expect(result.current).toBeUndefined();

    await waitFor(() => {
      expect(result.current).toBe("ABC123");
    });
    expect(mockGetOrCreateCode).toHaveBeenCalledWith("user-123");
  });

  it("falls back to API when cached JSON has wrong shape", async () => {
    localStorage.setItem(REFERRAL_CODE_KEY, JSON.stringify({ wrong: "shape" }));

    const { result } = renderHook(() => useReferralCode());
    expect(result.current).toBeUndefined();

    await waitFor(() => {
      expect(result.current).toBe("ABC123");
    });
  });

  it("falls back to API when cached JSON has mismatched userId", async () => {
    localStorage.setItem(
      REFERRAL_CODE_KEY,
      JSON.stringify({ userId: "other-user", code: "XYZ" })
    );

    const { result } = renderHook(() => useReferralCode());
    expect(result.current).toBeUndefined();

    await waitFor(() => {
      expect(result.current).toBe("ABC123");
    });
  });

  it("returns cached code for matching userId", () => {
    localStorage.setItem(
      REFERRAL_CODE_KEY,
      JSON.stringify({ userId: "user-123", code: "CACHED99" })
    );

    const { result } = renderHook(() => useReferralCode());
    expect(result.current).toBe("CACHED99");
  });

  it("returns undefined when no user is logged in", () => {
    mockUseAuth.mockReturnValue(buildAuthReturn(null));

    const { result } = renderHook(() => useReferralCode());
    expect(result.current).toBeUndefined();
  });

  it("does not crash when both getItem and setItem throw", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    const { result } = renderHook(() => useReferralCode());

    await waitFor(() => {
      expect(result.current).toBe("ABC123");
    });
  });

  it("does not crash when API call fails and storage is broken", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    mockGetOrCreateCode.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useReferralCode());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current).toBeUndefined();
  });
});

describe("useReferralCode – in-memory cache fallback", () => {
  beforeEach(() => {
    localStorage.clear();
    referralMemoryCache.clear();
    mockUseAuth.mockReturnValue(buildAuthReturn(mockUser));
    mockGetOrCreateCode.mockResolvedValue(mockReferralRow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not call API on re-render when localStorage is broken and memory cache is populated", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });

    const { result, unmount } = renderHook(() => useReferralCode());

    await waitFor(() => {
      expect(result.current).toBe("ABC123");
    });
    expect(mockGetOrCreateCode).toHaveBeenCalledTimes(1);

    unmount();
    mockGetOrCreateCode.mockClear();

    const { result: result2 } = renderHook(() => useReferralCode());

    expect(result2.current).toBe("ABC123");

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(mockGetOrCreateCode).not.toHaveBeenCalled();
  });

  it("populates memory cache after API fetch even when localStorage works", async () => {
    const { result } = renderHook(() => useReferralCode());

    await waitFor(() => {
      expect(result.current).toBe("ABC123");
    });

    expect(referralMemoryCache.get("user-123")).toBe("ABC123");
  });

  it("serves from memory cache when localStorage returns no match", async () => {
    referralMemoryCache.set("user-123", "MEM_CODE");

    const { result } = renderHook(() => useReferralCode());

    expect(result.current).toBe("MEM_CODE");
    expect(mockGetOrCreateCode).not.toHaveBeenCalled();
  });

  it("prefers localStorage over memory cache when both have values", () => {
    localStorage.setItem(
      REFERRAL_CODE_KEY,
      JSON.stringify({ userId: "user-123", code: "LS_CODE" })
    );
    referralMemoryCache.set("user-123", "MEM_CODE");

    const { result } = renderHook(() => useReferralCode());

    expect(result.current).toBe("LS_CODE");
  });

  it("clearReferralCaches clears the memory cache", async () => {
    const { clearReferralCaches } = await import("@/lib/referral-cache");

    referralMemoryCache.set("user-123", "ABC123");
    expect(referralMemoryCache.size).toBe(1);

    clearReferralCaches();

    expect(referralMemoryCache.size).toBe(0);
  });
});
