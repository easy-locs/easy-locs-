const buckets = new Map<string, { count: number; resetAt: number }>();

interface ThrottleConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIGS: Record<string, ThrottleConfig> = {
  "api:default": { maxRequests: 60, windowMs: 60_000 },
  "api:auth": { maxRequests: 5, windowMs: 60_000 },
  "api:search": { maxRequests: 30, windowMs: 60_000 },
  "api:booking": { maxRequests: 10, windowMs: 60_000 },
  "api:payment": { maxRequests: 5, windowMs: 60_000 },
  "api:review": { maxRequests: 10, windowMs: 60_000 },
  "api:dispatch": { maxRequests: 20, windowMs: 60_000 },
};

export interface ThrottleResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkThrottle(key: string): ThrottleResult {
  const config = DEFAULT_CONFIGS[key] ?? DEFAULT_CONFIGS["api:default"];
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + config.windowMs };
    buckets.set(key, bucket);
  }

  if (bucket.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: bucket.resetAt - now,
    };
  }

  bucket.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - bucket.count,
    retryAfterMs: 0,
  };
}

export function throttledFetch(
  key: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const result = checkThrottle(key);
  if (!result.allowed) {
    return Promise.reject(
      new ThrottleError(key, result.retryAfterMs),
    );
  }
  return fetch(input, init);
}

export class ThrottleError extends Error {
  readonly retryAfterMs: number;
  readonly throttleKey: string;

  constructor(key: string, retryAfterMs: number) {
    super(`Rate limit exceeded for "${key}". Retry after ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = "ThrottleError";
    this.throttleKey = key;
    this.retryAfterMs = retryAfterMs;
  }
}

export function resetThrottle(key?: string) {
  if (key) {
    buckets.delete(key);
  } else {
    buckets.clear();
  }
}

export function registerThrottleConfig(key: string, config: ThrottleConfig) {
  DEFAULT_CONFIGS[key] = config;
}

if (typeof window !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now >= bucket.resetAt) {
        buckets.delete(key);
      }
    }
  }, 30_000);
}
