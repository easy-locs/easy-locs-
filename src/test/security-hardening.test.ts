import { describe, it, expect, beforeEach } from "vitest";
import {
  RateLimiter, escapeHtml, stripTags, sanitizeInput,
  isValidEmail, isValidUUID, generateCSRFToken, getCSRFToken,
  validateCSRFToken, hasSQLInjection, hasXSSPattern, securityCheck,
} from "@/lib/security-hardening";

describe("RateLimiter", () => {
  let limiter: RateLimiter;
  beforeEach(() => { limiter = new RateLimiter(3, 1000); });

  it("allows requests within limit", () => {
    expect(limiter.attempt("u1")).toBe(true);
    expect(limiter.attempt("u1")).toBe(true);
    expect(limiter.attempt("u1")).toBe(true);
  });

  it("blocks requests exceeding limit", () => {
    limiter.attempt("u1"); limiter.attempt("u1"); limiter.attempt("u1");
    expect(limiter.attempt("u1")).toBe(false);
  });

  it("tracks remaining correctly", () => {
    limiter.attempt("u1");
    expect(limiter.remaining("u1")).toBe(2);
  });

  it("isolates keys", () => {
    limiter.attempt("u1"); limiter.attempt("u1"); limiter.attempt("u1");
    expect(limiter.attempt("u2")).toBe(true);
  });

  it("reset clears a key", () => {
    limiter.attempt("u1"); limiter.attempt("u1"); limiter.attempt("u1");
    limiter.reset("u1");
    expect(limiter.attempt("u1")).toBe(true);
  });
});

describe("Input Sanitization", () => {
  it("escapes HTML entities", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).not.toContain("<script>");
  });
  it("strips tags", () => {
    expect(stripTags("<b>bold</b>")).toBe("bold");
  });
  it("sanitizeInput trims and limits length", () => {
    expect(sanitizeInput("  hello  ", 3)).toBe("hel");
  });
  it("validates emails", () => {
    expect(isValidEmail("a@b.c")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
  });
  it("validates UUIDs", () => {
    expect(isValidUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidUUID("not-a-uuid")).toBe(false);
  });
});

describe("CSRF", () => {
  it("generates and validates token", () => {
    const token = generateCSRFToken();
    expect(getCSRFToken()).toBe(token);
    expect(validateCSRFToken(token)).toBe(true);
    expect(validateCSRFToken("wrong")).toBe(false);
  });
});

describe("Content Security", () => {
  it("detects SQL injection", () => {
    expect(hasSQLInjection("SELECT * FROM users")).toBe(true);
    expect(hasSQLInjection("hello world")).toBe(false);
  });
  it("detects XSS", () => {
    expect(hasXSSPattern("<script>alert(1)</script>")).toBe(true);
    expect(hasXSSPattern("normal text")).toBe(false);
  });
  it("securityCheck returns combined threats", () => {
    const r = securityCheck("<script>SELECT * FROM users</script>");
    expect(r.safe).toBe(false);
    expect(r.threats).toContain("xss");
    expect(r.threats).toContain("sql_injection");
  });
});
