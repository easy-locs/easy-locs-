import { platformBus } from "@/lib/shared/platform-bus";

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
}

export interface RetryAttempt {
  operationId: string;
  attempt: number;
  delayMs: number;
  timestamp: number;
  succeeded: boolean;
  error?: string;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 15_000,
  jitterFactor: 0.5,
};

const LOAD_SAMPLE_WINDOW_MS = 30_000;
const MAX_RETRY_HISTORY = 200;

class AdaptiveRetryManager {
  private retryHistory: RetryAttempt[] = [];
  private recentFailures: number[] = [];
  private _installed = false;

  private computeLoadFactor(): number {
    const now = Date.now();
    const windowStart = now - LOAD_SAMPLE_WINDOW_MS;
    this.recentFailures = this.recentFailures.filter((t) => t >= windowStart);
    const failureCount = this.recentFailures.length;
    if (failureCount <= 2) return 1.0;
    if (failureCount <= 10) return 1.5;
    if (failureCount <= 25) return 2.5;
    return 4.0;
  }

  computeDelay(attempt: number, config: RetryConfig = DEFAULT_CONFIG): number {
    const loadFactor = this.computeLoadFactor();
    const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt - 1);
    const loadAdjusted = exponentialDelay * loadFactor;
    const jitterRange = loadAdjusted * config.jitterFactor;
    const jitter = (Math.random() * 2 - 1) * jitterRange;
    const finalDelay = Math.max(
      config.baseDelayMs,
      Math.min(loadAdjusted + jitter, config.maxDelayMs),
    );
    return Math.round(finalDelay);
  }

  async executeWithRetry<T>(
    operationId: string,
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
  ): Promise<T> {
    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= fullConfig.maxRetries + 1; attempt++) {
      try {
        const result = await fn();
        this.recordAttempt(operationId, attempt, 0, true);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        this.recentFailures.push(Date.now());

        if (attempt > fullConfig.maxRetries) {
          this.recordAttempt(operationId, attempt, 0, false, lastError.message);
          platformBus.emit(
            "system:retry_exhausted",
            {
              operationId,
              attempts: attempt,
              lastError: lastError.message,
              loadFactor: this.computeLoadFactor(),
            },
            "system",
          );
          break;
        }

        const delayMs = this.computeDelay(attempt, fullConfig);
        this.recordAttempt(
          operationId,
          attempt,
          delayMs,
          false,
          lastError.message,
        );

        platformBus.emit(
          "system:retry_attempt",
          {
            operationId,
            attempt,
            delayMs,
            loadFactor: this.computeLoadFactor(),
            error: lastError.message,
          },
          "system",
        );

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError!;
  }

  private recordAttempt(
    operationId: string,
    attempt: number,
    delayMs: number,
    succeeded: boolean,
    error?: string,
  ): void {
    this.retryHistory.push({
      operationId,
      attempt,
      delayMs,
      timestamp: Date.now(),
      succeeded,
      error,
    });
    if (this.retryHistory.length > MAX_RETRY_HISTORY) {
      this.retryHistory.shift();
    }
  }

  install(): () => void {
    if (this._installed) return () => {};
    this._installed = true;
    return () => {
      this._installed = false;
    };
  }

  getReport(): {
    totalRetries: number;
    successfulRetries: number;
    exhaustedRetries: number;
    currentLoadFactor: number;
    recentFailureCount: number;
    recentAttempts: RetryAttempt[];
  } {
    const successful = this.retryHistory.filter((r) => r.succeeded && r.attempt > 1).length;
    const exhausted = this.retryHistory.filter(
      (r) => !r.succeeded && r.attempt > DEFAULT_CONFIG.maxRetries,
    ).length;

    return {
      totalRetries: this.retryHistory.length,
      successfulRetries: successful,
      exhaustedRetries: exhausted,
      currentLoadFactor: this.computeLoadFactor(),
      recentFailureCount: this.recentFailures.length,
      recentAttempts: this.retryHistory.slice(-10),
    };
  }

  reset(): void {
    this.retryHistory = [];
    this.recentFailures = [];
    this._installed = false;
  }
}

export const adaptiveRetry = new AdaptiveRetryManager();
