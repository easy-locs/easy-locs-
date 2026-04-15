import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  REFERRAL_CODE_KEY,
  REFERRAL_TRACKED_KEY,
  PENDING_REF_KEY,
  clearReferralCaches,
} from "../referral-cache";

describe("referral-cache constants", () => {
  it("REFERRAL_CODE_KEY matches expected value", () => {
    expect(REFERRAL_CODE_KEY).toBe("easylocs_referral_code");
  });

  it("REFERRAL_TRACKED_KEY matches expected value", () => {
    expect(REFERRAL_TRACKED_KEY).toBe("easylocs_ref_tracked");
  });

  it("PENDING_REF_KEY matches expected value", () => {
    expect(PENDING_REF_KEY).toBe("easylocs_pending_ref_code");
  });
});

describe("clearReferralCaches", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("removes REFERRAL_CODE_KEY from localStorage", () => {
    localStorage.setItem(REFERRAL_CODE_KEY, "test-code");
    expect(localStorage.getItem(REFERRAL_CODE_KEY)).toBe("test-code");

    clearReferralCaches();

    expect(localStorage.getItem(REFERRAL_CODE_KEY)).toBeNull();
  });

  it("removes REFERRAL_TRACKED_KEY from sessionStorage", () => {
    sessionStorage.setItem(REFERRAL_TRACKED_KEY, "true");
    expect(sessionStorage.getItem(REFERRAL_TRACKED_KEY)).toBe("true");

    clearReferralCaches();

    expect(sessionStorage.getItem(REFERRAL_TRACKED_KEY)).toBeNull();
  });

  it("removes PENDING_REF_KEY from sessionStorage", () => {
    sessionStorage.setItem(PENDING_REF_KEY, "pending-code");
    expect(sessionStorage.getItem(PENDING_REF_KEY)).toBe("pending-code");

    clearReferralCaches();

    expect(sessionStorage.getItem(PENDING_REF_KEY)).toBeNull();
  });

  it("removes all referral keys in a single call", () => {
    localStorage.setItem(REFERRAL_CODE_KEY, "code");
    sessionStorage.setItem(REFERRAL_TRACKED_KEY, "true");
    sessionStorage.setItem(PENDING_REF_KEY, "pending");

    clearReferralCaches();

    expect(localStorage.getItem(REFERRAL_CODE_KEY)).toBeNull();
    expect(sessionStorage.getItem(REFERRAL_TRACKED_KEY)).toBeNull();
    expect(sessionStorage.getItem(PENDING_REF_KEY)).toBeNull();
  });

  it("does not remove unrelated keys", () => {
    localStorage.setItem("other_key", "keep-me");
    sessionStorage.setItem("another_key", "keep-me-too");

    clearReferralCaches();

    expect(localStorage.getItem("other_key")).toBe("keep-me");
    expect(sessionStorage.getItem("another_key")).toBe("keep-me-too");
  });

  it("does not throw when localStorage.removeItem throws", () => {
    const spy = vi
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new DOMException("storage access denied");
      });

    expect(() => clearReferralCaches()).not.toThrow();
  });

  it("does not throw when sessionStorage is inaccessible", () => {
    vi.spyOn(localStorage, "removeItem").mockImplementation(() => {});
    vi.spyOn(sessionStorage, "removeItem").mockImplementation(() => {
      throw new DOMException("private browsing restriction");
    });

    expect(() => clearReferralCaches()).not.toThrow();
  });

  it("continues clearing remaining keys even if one storage call throws", () => {
    localStorage.setItem(REFERRAL_CODE_KEY, "code");
    sessionStorage.setItem(REFERRAL_TRACKED_KEY, "tracked");
    sessionStorage.setItem(PENDING_REF_KEY, "pending");

    vi.spyOn(localStorage, "removeItem").mockImplementationOnce(() => {
      throw new Error("localStorage blocked");
    });

    clearReferralCaches();

    expect(sessionStorage.getItem(REFERRAL_TRACKED_KEY)).toBeNull();
    expect(sessionStorage.getItem(PENDING_REF_KEY)).toBeNull();
  });
});
