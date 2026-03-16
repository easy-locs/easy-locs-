import { describe, it, expect } from "vitest";
import {
  stripHtml,
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  checkRateLimit,
  validateAmount,
  isValidUUID,
  generateFormToken,
} from "@/lib/security-utils";

describe("Security Utils", () => {
  describe("stripHtml", () => {
    it("removes HTML tags", () => {
      expect(stripHtml("<b>hello</b>")).toBe("hello");
      expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
    });
    it("handles empty string", () => {
      expect(stripHtml("")).toBe("");
    });
  });

  describe("sanitizeText", () => {
    it("removes event handlers", () => {
      expect(sanitizeText('text onclick="alert(1)"')).toBe('text ="alert(1)"');
    });
    it("removes javascript: protocol", () => {
      expect(sanitizeText("javascript:alert(1)")).toBe("alert(1)");
    });
    it("respects maxLength", () => {
      expect(sanitizeText("a".repeat(100), 10)).toBe("a".repeat(10));
    });
  });

  describe("sanitizeEmail", () => {
    it("accepts valid emails", () => {
      expect(sanitizeEmail("test@example.com")).toBe("test@example.com");
      expect(sanitizeEmail(" Test@EXAMPLE.COM ")).toBe("test@example.com");
    });
    it("rejects invalid emails", () => {
      expect(sanitizeEmail("not-email")).toBeNull();
      expect(sanitizeEmail("@example.com")).toBeNull();
      expect(sanitizeEmail("")).toBeNull();
    });
  });

  describe("sanitizePhone", () => {
    it("accepts valid phones", () => {
      expect(sanitizePhone("+33612345678")).toBe("+33612345678");
      expect(sanitizePhone("06 12 34 56 78")).toBe("0612345678");
    });
    it("rejects invalid phones", () => {
      expect(sanitizePhone("123")).toBeNull();
      expect(sanitizePhone("abc")).toBeNull();
    });
  });

  describe("sanitizeUrl", () => {
    it("accepts https URLs", () => {
      expect(sanitizeUrl("https://example.com")).toBe("https://example.com/");
    });
    it("rejects javascript URLs", () => {
      expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
    });
    it("rejects invalid URLs", () => {
      expect(sanitizeUrl("not a url")).toBeNull();
    });
  });

  describe("checkRateLimit", () => {
    it("allows within limit", () => {
      const result = checkRateLimit("test-key-1", 3, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });
    it("blocks after exceeding limit", () => {
      const key = "test-key-block-" + Date.now();
      checkRateLimit(key, 2, 60000);
      checkRateLimit(key, 2, 60000);
      const result = checkRateLimit(key, 2, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe("validateAmount", () => {
    it("accepts valid amounts", () => {
      expect(validateAmount(100)).toBe(100);
      expect(validateAmount(99.999)).toBe(100);
      expect(validateAmount("50.5")).toBe(50.5);
    });
    it("rejects invalid amounts", () => {
      expect(validateAmount(-1)).toBeNull();
      expect(validateAmount("abc")).toBeNull();
      expect(validateAmount(Infinity)).toBeNull();
    });
  });

  describe("isValidUUID", () => {
    it("validates correct UUIDs", () => {
      expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    });
    it("rejects invalid UUIDs", () => {
      expect(isValidUUID("not-a-uuid")).toBe(false);
      expect(isValidUUID("")).toBe(false);
    });
  });

  describe("generateFormToken", () => {
    it("generates 64 char hex string", () => {
      const token = generateFormToken();
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
    it("generates unique tokens", () => {
      const t1 = generateFormToken();
      const t2 = generateFormToken();
      expect(t1).not.toBe(t2);
    });
  });
});
