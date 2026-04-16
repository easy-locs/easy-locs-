import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  acquireExecutionLock,
  getTaskLockKey,
  releaseExecutionLock,
  withExecutionLock,
} from "./lock-service";

type RpcArgs = Record<string, unknown>;
type RpcImpl = (
  args: RpcArgs,
) => Promise<{ data: unknown; error: { message: string } | null }>;

interface LockState {
  ownerId: string;
  expiresAt: number;
}

/**
 * Configure the mocked supabase RPC client to behave like the real
 * `system.execution_locks` RPCs. Returns a controllable in-memory store.
 */
function installLockRpcMock() {
  const store = new Map<string, LockState>();

  const handlers: Record<string, RpcImpl> = {
    async try_acquire_execution_lock(args) {
      const key = String(args.p_lock_key ?? "").trim();
      const owner = String(args.p_owner_id ?? "").trim();
      const ttl = Math.max(1, Number(args.p_ttl_seconds ?? 60));
      if (!key || !owner) {
        return {
          data: null,
          error: { message: "lock_key/owner_id required" },
        };
      }
      const now = Date.now();
      const expires = now + ttl * 1000;
      const existing = store.get(key);
      const respond = (
        acquired: boolean,
        ownerOut: string | null,
        expiresOut: number | null,
        reason: string,
      ) => ({
        data: [
          {
            acquired,
            lock_key: key,
            owner_id: ownerOut,
            expires_at: expiresOut ? new Date(expiresOut).toISOString() : null,
            reason,
          },
        ],
        error: null,
      });
      if (!existing) {
        store.set(key, { ownerId: owner, expiresAt: expires });
        return respond(true, owner, expires, "acquired");
      }
      if (existing.expiresAt <= now) {
        store.set(key, { ownerId: owner, expiresAt: expires });
        return respond(true, owner, expires, "orphan_recovered");
      }
      if (existing.ownerId === owner) {
        existing.expiresAt = expires;
        return respond(true, owner, expires, "reentrant_refresh");
      }
      return respond(false, existing.ownerId, existing.expiresAt, "busy");
    },
    async release_execution_lock(args) {
      const key = String(args.p_lock_key ?? "").trim();
      const owner = String(args.p_owner_id ?? "").trim();
      if (!key || !owner) return { data: false, error: null };
      const existing = store.get(key);
      if (!existing || existing.ownerId !== owner) {
        return { data: false, error: null };
      }
      store.delete(key);
      return { data: true, error: null };
    },
    async cleanup_expired_locks() {
      const now = Date.now();
      let removed = 0;
      for (const [key, state] of store) {
        if (state.expiresAt <= now) {
          store.delete(key);
          removed++;
        }
      }
      return { data: removed, error: null };
    },
  };

  const rpc = vi.fn(async (fn: string, args: RpcArgs) => {
    const handler = handlers[fn];
    if (!handler) {
      return { data: null, error: { message: `unknown rpc ${fn}` } };
    }
    return handler(args);
  });

  (supabase as unknown as { schema: ReturnType<typeof vi.fn> }).schema = vi.fn(
    () => ({ rpc }),
  );

  return { store, rpc };
}

describe("getTaskLockKey", () => {
  it("derives a stable key for entity targets", () => {
    expect(
      getTaskLockKey({
        kind: "entity",
        domain: "Wallet",
        entityType: "Account",
        entityId: "A-123",
      }),
    ).toBe("wallet:account:A-123");
  });

  it("derives a stable key for global tasks", () => {
    expect(
      getTaskLockKey({
        kind: "global",
        domain: "Search",
        taskType: "REINDEX_ALL",
      }),
    ).toBe("search:reindex_all");
  });

  it("is deterministic across calls", () => {
    const a = getTaskLockKey({
      kind: "entity",
      domain: "wallet",
      entityType: "account",
      entityId: "A-1",
    });
    const b = getTaskLockKey({
      kind: "entity",
      domain: "WALLET",
      entityType: "ACCOUNT",
      entityId: "A-1",
    });
    expect(a).toBe(b);
  });

  it("rejects incomplete targets", () => {
    expect(() =>
      getTaskLockKey({
        kind: "entity",
        domain: "",
        entityType: "x",
        entityId: "y",
      }),
    ).toThrow();
  });
});

describe("acquireExecutionLock / releaseExecutionLock", () => {
  beforeEach(() => {
    installLockRpcMock();
  });

  it("acquires an empty lock", async () => {
    const r = await acquireExecutionLock("k1", "owner-A", 30);
    expect(r.acquired).toBe(true);
    expect(r.handle?.lockKey).toBe("k1");
    expect(r.reason).toBe("acquired");
  });

  it("blocks a concurrent acquisition by another owner", async () => {
    const a = await acquireExecutionLock("k2", "owner-A", 30);
    const b = await acquireExecutionLock("k2", "owner-B", 30);
    expect(a.acquired).toBe(true);
    expect(b.acquired).toBe(false);
    expect(b.reason).toBe("busy");
    expect(b.currentOwnerId).toBe("owner-A");
  });

  it("treats same-owner re-acquire as a re-entrant refresh", async () => {
    await acquireExecutionLock("k3", "owner-A", 30);
    const r = await acquireExecutionLock("k3", "owner-A", 60);
    expect(r.acquired).toBe(true);
    expect(r.reason).toBe("reentrant_refresh");
  });

  it("releases only locks owned by the caller", async () => {
    await acquireExecutionLock("k4", "owner-A", 30);
    const wrong = await releaseExecutionLock("k4", "owner-B");
    expect(wrong.released).toBe(false);
    const right = await releaseExecutionLock("k4", "owner-A");
    expect(right.released).toBe(true);
  });

  it("rejects empty lockKey/ownerId without an RPC call", async () => {
    const r = await acquireExecutionLock("", "owner", 30);
    expect(r.acquired).toBe(false);
    expect(r.reason).toBe("error");
  });
});

describe("withExecutionLock", () => {
  beforeEach(() => {
    installLockRpcMock();
  });

  it("runs the function and releases the lock on success", async () => {
    const ran = vi.fn(async () => "result-value");
    const out = await withExecutionLock("k5", "owner-A", ran, {
      ttlSeconds: 5,
    });
    expect(ran).toHaveBeenCalledOnce();
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.data).toBe("result-value");
      expect(out.released).toBe(true);
    }
    // Lock has been freed → another owner can now take it.
    const next = await acquireExecutionLock("k5", "owner-B", 5);
    expect(next.acquired).toBe(true);
  });

  it("does not invoke fn when the lock is busy", async () => {
    await acquireExecutionLock("k6", "owner-A", 30);
    const fn = vi.fn(async () => 42);
    const out = await withExecutionLock("k6", "owner-B", fn);
    expect(fn).not.toHaveBeenCalled();
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe("lock_busy");
    }
  });

  it("releases the lock even when fn throws", async () => {
    const out = await withExecutionLock("k7", "owner-A", async () => {
      throw new Error("boom");
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe("fn_threw");
      expect(out.error).toBe("boom");
    }
    const reuse = await acquireExecutionLock("k7", "owner-B", 5);
    expect(reuse.acquired).toBe(true);
  });

  it("recovers an orphan lock past its TTL", async () => {
    // Acquire with a 1s TTL, then time-warp by mutating the store directly.
    const { store } = installLockRpcMock();
    await acquireExecutionLock("k8", "owner-A", 1);
    const state = store.get("k8")!;
    state.expiresAt = Date.now() - 1000; // simulate elapsed TTL

    const out = await acquireExecutionLock("k8", "owner-B", 5);
    expect(out.acquired).toBe(true);
    expect(out.reason).toBe("orphan_recovered");
  });

  it("serialises 50 concurrent acquisitions: only one wins", async () => {
    const attempts = Array.from({ length: 50 }, (_, i) =>
      acquireExecutionLock("k9", `owner-${i}`, 30),
    );
    const results = await Promise.all(attempts);
    const winners = results.filter((r) => r.acquired);
    const losers = results.filter((r) => !r.acquired);
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(49);
    losers.forEach((l) => {
      // Clean reason — no silent error, no indefinite block.
      expect(l.reason === "busy" || l.reason === "race_lost").toBe(true);
    });
  });
});
