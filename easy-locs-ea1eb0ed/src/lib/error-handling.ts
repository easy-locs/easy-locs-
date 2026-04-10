/**
 * PASS55 Block AR — Advanced Error Handling
 * Circuit breaker, retry logic, graceful degradation, and error classification.
 */

// ─── Error Classification ────────────────────────────────────────────────────

export type ErrorSeverity = "fatal" | "recoverable" | "transient" | "ignorable";
export type ErrorDomain = "network" | "auth" | "validation" | "database" | "payment" | "unknown";

export interface ClassifiedError {
  original: Error;
  severity: ErrorSeverity;
  domain: ErrorDomain;
  retryable: boolean;
  userMessage: string;
  code?: string;
}

/** Classify an error for appropriate handling */
export function classifyError(error: unknown): ClassifiedError {
  const err = error instanceof Error ? error : new Error(String(error));
  const msg = err.message.toLowerCase();

  // Network errors
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("timeout") || msg.includes("aborted") || msg.includes("econnrefused")) {
    return { original: err, severity: "transient", domain: "network", retryable: true, userMessage: "Connection issue. Retrying…" };
  }

  // Auth errors
  if (msg.includes("unauthorized") || msg.includes("401") || msg.includes("jwt") || msg.includes("token expired") || msg.includes("not authenticated")) {
    return { original: err, severity: "recoverable", domain: "auth", retryable: false, userMessage: "Session expired. Please log in again." };
  }

  // Validation
  if (msg.includes("validation") || msg.includes("invalid") || msg.includes("required") || msg.includes("constraint")) {
    return { original: err, severity: "recoverable", domain: "validation", retryable: false, userMessage: "Please check your input and try again." };
  }

  // Database
  if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("foreign key") || msg.includes("pgrst")) {
    return { original: err, severity: "recoverable", domain: "database", retryable: false, userMessage: "Data conflict. Please refresh and try again." };
  }

  // Payment
  if (msg.includes("payment") || msg.includes("stripe") || msg.includes("charge") || msg.includes("insufficient")) {
    return { original: err, severity: "recoverable", domain: "payment", retryable: false, userMessage: "Payment issue. Please try again or use a different method." };
  }

  return { original: err, severity: "recoverable", domain: "unknown", retryable: true, userMessage: "Something went wrong. Please try again." };
}

// ─── Retry with Backoff ──────────────────────────────────────────────────────

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

/** Execute a function with exponential backoff retry */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 30000,
    backoffFactor = 2,
    shouldRetry = () => true,
    onRetry,
  } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) throw error;
      const jitter = Math.random() * 0.3 + 0.85; // 0.85–1.15
      const delay = Math.min(baseDelayMs * Math.pow(backoffFactor, attempt - 1) * jitter, maxDelayMs);
      onRetry?.(error, attempt, delay);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  halfOpenAttempts?: number;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private lastFailure = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenAttempts: number;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState) => void;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000;
    this.halfOpenAttempts = options.halfOpenAttempts ?? 2;
    this.onStateChange = options.onStateChange;
  }

  private transition(to: CircuitState) {
    if (this.state === to) return;
    const from = this.state;
    this.state = to;
    this.onStateChange?.(from, to);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (Date.now() - this.lastFailure >= this.resetTimeoutMs) {
        this.transition("half_open");
        this.successes = 0;
      } else {
        throw new Error("Circuit breaker is OPEN — request blocked");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === "half_open") {
      this.successes++;
      if (this.successes >= this.halfOpenAttempts) {
        this.transition("closed");
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.state === "half_open" || this.failures >= this.failureThreshold) {
      this.transition("open");
    }
  }

  getState(): CircuitState { return this.state; }
  getFailures(): number { return this.failures; }
  reset() { this.failures = 0; this.successes = 0; this.transition("closed"); }
}

// ─── Graceful Degradation ────────────────────────────────────────────────────

/** Execute with fallback value on failure */
export async function withFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/** Execute with timeout */
export async function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

/** Execute multiple strategies in order, return first success */
export async function withFallbackChain<T>(...strategies: Array<() => Promise<T>>): Promise<T> {
  let lastError: unknown;
  for (const strategy of strategies) {
    try {
      return await strategy();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

// ─── Global Error Reporter ───────────────────────────────────────────────────

type ErrorReportHandler = (error: ClassifiedError) => void;
const reporters: ErrorReportHandler[] = [];

/** Register a global error reporter */
export function addErrorReporter(handler: ErrorReportHandler): () => void {
  reporters.push(handler);
  return () => {
    const idx = reporters.indexOf(handler);
    if (idx >= 0) reporters.splice(idx, 1);
  };
}

/** Report a classified error to all registered reporters */
export function reportError(error: unknown): ClassifiedError {
  const classified = classifyError(error);
  reporters.forEach((r) => { try { r(classified); } catch {} });
  return classified;
}
