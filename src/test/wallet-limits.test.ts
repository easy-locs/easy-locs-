import { describe, it, expect } from "vitest";
import {
  checkDailyLimit,
  isLargeTransaction,
  formatLimitInfo,
  DAILY_TRANSFER_LIMITS,
  LARGE_TX_THRESHOLD,
} from "@/lib/wallet-limits";

describe("Wallet Limits", () => {
  describe("checkDailyLimit", () => {
    it("allows transfer within default limit", () => {
      const result = checkDailyLimit(0, 1000, "default");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5000);
      expect(result.limit).toBe(5000);
    });

    it("blocks transfer exceeding default limit", () => {
      const result = checkDailyLimit(4500, 600, "default");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(500);
    });

    it("allows exact remaining amount", () => {
      const result = checkDailyLimit(4000, 1000, "default");
      expect(result.allowed).toBe(true);
    });

    it("respects verified tier limit", () => {
      const result = checkDailyLimit(0, 15000, "verified");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(20000);
    });

    it("respects premium tier limit", () => {
      const result = checkDailyLimit(0, 99000, "premium");
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100000);
    });

    it("remaining never goes negative", () => {
      const result = checkDailyLimit(10000, 100, "default");
      expect(result.remaining).toBe(0);
    });
  });

  describe("isLargeTransaction", () => {
    it("returns false below threshold", () => {
      expect(isLargeTransaction(499)).toBe(false);
    });

    it("returns true at threshold", () => {
      expect(isLargeTransaction(LARGE_TX_THRESHOLD)).toBe(true);
    });

    it("returns true above threshold", () => {
      expect(isLargeTransaction(1000)).toBe(true);
    });
  });

  describe("formatLimitInfo", () => {
    it("formats correctly", () => {
      const info = formatLimitInfo(2500, 5000);
      expect(info).toContain("2,500");
      expect(info).toContain("5,000");
      expect(info).toContain("50%");
    });

    it("shows 0% when fully spent", () => {
      const info = formatLimitInfo(0, 5000);
      expect(info).toContain("0%");
    });
  });

  describe("Constants", () => {
    it("has correct tier values", () => {
      expect(DAILY_TRANSFER_LIMITS.default).toBe(5000);
      expect(DAILY_TRANSFER_LIMITS.verified).toBe(20000);
      expect(DAILY_TRANSFER_LIMITS.premium).toBe(100000);
    });

    it("large tx threshold is 500", () => {
      expect(LARGE_TX_THRESHOLD).toBe(500);
    });
  });
});
