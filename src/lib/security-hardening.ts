/**
 * Security Hardening — PASS55 Block AU
 * Rate limiting, input sanitization, CSRF protection, secure headers.
 */

// ─── Rate Limiter (sliding window, in-memory) ───────────────────────────
interface RateLimitEntry { timestamps: number[] }

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  constructor(
    private maxRequests: number,
    private windowMs: number,
  ) {}

  /** Returns true if the request is allowed */
  attempt(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key) || { timestamps: [] };
    entry.timestamps = entry.timestamps.filter(t => now - t < this.windowMs);
    if (entry.timestamps.length >= this.maxRequests) return false;
    entry.timestamps.push(now);
    this.store.set(key, entry);
    return true;
  }

  remaining(key: string): number {
    const now = Date.now();
    const entry = this.store.get(key);
    if (!entry) return this.maxRequests;
    const valid = entry.timestamps.filter(t => now - t < this.windowMs);
    return Math.max(0, this.maxRequests - valid.length);
  }

  reset(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
}

// ─── Input Sanitization ─────────────────────────────────────────────────
const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;", "<": "&lt;", ">": "&gt;",
  '"': "&quot;", "'": "&#x27;", "/": "&#x2F;",
};

/** Escapes HTML entities to prevent XSS */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"'/]/g, ch => HTML_ENTITIES[ch] || ch);
}

/** Strips all HTML tags from input */
export function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/** Sanitizes input: trims, strips tags, limits length */
export function sanitizeInput(input: string, maxLength = 1000): string {
  return stripTags(input).trim().slice(0, maxLength);
}

/** Validates email format */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Validates UUID v4 format */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

// ─── CSRF Token ─────────────────────────────────────────────────────────
let _csrfToken: string | null = null;

export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  _csrfToken = Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
  return _csrfToken;
}

export function getCSRFToken(): string | null { return _csrfToken; }

export function validateCSRFToken(token: string): boolean {
  return !!_csrfToken && token === _csrfToken;
}

// ─── Content Security ───────────────────────────────────────────────────
/** Detects potential SQL injection patterns */
export function hasSQLInjection(input: string): boolean {
  const patterns = [
    /(\b(union|select|insert|update|delete|drop|alter|exec|execute)\b)/i,
    /(--|#|\/\*)/,
    /(\bor\b\s+\d+\s*=\s*\d+)/i,
    /('\s*(or|and)\s+')/i,
  ];
  return patterns.some(p => p.test(input));
}

/** Detects potential XSS patterns */
export function hasXSSPattern(input: string): boolean {
  const patterns = [
    /<script[\s>]/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:\s*text\/html/i,
  ];
  return patterns.some(p => p.test(input));
}

/** Full security check on user input */
export function securityCheck(input: string): { safe: boolean; threats: string[] } {
  const threats: string[] = [];
  if (hasSQLInjection(input)) threats.push("sql_injection");
  if (hasXSSPattern(input)) threats.push("xss");
  return { safe: threats.length === 0, threats };
}
