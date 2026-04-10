/**
 * Advanced Security Utilities — PASS55 Block AM
 * 
 * CSRF protection, honeypot detection, content integrity,
 * timing-safe comparison, security event logging, and abuse detection.
 */

/* ═══════════════════════════════════════════════════
   1. CSRF TOKEN MANAGEMENT
   ═══════════════════════════════════════════════════ */

const CSRF_STORAGE_KEY = "el_csrf_token";
const CSRF_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface CSRFEntry {
  token: string;
  createdAt: number;
}

/** Generate a cryptographically secure CSRF token and store it */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const token = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

  const entry: CSRFEntry = { token, createdAt: Date.now() };
  try {
    sessionStorage.setItem(CSRF_STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // SSR or storage unavailable — token still usable in memory
  }
  return token;
}

/** Validate a CSRF token against the stored one (timing-safe) */
export function validateCSRFToken(submitted: string): boolean {
  try {
    const raw = sessionStorage.getItem(CSRF_STORAGE_KEY);
    if (!raw) return false;
    const entry: CSRFEntry = JSON.parse(raw);

    // Check expiry
    if (Date.now() - entry.createdAt > CSRF_TOKEN_TTL_MS) {
      sessionStorage.removeItem(CSRF_STORAGE_KEY);
      return false;
    }

    return timingSafeEqual(submitted, entry.token);
  } catch {
    return false;
  }
}

/** Consume (invalidate) the current CSRF token after use */
export function consumeCSRFToken(): void {
  try {
    sessionStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/* ═══════════════════════════════════════════════════
   2. TIMING-SAFE COMPARISON
   ═══════════════════════════════════════════════════ */

/** 
 * Constant-time string comparison to prevent timing attacks.
 * Both strings are compared in full regardless of where they differ. 
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a full comparison to avoid length-based timing leaks
    b = a; // Compare a against itself so timing is consistent
    // but return false
    let result = 1; // will force false
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/* ═══════════════════════════════════════════════════
   3. HONEYPOT FIELD DETECTION
   ═══════════════════════════════════════════════════ */

/** 
 * Check if a honeypot field was filled (bot detection).
 * Honeypot fields are hidden from real users but filled by bots.
 */
export function isHoneypotTriggered(fieldValue: string | undefined | null): boolean {
  return typeof fieldValue === "string" && fieldValue.trim().length > 0;
}

/** Validate form submission timing (too fast = bot) */
export function isSubmissionTooFast(
  formLoadedAt: number,
  minDelayMs = 2000
): boolean {
  return Date.now() - formLoadedAt < minDelayMs;
}

/** Combined bot detection check */
export function detectBot(opts: {
  honeypotValue?: string | null;
  formLoadedAt?: number;
  minSubmitDelayMs?: number;
}): { isBot: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (isHoneypotTriggered(opts.honeypotValue)) {
    reasons.push("honeypot_filled");
  }

  if (opts.formLoadedAt && isSubmissionTooFast(opts.formLoadedAt, opts.minSubmitDelayMs)) {
    reasons.push("submission_too_fast");
  }

  return { isBot: reasons.length > 0, reasons };
}

/* ═══════════════════════════════════════════════════
   4. CONTENT INTEGRITY (SHA-256 HASHING)
   ═══════════════════════════════════════════════════ */

/** 
 * Compute SHA-256 hash of a string (for document integrity verification).
 * Returns hex-encoded hash string.
 */
export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verify content integrity by comparing hash */
export async function verifyIntegrity(
  content: string,
  expectedHash: string
): Promise<boolean> {
  const actualHash = await sha256(content);
  return timingSafeEqual(actualHash, expectedHash);
}

/* ═══════════════════════════════════════════════════
   5. SECURITY EVENT LOGGING
   ═══════════════════════════════════════════════════ */

export type SecurityEventSeverity = "low" | "medium" | "high" | "critical";

export interface SecurityEvent {
  type: string;
  severity: SecurityEventSeverity;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

const securityEventLog: SecurityEvent[] = [];
const MAX_LOG_SIZE = 500;

/** Log a security event (kept in-memory for the session) */
export function logSecurityEvent(
  type: string,
  severity: SecurityEventSeverity,
  message: string,
  metadata?: Record<string, unknown>
): void {
  const event: SecurityEvent = {
    type,
    severity,
    message,
    metadata,
    timestamp: Date.now(),
  };

  securityEventLog.push(event);

  // Trim oldest entries if over limit
  if (securityEventLog.length > MAX_LOG_SIZE) {
    securityEventLog.splice(0, securityEventLog.length - MAX_LOG_SIZE);
  }

  // Console output for high/critical events
  if (severity === "high" || severity === "critical") {
    console.warn(`[SECURITY:${severity.toUpperCase()}] ${type}: ${message}`, metadata);
  }
}

/** Get all security events (optionally filtered by severity) */
export function getSecurityEvents(
  minSeverity?: SecurityEventSeverity
): readonly SecurityEvent[] {
  if (!minSeverity) return [...securityEventLog];

  const levels: Record<SecurityEventSeverity, number> = {
    low: 0, medium: 1, high: 2, critical: 3,
  };
  const minLevel = levels[minSeverity];
  return securityEventLog.filter((e) => levels[e.severity] >= minLevel);
}

/** Clear security events (for testing or reset) */
export function clearSecurityEvents(): void {
  securityEventLog.length = 0;
}

/* ═══════════════════════════════════════════════════
   6. ABUSE DETECTION — PROGRESSIVE RATE LIMITING
   ═══════════════════════════════════════════════════ */

interface AbuseTracker {
  violations: number;
  firstViolation: number;
  lastViolation: number;
  blocked: boolean;
  blockedUntil: number;
}

const abuseTrackers = new Map<string, AbuseTracker>();

/** Escalation thresholds: [violations, blockDurationMs] */
const ABUSE_ESCALATION: [number, number][] = [
  [3, 30_000],       // 3 violations → 30s block
  [5, 5 * 60_000],   // 5 violations → 5m block
  [10, 30 * 60_000], // 10 violations → 30m block
  [20, 60 * 60_000], // 20 violations → 1h block
];

/** Report a violation for a key (user/IP). Returns current block status. */
export function reportAbuse(
  key: string
): { blocked: boolean; violations: number; blockedUntilMs: number } {
  const now = Date.now();
  let tracker = abuseTrackers.get(key);

  if (!tracker) {
    tracker = {
      violations: 0,
      firstViolation: now,
      lastViolation: now,
      blocked: false,
      blockedUntil: 0,
    };
    abuseTrackers.set(key, tracker);
  }

  // If currently blocked, check if block expired
  if (tracker.blocked && now >= tracker.blockedUntil) {
    tracker.blocked = false;
  }

  tracker.violations++;
  tracker.lastViolation = now;

  // Check escalation thresholds (use the highest matching)
  let blockDuration = 0;
  for (const [threshold, duration] of ABUSE_ESCALATION) {
    if (tracker.violations >= threshold) {
      blockDuration = duration;
    }
  }

  if (blockDuration > 0) {
    tracker.blocked = true;
    tracker.blockedUntil = now + blockDuration;

    logSecurityEvent("abuse_block", "high", `Key "${key}" blocked for ${blockDuration / 1000}s after ${tracker.violations} violations`);
  }

  return {
    blocked: tracker.blocked,
    violations: tracker.violations,
    blockedUntilMs: tracker.blocked ? tracker.blockedUntil - now : 0,
  };
}

/** Check if a key is currently blocked */
export function isBlocked(key: string): boolean {
  const tracker = abuseTrackers.get(key);
  if (!tracker) return false;
  if (tracker.blocked && Date.now() >= tracker.blockedUntil) {
    tracker.blocked = false;
  }
  return tracker.blocked;
}

/** Reset abuse tracker for a key */
export function resetAbuse(key: string): void {
  abuseTrackers.delete(key);
}

/** Cleanup all expired abuse trackers */
export function cleanupAbuseTrackers(): void {
  const now = Date.now();
  const expiry = 2 * 60 * 60 * 1000; // 2 hours
  for (const [key, tracker] of abuseTrackers) {
    if (now - tracker.lastViolation > expiry) {
      abuseTrackers.delete(key);
    }
  }
}

/* ═══════════════════════════════════════════════════
   7. SECURE DATA MASKING
   ═══════════════════════════════════════════════════ */

/** Mask an email for display (j***@example.com) */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}${"*".repeat(Math.min(local.length - 1, 5))}@${domain}`;
}

/** Mask a phone number for display (+336****5678) */
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return "****";
  const visibleStart = Math.min(4, Math.floor(phone.length / 3));
  const visibleEnd = Math.min(4, Math.floor(phone.length / 3));
  return (
    phone.slice(0, visibleStart) +
    "*".repeat(phone.length - visibleStart - visibleEnd) +
    phone.slice(-visibleEnd)
  );
}

/** Mask an IBAN for display (FR76****••••1234) */
export function maskIBAN(iban: string): string {
  const clean = iban.replace(/\s/g, "");
  if (clean.length <= 8) return "****";
  return clean.slice(0, 4) + "••••".repeat(2) + clean.slice(-4);
}

/* ═══════════════════════════════════════════════════
   8. PERMISSION GUARD HELPER
   ═══════════════════════════════════════════════════ */

export type OrgRole = "owner" | "admin" | "agent" | "staff" | "accountant" | "member";

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 100,
  admin: 80,
  agent: 60,
  staff: 40,
  accountant: 30,
  member: 20,
};

/** Check if a user's role meets the minimum required role */
export function hasMinRole(userRole: OrgRole | string, minRole: OrgRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as OrgRole] ?? 0;
  const minLevel = ROLE_HIERARCHY[minRole] ?? 0;
  return userLevel >= minLevel;
}

/** Assert minimum role or throw */
export function assertRole(userRole: OrgRole | string, minRole: OrgRole, action = "perform this action"): void {
  if (!hasMinRole(userRole, minRole)) {
    logSecurityEvent("authorization_denied", "medium", `Role "${userRole}" insufficient for "${action}" (needs: ${minRole})`);
    throw new Error(`Insufficient permissions to ${action}. Required: ${minRole}`);
  }
}
