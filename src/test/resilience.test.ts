/**
 * Resilience Utilities Tests
 */
import { describe, it, expect, vi } from "vitest";
import {
  retryAsync,
  CircuitBreaker,
  CircuitOpenError,
  withTimeout,
  TimeoutError,
  fallbackChain,
  staleWhileRevalidate,
  clearSWRCache,
  isOffline,
  isSlowConnection,
  safeJsonParse,
} from "@/lib/resilience";

/* ── retryAsync ── */
describe("retryAsync", () => {
  it("returns on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retryAsync(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure then succeeds", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail1"))
      .mockResolvedValue("ok");
    const result = await retryAsync(fn, { baseDelay: 10, maxAttempts: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after max attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    await expect(retryAsync(fn, { maxAttempts: 2, baseDelay: 10 }))
      .rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("stops retrying when retryIf returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fatal"));
    await expect(retryAsync(fn, {
      maxAttempts: 5,
      baseDelay: 10,
      retryIf: () => false,
    })).rejects.toThrow("fatal");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("calls onRetry callback", async () => {
    const onRetry = vi.fn();
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("err"))
      .mockResolvedValue("ok");
    await retryAsync(fn, { baseDelay: 10, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry.mock.calls[0][1]).toBe(1); // attempt number
  });

  it("passes attempt number to fn", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("1"))
      .mockImplementation((attempt) => Promise.resolve(attempt));
    const result = await retryAsync(fn, { baseDelay: 10 });
    expect(result).toBe(2);
  });
});

/* ── CircuitBreaker ── */
describe("CircuitBreaker", () => {
  it("starts closed", () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe("closed");
  });

  it("opens after failure threshold", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 });
    const fail = () => Promise.reject(new Error("fail"));

    await expect(cb.call(fail)).rejects.toThrow();
    expect(cb.getState()).toBe("closed");

    await expect(cb.call(fail)).rejects.toThrow();
    expect(cb.getState()).toBe("open");
  });

  it("rejects immediately when open", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 60_000 });
    await expect(cb.call(() => Promise.reject(new Error("x")))).rejects.toThrow();

    await expect(cb.call(() => Promise.resolve("ok")))
      .rejects.toThrow(CircuitOpenError);
  });

  it("resets to closed on success after half-open", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 10 });
    await expect(cb.call(() => Promise.reject(new Error("x")))).rejects.toThrow();
    expect(cb.getState()).toBe("open");

    // Wait for reset timeout
    await new Promise((r) => setTimeout(r, 20));
    const result = await cb.call(() => Promise.resolve("recovered"));
    expect(result).toBe("recovered");
    expect(cb.getState()).toBe("closed");
  });

  it("reset() restores closed state", async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    await expect(cb.call(() => Promise.reject(new Error("x")))).rejects.toThrow();
    expect(cb.getState()).toBe("open");
    cb.reset();
    expect(cb.getState()).toBe("closed");
  });

  it("calls onStateChange", async () => {
    const onChange = vi.fn();
    const cb = new CircuitBreaker({ failureThreshold: 1, onStateChange: onChange });
    await expect(cb.call(() => Promise.reject(new Error("x")))).rejects.toThrow();
    expect(onChange).toHaveBeenCalledWith("closed", "open");
  });
});

/* ── withTimeout ── */
describe("withTimeout", () => {
  it("resolves before timeout", async () => {
    const result = await withTimeout(Promise.resolve("fast"), 1000);
    expect(result).toBe("fast");
  });

  it("rejects with TimeoutError", async () => {
    const slow = new Promise((r) => setTimeout(() => r("slow"), 500));
    await expect(withTimeout(slow, 10)).rejects.toThrow(TimeoutError);
  });

  it("propagates original error", async () => {
    await expect(withTimeout(Promise.reject(new Error("orig")), 1000))
      .rejects.toThrow("orig");
  });
});

/* ── fallbackChain ── */
describe("fallbackChain", () => {
  it("returns first successful strategy", async () => {
    const result = await fallbackChain({
      strategies: [
        { name: "primary", execute: () => Promise.resolve("A") },
        { name: "secondary", execute: () => Promise.resolve("B") },
      ],
    });
    expect(result).toBe("A");
  });

  it("falls back to next on failure", async () => {
    const result = await fallbackChain({
      strategies: [
        { name: "primary", execute: () => Promise.reject(new Error("down")) },
        { name: "fallback", execute: () => Promise.resolve("backup") },
      ],
    });
    expect(result).toBe("backup");
  });

  it("calls onFallback callback", async () => {
    const onFallback = vi.fn();
    await fallbackChain({
      strategies: [
        { name: "api", execute: () => Promise.reject(new Error("err")) },
        { name: "cache", execute: () => Promise.resolve("cached") },
      ],
      onFallback,
    });
    expect(onFallback).toHaveBeenCalledWith("api", expect.any(Error), "cache");
  });

  it("throws if all strategies fail", async () => {
    await expect(fallbackChain({
      strategies: [
        { name: "a", execute: () => Promise.reject(new Error("a-fail")) },
        { name: "b", execute: () => Promise.reject(new Error("b-fail")) },
      ],
    })).rejects.toThrow("b-fail");
  });
});

/* ── staleWhileRevalidate ── */
describe("staleWhileRevalidate", () => {
  beforeEach(() => clearSWRCache());

  it("fetches on first call", async () => {
    const result = await staleWhileRevalidate("key1", () => Promise.resolve(42));
    expect(result).toBe(42);
  });

  it("returns cached data within maxAge", async () => {
    await staleWhileRevalidate("key2", () => Promise.resolve("first"), 60_000);
    const result = await staleWhileRevalidate("key2", () => Promise.resolve("second"), 60_000);
    expect(result).toBe("first");
  });

  it("returns stale data while revalidating", async () => {
    await staleWhileRevalidate("key3", () => Promise.resolve("old"), 0);
    // maxAge=0 means stale, but should return immediately
    const result = await staleWhileRevalidate("key3", () => Promise.resolve("new"), 0);
    expect(result).toBe("old"); // stale returned synchronously
  });
});

/* ── Network helpers ── */
describe("isOffline", () => {
  it("returns false when online", () => {
    Object.defineProperty(navigator, "onLine", { value: true, writable: true });
    expect(isOffline()).toBe(false);
  });
});

describe("isSlowConnection", () => {
  it("returns false without connection API", () => {
    expect(isSlowConnection()).toBe(false);
  });
});

/* ── safeJsonParse ── */
describe("safeJsonParse", () => {
  it("parses valid JSON", () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
  });

  it("returns fallback on invalid JSON", () => {
    expect(safeJsonParse("not json", { default: true })).toEqual({ default: true });
  });

  it("handles arrays", () => {
    expect(safeJsonParse("[1,2,3]", [])).toEqual([1, 2, 3]);
  });
});
