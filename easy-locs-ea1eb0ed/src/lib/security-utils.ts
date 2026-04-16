/**
 * Input Sanitization & Validation Utilities
 * Centralizes security-critical input processing for the platform.
 * Uses DOMPurify for robust XSS protection instead of regex.
 */
import DOMPurify from "dompurify";

/** Sanitize HTML content — removes all dangerous tags/attributes via DOMPurify */
export function stripHtml(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

/** Sanitize a string for safe display — strips all HTML via DOMPurify */
export function sanitizeText(input: string, maxLength = 5000): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .slice(0, maxLength)
    .trim();
}

/** Sanitize HTML while allowing safe formatting tags */
export function sanitizeRichText(input: string, maxLength = 10000): string {
  if (!input) return "";
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  })
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

/**
 * @deprecated Client-side in-memory rate limiting is ineffective in stateless environments.
 * Use server-side rate limiting (e.g. Supabase RLS, edge function guards, or Redis) instead.
 * This stub remains for backward compatibility but always returns allowed=true.
 */
export function checkRateLimit(
  _key: string,
  _maxAttempts: number,
  _windowMs: number
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  console.warn("[security-utils] checkRateLimit is deprecated — client-side in-memory rate limiting is ineffective. Use server-side rate limiting.");
  return { allowed: true, remaining: _maxAttempts, retryAfterMs: 0 };
}

/**
 * @deprecated No-op. Client-side rate limit store has been removed.
 */
export function cleanupRateLimits(): void {}

/** Validate monetary amount */
export function validateAmount(amount: unknown): number | null {
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 0 || num > 999_999_999) return null;
  return Math.round(num * 100) / 100;
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

/**
 * Inject a Content-Security-Policy meta tag into the document head.
 * Call once at app startup for defense-in-depth XSS protection.
 */
export function injectCSPMeta() {
  if (typeof document === "undefined") return;
  if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;

  const policy = [
    "default-src 'self'",
    "script-src 'self' https://fonts.googleapis.com https://*.posthog.com https://*.sentry.io https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.posthog.com https://*.sentry.io https://fonts.googleapis.com https://fonts.gstatic.com https://api.stripe.com https://api.mapbox.com https://*.tiles.mapbox.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  const meta = document.createElement("meta");
  meta.httpEquiv = "Content-Security-Policy";
  meta.content = policy;
  document.head.prepend(meta);
}

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
    /(javascript|vbscript|data):/i,
    /on(load|error|click|mouseover|focus|blur|submit|reset|change|input|keydown|keyup|keypress)\s*=/i,
    /(union\s+select|drop\s+table|insert\s+into|delete\s+from)/i,
    /(\-\-|\/\*|\*\/|;)/,
    /<svg[\s>]/i,
    /<(iframe|object|embed|form|foreignObject)/i,
    /\bexpression\s*\(/i,
    /url\s*\(\s*['"]?\s*data:/i,
  ];
  return patterns.some(p => p.test(input));
}

export function sanitizeDataUri(input: string): string {
  return input.replace(/data:[^\s"'>]+/gi, "");
}

export function validateTelegramUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== "string") {
    return { valid: false, error: "Username is required" };
  }
  const cleaned = username.replace(/^@/, "").trim();
  if (cleaned.length < 5) {
    return { valid: false, error: "Username must be at least 5 characters" };
  }
  if (cleaned.length > 32) {
    return { valid: false, error: "Username must be at most 32 characters" };
  }
  if (!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(cleaned)) {
    return { valid: false, error: "Username must start with a letter and contain only letters, numbers, and underscores" };
  }
  return { valid: true };
}

export function validateSmsPhoneNumber(phone: string): { valid: boolean; cleaned: string; error?: string } {
  if (!phone || typeof phone !== "string") {
    return { valid: false, cleaned: "", error: "Phone number is required" };
  }
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  if (!cleaned || cleaned.length < 7) {
    return { valid: false, cleaned, error: "Phone number must be at least 7 digits" };
  }
  if (!/^\+?[1-9]\d{6,14}$/.test(cleaned)) {
    return { valid: false, cleaned, error: "Invalid phone number format. Use international format (+33...)" };
  }
  return { valid: true, cleaned };
}

/** Verify essential security configurations at startup */
export function auditSecurityConfig(): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  if (typeof location !== "undefined" && location.protocol !== "https:" && location.hostname !== "localhost") {
    issues.push("App not served over HTTPS");
  }

  if (typeof document !== "undefined") {
    const referrerMeta = document.querySelector('meta[name="referrer"]');
    if (!referrerMeta) {
      issues.push("No referrer policy meta tag");
    }
  }

  return { passed: issues.length === 0, issues };
}
