/**
 * Resilience Utilities — Advanced error recovery patterns
 * Retry with backoff, circuit breaker, graceful degradation, timeout wrapper.
 */

/* ─── Retry with Exponential Backoff ─── */

export interface RetryOptions {
  /** Max number of attempts (including first) */
  maxAttempts?: number;
  /** Base delay in ms */
  baseDelay?: number;
  /** Max delay cap in ms */
  maxDelay?: number;
  /** Backoff multiplier */
  factor?: number;
  /** Add jitter to prevent thundering herd */
  jitter?: boolean;
  /** Only retry if this returns true */
  retryIf?: (error: unknown, attempt: number) => boolean;
  /** Called on each retry */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
}

const DEFAULT_RETRY: Required<Omit<RetryOptions, "retryIf" | "onRetry">> = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30_000,
  factor: 2,
  jitter: true,
};

function computeDelay(attempt: number, opts: typeof DEFAULT_RETRY): number {
  const raw = opts.baseDelay * Math.pow(opts.factor, attempt - 1);
  const capped = Math.min(raw, opts.maxDelay);
  if (!opts.jitter) return capped;
  return capped * (0.5 + Math.random() * 0.5);
}

export async function retryAsync<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;

      if (attempt >= opts.maxAttempts) break;
      if (opts.retryIf && !opts.retryIf(err, attempt)) break;

      const delay = computeDelay(attempt, opts);
      opts.onRetry?.(err, attempt, delay);
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/* ─── Circuit Breaker ─── */

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
  /** Failures before opening */
  failureThreshold?: number;
  /** Ms before attempting half-open */
  resetTimeout?: number;
  /** Called on state change */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private lastFailureAt = 0;
  private readonly threshold: number;
  private readonly resetTimeout: number;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.threshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 60_000;
    this.onStateChange = options.onStateChange;
  }

  private transition(to: CircuitState) {
    if (this.state === to) return;
    const from = this.state;
    this.state = to;
    this.onStateChange?.(from, to);
  }

  getState(): CircuitState {
    return this.state;
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailureAt >= this.resetTimeout) {
        this.transition("half-open");
      } else {
        throw new CircuitOpenError(this.resetTimeout - (Date.now() - this.lastFailureAt));
      }
    }

    try {
      const result = await fn();
      // Success: reset
      this.failures = 0;
      if (this.state === "half-open") {
        this.transition("closed");
      }
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailureAt = Date.now();

      if (this.failures >= this.threshold) {
        this.transition("open");
      }
      throw err;
    }
  }

  reset() {
    this.failures = 0;
    this.lastFailureAt = 0;
    this.transition("closed");
  }
}

export class CircuitOpenError extends Error {
  readonly retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super(`Circuit breaker open. Retry after ${Math.ceil(retryAfterMs / 1000)}s`);
    this.name = "CircuitOpenError";
    this.retryAfterMs = retryAfterMs;
  }
}

/* ─── Timeout Wrapper ─── */

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new TimeoutError(ms)), ms);
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}

/* ─── Graceful Degradation ─── */

export interface FallbackChainOptions<T> {
  /** Array of strategies to try in order */
  strategies: Array<{
    name: string;
    execute: () => Promise<T>;
  }>;
  /** Called when a strategy fails, before trying next */
  onFallback?: (failedStrategy: string, error: unknown, nextStrategy: string) => void;
}

/** Try strategies in order, return first success */
export async function fallbackChain<T>(
  options: FallbackChainOptions<T>
): Promise<T> {
  const { strategies, onFallback } = options;
  let lastError: unknown;

  for (let i = 0; i < strategies.length; i++) {
    try {
      return await strategies[i].execute();
    } catch (err) {
      lastError = err;
      if (i + 1 < strategies.length) {
        onFallback?.(strategies[i].name, err, strategies[i + 1].name);
      }
    }
  }

  throw lastError;
}

/* ─── Stale-While-Revalidate Cache ─── */

const swr = new Map<string, { data: unknown; fetchedAt: number }>();

export async function staleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  maxAge = 60_000
): Promise<T> {
  const cached = swr.get(key);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < maxAge) {
    return cached.data as T;
  }

  // Return stale data immediately but revalidate in background
  if (cached) {
    fetcher()
      .then((data) => swr.set(key, { data, fetchedAt: Date.now() }))
      .catch(() => {}); // silent revalidation failure
    return cached.data as T;
  }

  // No cache: must fetch
  const data = await fetcher();
  swr.set(key, { data, fetchedAt: now });
  return data;
}

/** Clear SWR cache */
export function clearSWRCache(key?: string) {
  if (key) swr.delete(key);
  else swr.clear();
}

/* ─── Network-Aware Check ─── */

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function isSlowConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as any).connection;
  if (!conn) return false;
  return conn.effectiveType === "slow-2g" || conn.effectiveType === "2g" || conn.saveData === true;
}

/* ─── Safe JSON Parse ─── */

export function safeJsonParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
