/**
 * Stripe Connect — Idempotent split payout helpers.
 *
 * This module contains the pure logic needed to:
 *  1. Generate a deterministic idempotency key for a split payout
 *  2. Compute a split breakdown (driver / platform) for a gross fare
 *  3. Apply exponential backoff to transient gateway errors
 *
 * The actual HTTP call is expected to be performed by an adapter or edge
 * function that imports these helpers. Keeping the math and retry policy pure
 * lets us unit-test the most failure-prone surface without a live gateway.
 */

export interface SplitInput {
  grossAmount: number;
  currency: string;
  platformFeePct: number;
  processingFee?: number;
  tip?: number;
}

export interface SplitBreakdown {
  gross: number;
  platformFee: number;
  processingFee: number;
  driverAmount: number;
  tip: number;
  currency: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeSplit(input: SplitInput): SplitBreakdown {
  if (input.grossAmount < 0) throw new Error("gross must be >= 0");
  if (input.platformFeePct < 0 || input.platformFeePct > 0.5) {
    throw new Error("platformFeePct must be between 0 and 0.5");
  }
  const processingFee = round2(input.processingFee ?? 0);
  if (processingFee < 0) throw new Error("processingFee must be >= 0");
  const tip = round2(input.tip ?? 0);
  if (tip < 0) throw new Error("tip must be >= 0");
  const platformFee = round2(input.grossAmount * input.platformFeePct);
  const driverAmount = round2(input.grossAmount - platformFee - processingFee + tip);
  if (driverAmount < 0) {
    throw new Error(
      `invalid split: driver amount would be negative (gross=${input.grossAmount}, platformFee=${platformFee}, processingFee=${processingFee}, tip=${tip})`,
    );
  }

  return {
    gross: round2(input.grossAmount),
    platformFee,
    processingFee,
    tip,
    driverAmount,
    currency: input.currency,
  };
}

/**
 * Build a deterministic idempotency key for a payout. The same inputs always
 * produce the same key, which is the Stripe-recommended way to avoid
 * double-charging on webhook retries.
 */
export function buildIdempotencyKey(params: {
  jobId: string;
  driverId: string;
  grossAmount: number;
  currency: string;
  purpose: "charge" | "transfer" | "refund";
}): string {
  const amountCents = Math.round(params.grossAmount * 100);
  return [
    "pay",
    params.purpose,
    params.jobId,
    params.driverId,
    `${amountCents}${params.currency.toLowerCase()}`,
  ].join(":");
}

export interface RetryDecision {
  shouldRetry: boolean;
  delayMs: number;
  attempt: number;
}

/** Stripe error categorization: what is safe to retry? */
export function classifyStripeError(err: {
  code?: string;
  type?: string;
  status?: number;
}): "retryable" | "permanent" {
  if (!err) return "permanent";
  if (err.status && err.status >= 500) return "retryable";
  if (err.status === 429) return "retryable";
  if (err.type === "api_connection_error" || err.type === "api_error") return "retryable";
  if (err.code === "lock_timeout" || err.code === "rate_limit") return "retryable";
  return "permanent";
}

/**
 * Exponential backoff with jitter. Returns the sleep duration before the next
 * attempt. Caller should stop retrying when shouldRetry=false.
 */
export function nextRetry(
  attempt: number,
  err: { code?: string; type?: string; status?: number },
  options: { maxAttempts?: number; baseMs?: number; capMs?: number } = {},
): RetryDecision {
  const maxAttempts = options.maxAttempts ?? 5;
  const baseMs = options.baseMs ?? 300;
  const capMs = options.capMs ?? 8000;

  if (attempt >= maxAttempts) {
    return { shouldRetry: false, delayMs: 0, attempt };
  }
  if (classifyStripeError(err) === "permanent") {
    return { shouldRetry: false, delayMs: 0, attempt };
  }

  const expo = Math.min(capMs, baseMs * 2 ** attempt);
  const jitter = Math.floor(expo * 0.25 * Math.random());
  return { shouldRetry: true, delayMs: expo + jitter, attempt: attempt + 1 };
}

/**
 * Minimal webhook verification helper — returns whether the incoming event
 * should be processed. Deduplication is enforced by the idempotency store that
 * the caller maintains.
 */
export function shouldProcessWebhook(params: {
  eventId: string;
  seenEventIds: Set<string>;
  deliveryAttempt?: number;
  maxDeliveryAttempts?: number;
}): { process: boolean; reason: string } {
  if (params.seenEventIds.has(params.eventId)) {
    return { process: false, reason: "duplicate_event" };
  }
  const attempt = params.deliveryAttempt ?? 1;
  const cap = params.maxDeliveryAttempts ?? 25;
  if (attempt > cap) {
    return { process: false, reason: "attempt_cap_exceeded" };
  }
  return { process: true, reason: "ok" };
}
