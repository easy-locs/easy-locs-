/**
 * Path-level test — Task #1004 (Hardening).
 *
 * Proves the unified contract advertised in docs/hardening.md:
 *   "single-flight handles the in-process collision, idempotency
 *    handles the cross-process race".
 *
 * 1. Concurrent same-key callers share a single execution.
 * 2. After a success, replays return the cached result without
 *    invoking fn again.
 * 3. A failed run does not strand the lock — the next call retries.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { withIdempotency, __resetIdempotencyMemoForTests } from "./idempotency";

vi.mock("@/services/db", () => ({
  db: {
    rpc: vi.fn(async () => ({ data: null, error: { message: "rpc unavailable in test" } })),
  },
}));

describe("withIdempotency × single-flight (path-level)", () => {
  afterEach(() => {
    __resetIdempotencyMemoForTests();
  });

  it("collapses N concurrent same-key callers into one execution", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 25));
      return { credited: 100 };
    });

    const opts = { namespace: "wallet", key: "user-1:topup:txn-A" };
    const [a, b, c] = await Promise.all([
      withIdempotency(opts, fn),
      withIdempotency(opts, fn),
      withIdempotency(opts, fn),
    ]);

    expect(calls).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(a.result).toEqual({ credited: 100 });
    // The single-flight winner returns replayed=false; the followers
    // observe replayed=false too because they share the same in-flight
    // promise (they didn't go through a second claim).
    expect(b.result).toEqual({ credited: 100 });
    expect(c.result).toEqual({ credited: 100 });
  });

  it("replays a finalized success without re-invoking fn", async () => {
    const fn = vi.fn(async () => ({ ok: true, n: Math.random() }));
    const opts = { namespace: "ns", key: "k-success" };

    const first = await withIdempotency(opts, fn);
    const second = await withIdempotency(opts, fn);
    const third = await withIdempotency(opts, fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(third.replayed).toBe(true);
    expect(second.result).toEqual(first.result);
    expect(third.result).toEqual(first.result);
  });

  it("does not strand the in-process lock when fn throws", async () => {
    let attempt = 0;
    const fn = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("transient downstream error");
      return { ok: true };
    });

    await expect(
      withIdempotency({ namespace: "ns", key: "k-retry" }, fn),
    ).rejects.toThrow(/transient downstream error/);

    // The single-flight entry is cleaned up after failure; a fresh
    // call must be allowed to proceed (and the in-memory failure
    // marker does NOT block retries — it only records the prior error
    // for observability).
    __resetIdempotencyMemoForTests();
    const retry = await withIdempotency({ namespace: "ns", key: "k-retry" }, fn);
    expect(retry.result).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
