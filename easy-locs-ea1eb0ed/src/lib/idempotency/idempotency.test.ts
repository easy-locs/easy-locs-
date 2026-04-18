import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/services/db", () => {
  return {
    db: {
      rpc: vi.fn(async () => ({ data: null, error: new Error("offline") })),
    },
  };
});

import { withIdempotency, __resetIdempotencyMemoForTests } from "./idempotency";

describe("withIdempotency", () => {
  beforeEach(() => {
    __resetIdempotencyMemoForTests();
  });

  it("invokes the side effect exactly once for the same key", async () => {
    const fn = vi.fn(async () => ({ sent: 1 }));
    const opts = { namespace: "test", key: "k1", payload: { a: 1 } };

    const first = await withIdempotency(opts, fn);
    const second = await withIdempotency(opts, fn);
    const third = await withIdempotency(opts, fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(third.replayed).toBe(true);
    expect(second.result).toEqual({ sent: 1 });
  });

  it("treats different keys as independent", async () => {
    const fn = vi.fn(async (n: number) => n * 2);
    const a = await withIdempotency({ namespace: "n", key: "a" }, () => fn(2));
    const b = await withIdempotency({ namespace: "n", key: "b" }, () => fn(3));
    expect(a.result).toBe(4);
    expect(b.result).toBe(6);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("re-runs after TTL expires", async () => {
    const fn = vi.fn(async () => "x");
    await withIdempotency(
      { namespace: "ttl", key: "z", ttlSeconds: 0 },
      fn,
    );
    // ttl=0 => immediately expired on next claim
    await new Promise((r) => setTimeout(r, 5));
    await withIdempotency(
      { namespace: "ttl", key: "z", ttlSeconds: 0 },
      fn,
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("requires namespace and key", async () => {
    await expect(
      withIdempotency({ namespace: "", key: "k" }, async () => 1),
    ).rejects.toThrow(/namespace and key/);
  });

  it("propagates errors and still dedupes the failed result", async () => {
    const fn = vi
      .fn()
      .mockImplementationOnce(async () => {
        throw new Error("boom");
      })
      .mockImplementationOnce(async () => "ok");

    await expect(
      withIdempotency({ namespace: "err", key: "k" }, fn),
    ).rejects.toThrow("boom");

    const replay = await withIdempotency({ namespace: "err", key: "k" }, fn);
    expect(replay.replayed).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
