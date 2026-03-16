import { describe, it, expect, beforeEach } from "vitest";
import {
  stripHtml,
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeUrl,
  checkRateLimit,
  cleanupRateLimits,
  validateAmount,
  generateFormToken,
  isValidUUID,
  validatePassword,
  sanitizeFilename,
  hasInjectionPatterns,
  getBrowserFingerprint,
} from "@/lib/security-utils";

describe("Security Hardening", () => {
  // ── XSS Prevention ──────────────────────────────────────

  describe("XSS Prevention", () => {
    it("strips HTML tags", () => {
      expect(stripHtml("<script>alert('xss')</script>Hello")).toBe("alert('xss')Hello");
      expect(stripHtml("<img onerror=alert(1) src=x>")).toBe("");
    });

    it("sanitizes event handlers and JS protocol", () => {
      expect(sanitizeText('onclick="alert(1)"')).not.toContain("onclick");
      expect(sanitizeText("javascript:void(0)")).not.toContain("javascript:");
      expect(sanitizeText("data:text/html,<script>")).not.toContain("data:");
    });

    it("respects max length", () => {
      const long = "a".repeat(10000);
      expect(sanitizeText(long, 100).length).toBeLessThanOrEqual(100);
    });

    it("handles empty/null input", () => {
      expect(sanitizeText("")).toBe("");
    });
  });

  // ── Injection Detection ─────────────────────────────────

  describe("Injection Detection", () => {
    it("detects script tags", () => {
      expect(hasInjectionPatterns("<script>alert(1)</script>")).toBe(true);
    });

    it("detects SQL injection patterns", () => {
      expect(hasInjectionPatterns("'; DROP TABLE users; --")).toBe(true);
      expect(hasInjectionPatterns("1 UNION SELECT * FROM profiles")).toBe(true);
    });

    it("detects event handler injection", () => {
      expect(hasInjectionPatterns('onerror="alert(1)"')).toBe(true);
      expect(hasInjectionPatterns('onload=fetch("evil.com")')).toBe(true);
    });

    it("allows normal text", () => {
      expect(hasInjectionPatterns("Hello, this is a normal message!")).toBe(false);
      expect(hasInjectionPatterns("Apartment 3B, 123 Main Street")).toBe(false);
    });
  });

  // ── Input Validation ────────────────────────────────────

  describe("Input Validation", () => {
    it("validates email addresses", () => {
      expect(sanitizeEmail("user@example.com")).toBe("user@example.com");
      expect(sanitizeEmail("  User@EXAMPLE.com  ")).toBe("user@example.com");
      expect(sanitizeEmail("invalid")).toBeNull();
      expect(sanitizeEmail("")).toBeNull();
      expect(sanitizeEmail("a".repeat(300) + "@x.com")).toBeNull();
    });

    it("validates phone numbers", () => {
      expect(sanitizePhone("+33 6 12 34 56 78")).toBe("+33612345678");
      expect(sanitizePhone("(212) 555-1234")).toBe("2125551234");
      expect(sanitizePhone("123")).toBeNull();
      expect(sanitizePhone("not-a-phone")).toBeNull();
    });

    it("validates URLs", () => {
      expect(sanitizeUrl("https://example.com")).toBe("https://example.com/");
      expect(sanitizeUrl("http://localhost:3000")).toBe("http://localhost:3000/");
      expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
      expect(sanitizeUrl("ftp://evil.com")).toBeNull();
      expect(sanitizeUrl("not a url")).toBeNull();
    });

    it("validates monetary amounts", () => {
      expect(validateAmount(99.99)).toBe(99.99);
      expect(validateAmount(0)).toBe(0);
      expect(validateAmount(-1)).toBeNull();
      expect(validateAmount(Infinity)).toBeNull();
      expect(validateAmount("not a number")).toBeNull();
      expect(validateAmount(1_000_000_000)).toBeNull();
    });

    it("validates UUIDs", () => {
      expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(isValidUUID("not-a-uuid")).toBe(false);
      expect(isValidUUID("")).toBe(false);
    });
  });

  // ── Password Validation ─────────────────────────────────

  describe("Password Validation", () => {
    it("rejects weak passwords", () => {
      const result = validatePassword("weak");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("accepts strong passwords", () => {
      const result = validatePassword("StrongPass123");
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("requires mixed case and digits", () => {
      expect(validatePassword("alllowercase1").valid).toBe(false);
      expect(validatePassword("ALLUPPERCASE1").valid).toBe(false);
      expect(validatePassword("NoDigitsHere").valid).toBe(false);
    });

    it("enforces length limits", () => {
      expect(validatePassword("Ab1").valid).toBe(false);
      expect(validatePassword("A".repeat(130) + "b1").valid).toBe(false);
    });
  });

  // ── Rate Limiting ───────────────────────────────────────

  describe("Rate Limiting", () => {
    beforeEach(() => {
      cleanupRateLimits();
    });

    it("allows requests under limit", () => {
      const r1 = checkRateLimit("test-action", 3, 60_000);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);
    });

    it("blocks requests over limit", () => {
      checkRateLimit("block-test", 2, 60_000);
      checkRateLimit("block-test", 2, 60_000);
      const r3 = checkRateLimit("block-test", 2, 60_000);
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
      expect(r3.retryAfterMs).toBeGreaterThan(0);
    });

    it("isolates different keys", () => {
      checkRateLimit("key-a", 1, 60_000);
      const r = checkRateLimit("key-b", 1, 60_000);
      expect(r.allowed).toBe(true);
    });
  });

  // ── File Sanitization ───────────────────────────────────

  describe("Filename Sanitization", () => {
    it("removes dangerous characters", () => {
      expect(sanitizeFilename("../../etc/passwd")).not.toContain("/");
      expect(sanitizeFilename("file<script>.jpg")).toBe("filescript.jpg");
    });

    it("normalizes spaces and dots", () => {
      expect(sanitizeFilename("my  file...doc")).toBe("my_file.doc");
    });

    it("enforces length limit", () => {
      const long = "a".repeat(300) + ".jpg";
      expect(sanitizeFilename(long).length).toBeLessThanOrEqual(255);
    });
  });

  // ── Utility Functions ───────────────────────────────────

  describe("Security Utilities", () => {
    it("generates unique form tokens", () => {
      const t1 = generateFormToken();
      const t2 = generateFormToken();
      expect(t1).not.toBe(t2);
      expect(t1.length).toBe(64); // 32 bytes hex
    });

    it("generates browser fingerprint", () => {
      const fp = getBrowserFingerprint();
      expect(typeof fp).toBe("string");
      expect(fp.length).toBeGreaterThan(0);
    });
  });
});
