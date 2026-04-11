import type { RateLimitState } from "./types";

const limiters = new Map<string, RateLimitState>();

const DEFAULT_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "identity.otp.request": { limit: 5, windowMs: 300_000 },
  "identity.otp.verify": { limit: 10, windowMs: 300_000 },
  "identity.login.attempt": { limit: 8, windowMs: 600_000 },
  "wallet.transfer.submit": { limit: 10, windowMs: 60_000 },
  "wallet.topup.submit": { limit: 5, windowMs: 60_000 },
  "orbit.message.send": { limit: 60, windowMs: 60_000 },
  "orbit.call.start": { limit: 10, windowMs: 60_000 },
};

export function checkRateLimit(key: string, customLimit?: number, customWindowMs?: number): RateLimitState {
  const defaults = DEFAULT_LIMITS[key] || { limit: 30, windowMs: 60_000 };
  const limit = customLimit ?? defaults.limit;
  const windowMs = customWindowMs ?? defaults.windowMs;
  const now = Date.now();

  let state = limiters.get(key);

  if (!state || now - state.windowStart > windowMs) {
    state = { key, count: 0, windowStart: now, windowMs, limit, blocked: false };
    limiters.set(key, state);
  }

  state.count++;
  state.blocked = state.count > limit;

  return { ...state };
}

export function peekRateLimit(key: string): RateLimitState {
  const defaults = DEFAULT_LIMITS[key] || { limit: 30, windowMs: 60_000 };
  const state = limiters.get(key);
  const now = Date.now();

  if (!state || now - state.windowStart > state.windowMs) {
    return { key, count: 0, windowStart: now, windowMs: defaults.windowMs, limit: defaults.limit, blocked: false };
  }

  return { ...state, blocked: state.count > state.limit };
}

export function isRateLimited(key: string): boolean {
  const state = limiters.get(key);
  if (!state) return false;
  const now = Date.now();
  if (now - state.windowStart > state.windowMs) return false;
  return state.count > state.limit;
}

export function getRateLimitRemaining(key: string): number {
  const state = limiters.get(key);
  if (!state) return Infinity;
  const now = Date.now();
  if (now - state.windowStart > state.windowMs) return state.limit;
  return Math.max(0, state.limit - state.count);
}

export function resetRateLimit(key: string): void {
  limiters.delete(key);
}

export function getRateLimitStats(): Record<string, { count: number; limit: number; blocked: boolean; remaining: number }> {
  const stats: Record<string, { count: number; limit: number; blocked: boolean; remaining: number }> = {};
  const now = Date.now();
  for (const [key, state] of limiters) {
    if (now - state.windowStart > state.windowMs) continue;
    stats[key] = {
      count: state.count,
      limit: state.limit,
      blocked: state.blocked,
      remaining: Math.max(0, state.limit - state.count),
    };
  }
  return stats;
}
