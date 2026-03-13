/**
 * Orbit Rate Limiter — Client-side anti-spam & abuse protection
 * 
 * Implements token bucket algorithm for message rate limiting.
 * Prevents message flooding, spam, and abuse at the client level.
 * Server-side validation should also be in place via RLS/Edge Functions.
 */

interface RateBucket {
  tokens: number;
  lastRefill: number;
  violations: number;
  cooldownUntil: number;
}

const buckets = new Map<string, RateBucket>();

// Default limits
const DEFAULT_CONFIG = {
  /** Max messages per window */
  maxTokens: 30,
  /** Refill rate: tokens per second */
  refillRate: 2,
  /** Cooldown after violations (ms) */
  cooldownMs: 30_000,
  /** Violations before cooldown */
  violationThreshold: 3,
  /** Min interval between messages (ms) */
  minInterval: 300,
};

interface RateLimitResult {
  allowed: boolean;
  /** Seconds until next allowed message */
  retryAfter: number;
  /** Current remaining tokens */
  remaining: number;
  /** Whether user is in cooldown */
  inCooldown: boolean;
}

let lastSendTime = 0;

export function checkMessageRate(userId: string, config = DEFAULT_CONFIG): RateLimitResult {
  const now = Date.now();

  // Min interval check
  if (now - lastSendTime < config.minInterval) {
    return {
      allowed: false,
      retryAfter: Math.ceil((config.minInterval - (now - lastSendTime)) / 1000),
      remaining: 0,
      inCooldown: false,
    };
  }

  let bucket = buckets.get(userId);
  if (!bucket) {
    bucket = {
      tokens: config.maxTokens,
      lastRefill: now,
      violations: 0,
      cooldownUntil: 0,
    };
    buckets.set(userId, bucket);
  }

  // Check cooldown
  if (bucket.cooldownUntil > now) {
    return {
      allowed: false,
      retryAfter: Math.ceil((bucket.cooldownUntil - now) / 1000),
      remaining: 0,
      inCooldown: true,
    };
  }

  // Refill tokens
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + elapsed * config.refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    bucket.violations++;
    if (bucket.violations >= config.violationThreshold) {
      bucket.cooldownUntil = now + config.cooldownMs;
      bucket.violations = 0;
    }
    return {
      allowed: false,
      retryAfter: Math.ceil(1 / config.refillRate),
      remaining: 0,
      inCooldown: bucket.cooldownUntil > now,
    };
  }

  // Consume token
  bucket.tokens -= 1;
  lastSendTime = now;

  return {
    allowed: true,
    retryAfter: 0,
    remaining: Math.floor(bucket.tokens),
    inCooldown: false,
  };
}

/** Check file/media upload rate (stricter) */
export function checkMediaRate(userId: string): RateLimitResult {
  return checkMessageRate(userId + ":media", {
    maxTokens: 10,
    refillRate: 0.5,
    cooldownMs: 60_000,
    violationThreshold: 2,
    minInterval: 1000,
  });
}

/** Reset rate limiter (e.g., on logout) */
export function resetRateLimiter(userId?: string): void {
  if (userId) {
    buckets.delete(userId);
    buckets.delete(userId + ":media");
  } else {
    buckets.clear();
  }
  lastSendTime = 0;
}

/** Content abuse detection */
export function detectAbuse(content: string): { suspicious: boolean; reason?: string } {
  // Repeated character spam
  if (/(.)\1{20,}/.test(content)) {
    return { suspicious: true, reason: "Repeated character spam" };
  }

  // Extremely long message
  if (content.length > 10_000) {
    return { suspicious: true, reason: "Message too long" };
  }

  // Repeated word spam (same word 10+ times)
  const words = content.toLowerCase().split(/\s+/);
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
    if ((freq.get(w) || 0) > 10 && w.length > 2) {
      return { suspicious: true, reason: "Repeated word spam" };
    }
  }

  return { suspicious: false };
}
