import { describe, it, expect, beforeEach } from "vitest";
import {
  tokenBucketCheck,
  resetBucket,
  generateCSRFToken,
  validateCSRFToken,
  getCSRFToken,
  buildCSP,
  detectSQLInjection,
  detectXSS,
  validateInput,
  getSecureHeaders,
  fingerprint,
} from "@/lib/security-hardening";

describe("Security Hardening Advanced — AU", () => {
  describe("tokenBucketCheck", () => {
    beforeEach(() => resetBucket("test-bucket"));

    it("allows requests within limit", () => {
      const r = tokenBucketCheck("test-bucket", { maxTokens: 5, refillRate: 1 });
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(4);
    });

    it("blocks after exhausting tokens", () => {
      const cfg = { maxTokens: 2, refillRate: 1 };
      tokenBucketCheck("exhaust", cfg);
      tokenBucketCheck("exhaust", cfg);
      const r = tokenBucketCheck("exhaust", cfg);
      expect(r.allowed).toBe(false);
      expect(r.remaining).toBe(0);
    });
  });

  describe("CSRF", () => {
    it("generates and validates tokens", () => {
      const token = generateCSRFToken();
      expect(token).toHaveLength(64);
      expect(validateCSRFToken(token)).toBe(true);
    });

    it("rejects wrong token", () => {
      generateCSRFToken();
      expect(validateCSRFToken("wrong")).toBe(false);
    });

    it("rejects empty token", () => {
      expect(validateCSRFToken("")).toBe(false);
    });

    it("getCSRFToken returns current", () => {
      const token = generateCSRFToken();
      expect(getCSRFToken()).toBe(token);
    });
  });

  describe("CSP Builder", () => {
    it("builds CSP string", () => {
      const csp = buildCSP({
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      });
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    });

    it("includes report-uri", () => {
      const csp = buildCSP({ reportUri: "https://report.example.com" });
      expect(csp).toContain("report-uri https://report.example.com");
    });
  });

  describe("Input Validation", () => {
    it("detects SQL injection", () => {
      expect(detectSQLInjection("SELECT * FROM users")).toBe(true);
      expect(detectSQLInjection("hello world")).toBe(false);
    });

    it("detects XSS", () => {
      expect(detectXSS('<script>alert("xss")</script>')).toBe(true);
      expect(detectXSS("normal text")).toBe(false);
    });

    it("validateInput returns threats", () => {
      const r = validateInput('<script>SELECT * FROM users</script>');
      expect(r.safe).toBe(false);
      expect(r.threats).toContain("sql_injection");
      expect(r.threats).toContain("xss");
    });

    it("validates clean input", () => {
      expect(validateInput("Hello world").safe).toBe(true);
    });
  });

  describe("Secure Headers", () => {
    it("returns all security headers", () => {
      const headers = getSecureHeaders();
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["X-Frame-Options"]).toBe("DENY");
      expect(headers["Strict-Transport-Security"]).toContain("max-age");
    });
  });

  describe("Fingerprint", () => {
    it("produces consistent hash", () => {
      const a = fingerprint({ ua: "chrome", lang: "en" });
      const b = fingerprint({ lang: "en", ua: "chrome" });
      expect(a).toBe(b);
    });

    it("different inputs produce different hashes", () => {
      const a = fingerprint({ ua: "chrome" });
      const b = fingerprint({ ua: "firefox" });
      expect(a).not.toBe(b);
    });
  });
});
