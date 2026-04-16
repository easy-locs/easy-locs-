import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { REFERRAL_TRACKED_KEY, PENDING_REF_KEY } from "@/lib/referral-cache";
import type { Location } from "react-router-dom";

const mockLocation: Location = {
  search: "?ref=TESTCODE",
  pathname: "/landing",
  hash: "",
  state: null,
  key: "default",
};

const emptyLocation: Location = {
  search: "",
  pathname: "/page",
  hash: "",
  state: null,
  key: "default",
};

vi.mock("react-router-dom", () => ({
  useLocation: vi.fn(() => mockLocation),
}));

vi.mock("@/lib/analytics/analyticsEngine", () => ({
  trackAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
}));

import { useLocation } from "react-router-dom";
import { trackAnalyticsEvent } from "@/lib/analytics/analyticsEngine";
import {
  useReferralAttribution,
  _resetInMemoryDedup,
} from "../useReferralAttribution";

const mockUseLocation = vi.mocked(useLocation);
const mockTrackAnalytics = vi.mocked(trackAnalyticsEvent);

describe("useReferralAttribution – storage failure resilience", () => {
  beforeEach(() => {
    sessionStorage.clear();
    _resetInMemoryDedup();
    mockUseLocation.mockReturnValue(mockLocation);
    mockTrackAnalytics.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not crash when sessionStorage.setItem throws (private browsing)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("private browsing restriction");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("private browsing restriction");
    });

    expect(() => {
      renderHook(() => useReferralAttribution("user-1"));
    }).not.toThrow();
  });

  it("still fires analytics event when sessionStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    renderHook(() => useReferralAttribution("user-1"));

    expect(mockTrackAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "link_clicked",
        metadata: expect.objectContaining({
          referral_code: "TESTCODE",
          landing_path: "/landing",
        }),
      })
    );
  });

  it("does not crash when sessionStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("storage blocked");
    });

    expect(() => {
      renderHook(() => useReferralAttribution("user-1"));
    }).not.toThrow();
  });

  it("does not crash when both setItem and getItem throw", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });

    expect(() => {
      renderHook(() => useReferralAttribution("user-1"));
    }).not.toThrow();

    expect(mockTrackAnalytics).toHaveBeenCalled();
  });

  it("does not crash and still tracks analytics when quota exceeded on pending ref write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key) => {
      if (key === PENDING_REF_KEY) {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      }
    });

    expect(() => {
      renderHook(() => useReferralAttribution("user-1"));
    }).not.toThrow();

    expect(mockTrackAnalytics).toHaveBeenCalled();
  });

  it("does not crash and still tracks analytics when quota exceeded on dedup key write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation((key) => {
      if (key === REFERRAL_TRACKED_KEY) {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      }
    });

    expect(() => {
      renderHook(() => useReferralAttribution("user-1"));
    }).not.toThrow();

    expect(mockTrackAnalytics).toHaveBeenCalled();
  });

  it("skips analytics when no ref param is present", () => {
    mockUseLocation.mockReturnValue(emptyLocation);

    renderHook(() => useReferralAttribution("user-1"));

    expect(mockTrackAnalytics).not.toHaveBeenCalled();
  });

  it("deduplicates when sessionStorage works normally", () => {
    renderHook(() => useReferralAttribution("user-1"));
    mockTrackAnalytics.mockClear();

    renderHook(() => useReferralAttribution("user-1"));
    expect(mockTrackAnalytics).not.toHaveBeenCalled();
  });

  it("deduplicates via in-memory fallback when sessionStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });

    renderHook(() => useReferralAttribution("user-1"));
    expect(mockTrackAnalytics).toHaveBeenCalledTimes(1);

    mockTrackAnalytics.mockClear();
    renderHook(() => useReferralAttribution("user-1"));
    expect(mockTrackAnalytics).not.toHaveBeenCalled();
  });

  it("in-memory fallback allows different dedup keys", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });

    renderHook(() => useReferralAttribution("user-1"));
    expect(mockTrackAnalytics).toHaveBeenCalledTimes(1);

    mockTrackAnalytics.mockClear();

    const otherLocation: Location = {
      search: "?ref=OTHER",
      pathname: "/other",
      hash: "",
      state: null,
      key: "default",
    };
    mockUseLocation.mockReturnValue(otherLocation);

    renderHook(() => useReferralAttribution("user-1"));
    expect(mockTrackAnalytics).toHaveBeenCalledTimes(1);
  });

  it("does not crash when analytics tracking itself fails alongside storage failure", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    mockTrackAnalytics.mockRejectedValue(new Error("network error"));

    expect(() => {
      renderHook(() => useReferralAttribution("user-1"));
    }).not.toThrow();
  });

  it("does not crash with null userId and broken storage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });

    expect(() => {
      renderHook(() => useReferralAttribution(null));
    }).not.toThrow();

    expect(mockTrackAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
      })
    );
  });

  it("_resetInMemoryDedup clears the in-memory set", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked");
    });

    renderHook(() => useReferralAttribution("user-1"));
    expect(mockTrackAnalytics).toHaveBeenCalledTimes(1);

    mockTrackAnalytics.mockClear();
    _resetInMemoryDedup();

    renderHook(() => useReferralAttribution("user-1"));
    expect(mockTrackAnalytics).toHaveBeenCalledTimes(1);
  });
});
