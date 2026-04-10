import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  timingSafeEqual,
  isHoneypotTriggered,
  isSubmissionTooFast,
  detectBot,
  sha256,
  verifyIntegrity,
  logSecurityEvent,
  getSecurityEvents,
  clearSecurityEvents,
  reportAbuse,
  isBlocked,
  resetAbuse,
  cleanupAbuseTrackers,
  maskEmail,
  maskPhone,
  maskIBAN,
  hasMinRole,
  assertRole,
} from "@/lib/security-advanced";

/* ═══════════════════════════════════════════════════
   TIMING-SAFE COMPARISON
   ═══════════════════════════════════════════════════ */
describe("timingSafeEqual", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqual("abc123", "abc123")).toBe(true);
  });
  it("returns false for different strings", () => {
    expect(timingSafeEqual("abc123", "xyz789")).toBe(false);
  });
  it("returns false for different lengths", () => {
    expect(timingSafeEqual("short", "longer-string")).toBe(false);
  });
  it("returns true for empty strings", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════
   HONEYPOT & BOT DETECTION
   ═══════════════════════════════════════════════════ */
describe("honeypot", () => {
  it("detects filled honeypot", () => {
    expect(isHoneypotTriggered("bot-value")).toBe(true);
  });
  it("accepts empty honeypot", () => {
    expect(isHoneypotTriggered("")).toBe(false);
    expect(isHoneypotTriggered(null)).toBe(false);
    expect(isHoneypotTriggered(undefined)).toBe(false);
  });
  it("detects whitespace-only as empty", () => {
    expect(isHoneypotTriggered("   ")).toBe(false);
  });
});

describe("isSubmissionTooFast", () => {
  it("flags instant submission", () => {
    expect(isSubmissionTooFast(Date.now(), 2000)).toBe(true);
  });
  it("accepts reasonable delay", () => {
    expect(isSubmissionTooFast(Date.now() - 5000, 2000)).toBe(false);
  });
});

describe("detectBot", () => {
  it("detects bot by honeypot", () => {
    const r = detectBot({ honeypotValue: "spam" });
    expect(r.isBot).toBe(true);
    expect(r.reasons).toContain("honeypot_filled");
  });
  it("detects bot by speed", () => {
    const r = detectBot({ formLoadedAt: Date.now(), minSubmitDelayMs: 3000 });
    expect(r.isBot).toBe(true);
    expect(r.reasons).toContain("submission_too_fast");
  });
  it("passes legitimate user", () => {
    const r = detectBot({ honeypotValue: "", formLoadedAt: Date.now() - 10000 });
    expect(r.isBot).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════
   CONTENT INTEGRITY
   ═══════════════════════════════════════════════════ */
describe("sha256 & verifyIntegrity", () => {
  it("produces consistent hashes", async () => {
    const h1 = await sha256("hello world");
    const h2 = await sha256("hello world");
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
  it("different inputs produce different hashes", async () => {
    const h1 = await sha256("hello");
    const h2 = await sha256("world");
    expect(h1).not.toBe(h2);
  });
  it("verifyIntegrity passes for correct hash", async () => {
    const hash = await sha256("test-content");
    expect(await verifyIntegrity("test-content", hash)).toBe(true);
  });
  it("verifyIntegrity fails for wrong hash", async () => {
    expect(await verifyIntegrity("content", "badhash")).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════
   SECURITY EVENT LOGGING
   ═══════════════════════════════════════════════════ */
describe("securityEventLog", () => {
  beforeEach(() => clearSecurityEvents());

  it("logs and retrieves events", () => {
    logSecurityEvent("test", "low", "Test event");
    const events = getSecurityEvents();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("test");
  });
  it("filters by severity", () => {
    logSecurityEvent("a", "low", "low");
    logSecurityEvent("b", "high", "high");
    logSecurityEvent("c", "critical", "crit");
    expect(getSecurityEvents("high")).toHaveLength(2);
    expect(getSecurityEvents("critical")).toHaveLength(1);
  });
  it("clears events", () => {
    logSecurityEvent("x", "medium", "m");
    clearSecurityEvents();
    expect(getSecurityEvents()).toHaveLength(0);
  });
});

/* ═══════════════════════════════════════════════════
   ABUSE DETECTION
   ═══════════════════════════════════════════════════ */
describe("abuse detection", () => {
  beforeEach(() => {
    resetAbuse("test-user");
    clearSecurityEvents();
  });

  it("starts unblocked", () => {
    expect(isBlocked("test-user")).toBe(false);
  });
  it("blocks after 3 violations", () => {
    reportAbuse("test-user");
    reportAbuse("test-user");
    const r = reportAbuse("test-user");
    expect(r.blocked).toBe(true);
    expect(r.violations).toBe(3);
    expect(isBlocked("test-user")).toBe(true);
  });
  it("resets abuse tracker", () => {
    reportAbuse("test-user");
    reportAbuse("test-user");
    reportAbuse("test-user");
    resetAbuse("test-user");
    expect(isBlocked("test-user")).toBe(false);
  });
  it("cleanupAbuseTrackers runs without error", () => {
    reportAbuse("old-key");
    expect(() => cleanupAbuseTrackers()).not.toThrow();
  });
});

/* ═══════════════════════════════════════════════════
   DATA MASKING
   ═══════════════════════════════════════════════════ */
describe("data masking", () => {
  it("masks email", () => {
    const masked = maskEmail("john.doe@example.com");
    expect(masked).toContain("@example.com");
    expect(masked).not.toContain("john.doe");
    expect(masked.startsWith("j")).toBe(true);
  });
  it("masks short email", () => {
    expect(maskEmail("a@b.com")).toContain("@b.com");
  });
  it("masks phone", () => {
    const masked = maskPhone("+33612345678");
    expect(masked).toContain("*");
    expect(masked.length).toBe("+33612345678".length);
  });
  it("masks IBAN", () => {
    const masked = maskIBAN("FR76 3000 6000 0112 3456 7890 189");
    expect(masked.startsWith("FR76")).toBe(true);
    expect(masked.endsWith("0189")).toBe(true);
    expect(masked).toContain("••••");
  });
});

/* ═══════════════════════════════════════════════════
   ROLE GUARDS
   ═══════════════════════════════════════════════════ */
describe("role guards", () => {
  it("owner has all roles", () => {
    expect(hasMinRole("owner", "member")).toBe(true);
    expect(hasMinRole("owner", "admin")).toBe(true);
    expect(hasMinRole("owner", "owner")).toBe(true);
  });
  it("member cannot be admin", () => {
    expect(hasMinRole("member", "admin")).toBe(false);
  });
  it("agent meets staff requirement", () => {
    expect(hasMinRole("agent", "staff")).toBe(true);
  });
  it("assertRole throws on insufficient role", () => {
    expect(() => assertRole("member", "admin", "delete org")).toThrow("Insufficient permissions");
  });
  it("assertRole passes on sufficient role", () => {
    expect(() => assertRole("owner", "admin")).not.toThrow();
  });
  it("unknown role defaults to 0", () => {
    expect(hasMinRole("unknown", "member")).toBe(false);
  });
});
