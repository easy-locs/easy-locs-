import { describe, it, expect } from "vitest";
import {
  classifyError, withRetry, withFallback, withTimeout, withFallbackChain,
  CircuitBreaker, addErrorReporter, reportError,
} from "@/lib/error-handling";

describe("PASS55 AR — Error Handling", () => {
  it("classifies network errors", () => {
    const c = classifyError(new Error("fetch failed"));
    expect(c.domain).toBe("network");
    expect(c.retryable).toBe(true);
    expect(c.severity).toBe("transient");
  });

  it("classifies auth errors", () => {
    const c = classifyError(new Error("401 Unauthorized"));
    expect(c.domain).toBe("auth");
    expect(c.retryable).toBe(false);
  });

  it("classifies validation errors", () => {
    const c = classifyError(new Error("validation failed: email required"));
    expect(c.domain).toBe("validation");
  });

  it("classifies payment errors", () => {
    const c = classifyError(new Error("Stripe charge failed"));
    expect(c.domain).toBe("payment");
  });

  it("retries on transient failures", async () => {
    let attempts = 0;
    const result = await withRetry(async () => {
      attempts++;
      if (attempts < 3) throw new Error("transient");
      return "ok";
    }, { maxAttempts: 3, baseDelayMs: 10 });
    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("withFallback returns fallback on error", async () => {
    const result = await withFallback(async () => { throw new Error("boom"); }, "default");
    expect(result).toBe("default");
  });

  it("withTimeout rejects on slow operations", async () => {
    await expect(withTimeout(
      () => new Promise((r) => setTimeout(r, 5000)),
      50
    )).rejects.toThrow("Timeout");
  });

  it("withFallbackChain tries strategies in order", async () => {
    const result = await withFallbackChain(
      async () => { throw new Error("1 failed"); },
      async () => "strategy2",
      async () => "strategy3",
    );
    expect(result).toBe("strategy2");
  });

  it("circuit breaker opens after threshold", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 100 });
    const fail = async () => { throw new Error("fail"); };
    
    await expect(cb.execute(fail)).rejects.toThrow();
    await expect(cb.execute(fail)).rejects.toThrow();
    expect(cb.getState()).toBe("open");
    await expect(cb.execute(async () => "ok")).rejects.toThrow("Circuit breaker is OPEN");
  });

  it("circuit breaker resets after timeout", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });
    await expect(cb.execute(async () => { throw new Error("x"); })).rejects.toThrow();
    expect(cb.getState()).toBe("open");
    await new Promise((r) => setTimeout(r, 60));
    const result = await cb.execute(async () => "recovered");
    expect(result).toBe("recovered");
  });

  it("reportError notifies reporters", () => {
    const errors: any[] = [];
    const unsub = addErrorReporter((e) => errors.push(e));
    reportError(new Error("test error"));
    expect(errors).toHaveLength(1);
    expect(errors[0].domain).toBeDefined();
    unsub();
  });
});
