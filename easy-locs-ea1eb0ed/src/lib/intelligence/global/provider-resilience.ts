import type { CanonicalGlobalFeedItem } from "@/domains/shared/canonical-types";

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 60_000;
const HALF_OPEN_MAX_REQUESTS = 1;
const MAX_OPEN_DURATION_MS = 300_000;

export interface CircuitBreaker {
  state: () => CircuitState;
  canRequest: () => boolean;
  recordSuccess: () => void;
  recordFailure: () => void;
  reset: () => void;
}

export function createCircuitBreaker(providerId: string): CircuitBreaker {
  let state: CircuitState = "CLOSED";
  let consecutiveFailures = 0;
  let openedAt = 0;
  let halfOpenRequests = 0;

  function transitionToOpen(): void {
    state = "OPEN";
    openedAt = Date.now();
    halfOpenRequests = 0;
  }

  function transitionToClosed(): void {
    state = "CLOSED";
    consecutiveFailures = 0;
    halfOpenRequests = 0;
  }

  function tryTransitionToHalfOpen(): void {
    if (state !== "OPEN") return;
    const elapsed = Date.now() - openedAt;
    if (elapsed >= COOLDOWN_MS || elapsed >= MAX_OPEN_DURATION_MS) {
      state = "HALF_OPEN";
      halfOpenRequests = 0;
    }
  }

  return {
    state: () => {
      tryTransitionToHalfOpen();
      return state;
    },
    canRequest: () => {
      tryTransitionToHalfOpen();
      if (state === "CLOSED") return true;
      if (state === "HALF_OPEN") {
        if (halfOpenRequests < HALF_OPEN_MAX_REQUESTS) {
          halfOpenRequests++;
          return true;
        }
        return false;
      }
      return false;
    },
    recordSuccess: () => {
      if (state === "HALF_OPEN" || state === "CLOSED") {
        transitionToClosed();
      }
    },
    recordFailure: () => {
      if (state === "HALF_OPEN") {
        transitionToOpen();
        return;
      }
      consecutiveFailures++;
      if (consecutiveFailures >= FAILURE_THRESHOLD) {
        transitionToOpen();
      }
    },
    reset: () => {
      transitionToClosed();
    },
  };
}

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
  maxStaleMs: number;
}

const MAX_ENTRIES_PER_PROVIDER = 50;

export interface ProviderCache {
  get: (key: string) => CanonicalGlobalFeedItem[] | null;
  getStale: (key: string) => CanonicalGlobalFeedItem[] | null;
  set: (key: string, data: CanonicalGlobalFeedItem[]) => void;
  clear: () => void;
}

export function createProviderCache(ttlMs: number, maxStaleMs: number): ProviderCache {
  const store = new Map<string, CacheEntry<CanonicalGlobalFeedItem[]>>();
  const accessOrder: string[] = [];

  function evictIfNeeded(): void {
    while (store.size >= MAX_ENTRIES_PER_PROVIDER && accessOrder.length > 0) {
      const oldest = accessOrder.shift();
      if (oldest) store.delete(oldest);
    }
  }

  function touchKey(key: string): void {
    const idx = accessOrder.indexOf(key);
    if (idx !== -1) accessOrder.splice(idx, 1);
    accessOrder.push(key);
  }

  return {
    get: (key: string) => {
      const entry = store.get(key);
      if (!entry) return null;
      const now = Date.now();
      if (now - entry.cachedAt > entry.ttlMs) return null;
      touchKey(key);
      return entry.data;
    },
    getStale: (key: string) => {
      const entry = store.get(key);
      if (!entry) return null;
      const now = Date.now();
      if (now - entry.cachedAt > entry.maxStaleMs) {
        store.delete(key);
        return null;
      }
      touchKey(key);
      return entry.data;
    },
    set: (key: string, data: CanonicalGlobalFeedItem[]) => {
      evictIfNeeded();
      store.set(key, { data, cachedAt: Date.now(), ttlMs, maxStaleMs });
      touchKey(key);
    },
    clear: () => {
      store.clear();
      accessOrder.length = 0;
    },
  };
}

const DEFAULT_TIMEOUT_MS = 5_000;

export async function fetchWithTimeout(url: string, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

const inFlightRequests = new Map<string, Promise<CanonicalGlobalFeedItem[]>>();

export function fetchWithDedup(
  key: string,
  fetchFn: () => Promise<CanonicalGlobalFeedItem[]>,
): Promise<CanonicalGlobalFeedItem[]> {
  const existing = inFlightRequests.get(key);
  if (existing) return existing;
  const promise = fetchFn().finally(() => inFlightRequests.delete(key));
  inFlightRequests.set(key, promise);
  return promise;
}

const MAX_RETRIES = 2;
const BACKOFF_BASE_MS = 1_000;
const JITTER_MAX_MS = 200;

function isRetryable(status: number): boolean {
  return status >= 500 && status < 600;
}

export async function fetchWithRetry(
  url: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, timeoutMs);
      if (response.ok || !isRetryable(response.status)) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      lastError = err;
    }
    if (attempt < MAX_RETRIES) {
      const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt);
      const jitter = Math.random() * JITTER_MAX_MS * 2 - JITTER_MAX_MS;
      await new Promise(r => setTimeout(r, backoff + jitter));
    }
  }
  throw lastError;
}

interface RateLimiterState {
  sessionCount: number;
  countryWindows: Map<string, { count: number; windowStart: number }>;
  globalMinuteWindow: { count: number; windowStart: number };
}

const PER_SESSION_LIMIT = 200;
const PER_COUNTRY_WINDOW_MS = 300_000;
const PER_COUNTRY_LIMIT = 10;
const GLOBAL_MINUTE_WINDOW_MS = 60_000;
const GLOBAL_MINUTE_LIMIT = 20;

export interface RateLimiter {
  canRequest: (country: string) => boolean;
  recordRequest: (country: string) => void;
  reset: () => void;
}

export function createRateLimiter(): RateLimiter {
  const state: RateLimiterState = {
    sessionCount: 0,
    countryWindows: new Map(),
    globalMinuteWindow: { count: 0, windowStart: Date.now() },
  };

  return {
    canRequest: (country: string) => {
      if (state.sessionCount >= PER_SESSION_LIMIT) return false;

      const now = Date.now();
      const countryWindow = state.countryWindows.get(country);
      if (countryWindow) {
        if (now - countryWindow.windowStart < PER_COUNTRY_WINDOW_MS && countryWindow.count >= PER_COUNTRY_LIMIT) {
          return false;
        }
      }

      if (now - state.globalMinuteWindow.windowStart < GLOBAL_MINUTE_WINDOW_MS && state.globalMinuteWindow.count >= GLOBAL_MINUTE_LIMIT) {
        return false;
      }

      return true;
    },
    recordRequest: (country: string) => {
      state.sessionCount++;

      const now = Date.now();
      const countryWindow = state.countryWindows.get(country);
      if (!countryWindow || now - countryWindow.windowStart >= PER_COUNTRY_WINDOW_MS) {
        state.countryWindows.set(country, { count: 1, windowStart: now });
      } else {
        countryWindow.count++;
      }

      if (now - state.globalMinuteWindow.windowStart >= GLOBAL_MINUTE_WINDOW_MS) {
        state.globalMinuteWindow = { count: 1, windowStart: now };
      } else {
        state.globalMinuteWindow.count++;
      }
    },
    reset: () => {
      state.sessionCount = 0;
      state.countryWindows.clear();
      state.globalMinuteWindow = { count: 0, windowStart: Date.now() };
    },
  };
}

const ANTI_STORM_LIMIT = 100;

export function applyAntiStorm(items: CanonicalGlobalFeedItem[]): CanonicalGlobalFeedItem[] {
  if (items.length <= ANTI_STORM_LIMIT) return items;
  return items.slice(0, ANTI_STORM_LIMIT);
}
