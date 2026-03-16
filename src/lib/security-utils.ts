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
