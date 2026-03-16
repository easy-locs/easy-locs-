/**
 * Security Hardening — AU Block
 * Advanced rate limiting, CSRF protection, secure headers, content validation.
 */

// ── Advanced Rate Limiter with sliding window ───────────────────────────────

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateLimitBucket>();

export interface RateLimitConfig {
  maxTokens: number;
  refillRate: number;      // tokens per second
  refillInterval?: number; // ms between refills (default 1000)
}

export function tokenBucketCheck(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const interval = config.refillInterval ?? 1000;
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now };
    buckets.set(key, bucket);
  }

  // Refill tokens
  const elapsed = now - bucket.lastRefill;
  const refillTokens = Math.floor(elapsed / interval) * config.refillRate;
  if (refillTokens > 0) {
    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + refillTokens);
    bucket.lastRefill = now;
  }

  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: bucket.tokens, retryAfterMs: 0 };
  }

  const retryAfterMs = interval - (now - bucket.lastRefill);
  return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
}

export function resetBucket(key: string): void {
  buckets.delete(key);
}

// ── CSRF Token Manager ─────────────────────────────────────────────────────

let _csrfToken: string | null = null;

export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  _csrfToken = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  return _csrfToken;
}

export function validateCSRFToken(token: string): boolean {
  if (!_csrfToken || !token) return false;
  if (token.length !== _csrfToken.length) return false;
  // Constant-time comparison
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ _csrfToken.charCodeAt(i);
  }
  return result === 0;
}

export function getCSRFToken(): string | null {
  return _csrfToken;
}

// ── Content Security Policy Builder ─────────────────────────────────────────

export interface CSPDirectives {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  frameSrc?: string[];
  mediaSrc?: string[];
  objectSrc?: string[];
  reportUri?: string;
}

export function buildCSP(directives: CSPDirectives): string {
  const map: Record<string, string> = {
    defaultSrc: "default-src",
    scriptSrc: "script-src",
    styleSrc: "style-src",
    imgSrc: "img-src",
    connectSrc: "connect-src",
    fontSrc: "font-src",
    frameSrc: "frame-src",
    mediaSrc: "media-src",
    objectSrc: "object-src",
  };

  const parts: string[] = [];
  for (const [key, directive] of Object.entries(map)) {
    const values = directives[key as keyof CSPDirectives];
    if (Array.isArray(values) && values.length > 0) {
      parts.push(`${directive} ${values.join(" ")}`);
    }
  }
  if (directives.reportUri) {
    parts.push(`report-uri ${directives.reportUri}`);
  }
  return parts.join("; ");
}

// ── Input Sanitization Patterns ─────────────────────────────────────────────

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b)/i,
  /(--|;|\/\*|\*\/|xp_)/i,
  /('|"|`)\s*(OR|AND)\s*('|"|`)/i,
];

const XSS_PATTERNS = [
  /<script[^>]*>/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /data\s*:\s*text\/html/i,
  /<iframe[^>]*>/i,
  /<object[^>]*>/i,
  /<embed[^>]*>/i,
];

export function detectSQLInjection(input: string): boolean {
  return SQL_INJECTION_PATTERNS.some((p) => p.test(input));
}

export function detectXSS(input: string): boolean {
  return XSS_PATTERNS.some((p) => p.test(input));
}

export interface ValidationResult {
  safe: boolean;
  threats: string[];
}

export function validateInput(input: string): ValidationResult {
  const threats: string[] = [];
  if (detectSQLInjection(input)) threats.push("sql_injection");
  if (detectXSS(input)) threats.push("xss");
  return { safe: threats.length === 0, threats };
}

// ── Secure Headers Helper ───────────────────────────────────────────────────

export function getSecureHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  };
}

// ── Request Fingerprinting ──────────────────────────────────────────────────

export function fingerprint(components: Record<string, string>): string {
  const sorted = Object.keys(components).sort().map((k) => `${k}=${components[k]}`).join("|");
  // Simple hash
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
