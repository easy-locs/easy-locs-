/**
 * Input Sanitization & Validation Utilities
 * Centralizes security-critical input processing for the platform.
 */

/** Strip HTML tags to prevent XSS in user-generated text */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "").trim();
}

/** Sanitize a string for safe display — removes scripts and event handlers */
export function sanitizeText(input: string, maxLength = 5000): string {
  if (!input) return "";
  return stripHtml(input)
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .replace(/javascript:/gi, "") // Remove JS protocol
    .replace(/data:/gi, "") // Remove data protocol
    .slice(0, maxLength)
    .trim();
}

/** Validate and sanitize an email address */
export function sanitizeEmail(email: string): string | null {
  const cleaned = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleaned) || cleaned.length > 255) return null;
  return cleaned;
}

/** Validate phone number — basic international format */
export function sanitizePhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  if (!/^\+?\d{7,15}$/.test(cleaned)) return null;
  return cleaned;
}

/** Sanitize URL — only allow http/https protocols */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Rate limiter — tracks action counts per key in memory */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, retryAfterMs: 0 };
  }

  if (entry.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: entry.resetAt - now,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxAttempts - entry.count,
    retryAfterMs: 0,
  };
}

/** Clean up expired rate limit entries (call periodically) */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now >= entry.resetAt) rateLimitStore.delete(key);
  }
}

/** Validate monetary amount */
export function validateAmount(amount: unknown): number | null {
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 0 || num > 999_999_999) return null;
  return Math.round(num * 100) / 100; // 2 decimal places
}

/** Generate a CSRF-like token for forms */
export function generateFormToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Validate that a string is a valid UUID */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// ── CSP Meta Tag ──────────────────────────────────────────────────────

/**
 * Inject a Content-Security-Policy meta tag into the document head.
 * Call once at app startup for defense-in-depth XSS protection.
 */
export function injectCSPMeta() {
  if (typeof document === "undefined") return;
  if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;

  const policy = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://api.stripe.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  const meta = document.createElement("meta");
  meta.httpEquiv = "Content-Security-Policy";
  meta.content = policy;
  document.head.prepend(meta);
}

// ── Request Fingerprinting ────────────────────────────────────────────

/**
 * Generate a simple browser fingerprint for rate-limiting anonymous users.
 * NOT for tracking — only for abuse prevention.
 */
export function getBrowserFingerprint(): string {
  if (typeof navigator === "undefined") return "server";
  const components = [
    navigator.userAgent,
    navigator.language,
    screen?.width,
    screen?.height,
    screen?.colorDepth,
    new Date().getTimezoneOffset(),
  ];
  return simpleHash(components.join("|"));
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// ── Input Validation Schemas ──────────────────────────────────────────

/** Validate a password meets minimum security requirements */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Must be at least 8 characters");
  if (password.length > 128) errors.push("Must be at most 128 characters");
  if (!/[a-z]/.test(password)) errors.push("Must contain a lowercase letter");
  if (!/[A-Z]/.test(password)) errors.push("Must contain an uppercase letter");
  if (!/\d/.test(password)) errors.push("Must contain a number");
  return { valid: errors.length === 0, errors };
}

/** Sanitize a filename for safe storage */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w\s\-\.]/g, "")
    .replace(/\s+/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 255);
}

/** Check for common injection patterns in user input */
export function hasInjectionPatterns(input: string): boolean {
  const patterns = [
    /(<script|<\/script)/i,
    /(javascript|vbscript):/i,
    /on(load|error|click|mouseover|focus|blur)\s*=/i,
    /(union\s+select|drop\s+table|insert\s+into|delete\s+from)/i,
    /(\-\-|\/\*|\*\/|;)/,
  ];
  return patterns.some(p => p.test(input));
}

// ── Security Headers Check ────────────────────────────────────────────

/** Verify essential security configurations at startup */
export function auditSecurityConfig(): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check HTTPS
  if (typeof location !== "undefined" && location.protocol !== "https:" && location.hostname !== "localhost") {
    issues.push("App not served over HTTPS");
  }

  // Check referrer policy
  if (typeof document !== "undefined") {
    const referrerMeta = document.querySelector('meta[name="referrer"]');
    if (!referrerMeta) {
      issues.push("No referrer policy meta tag");
    }
  }

  return { passed: issues.length === 0, issues };
}
