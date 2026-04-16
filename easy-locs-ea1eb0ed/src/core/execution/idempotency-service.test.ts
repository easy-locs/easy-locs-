import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import {
  claimIdempotencyKey,
  computeIdempotencyKey,
  findExistingResult,
} from "./idempotency-service";

type RpcArgs = Record<string, unknown>;
type RpcImpl = (
  args: RpcArgs,
) => Promise<{ data: unknown; error: { message: string } | null }>;

interface FakeTask {
  id: string;
  idempotency_key: string | null;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "BLOCKED";
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

function installIdempotencyRpcMock(initial: FakeTask[] = []) {
  const tasks = new Map<string, FakeTask>();
  initial.forEach((t) => tasks.set(t.id, { ...t }));

  const handlers: Record<string, RpcImpl> = {
    async claim_idempotency_key(args) {
      const key = String(args.p_key ?? "").trim();
      const taskId = String(args.p_task_id ?? "").trim();
      if (!key || !taskId) {
        return { data: null, error: { message: "key/task_id required" } };
      }
      const task = tasks.get(taskId);
      if (!task) {
        return { data: null, error: { message: "task not found" } };
      }
      if (task.idempotency_key === key) {
        return {
          data: [
            { claimed: true, winning_task_id: taskId, reason: "already_claimed" },
          ],
          error: null,
        };
      }
      if (task.idempotency_key && task.idempotency_key !== key) {
        return {
          data: [
            {
              claimed: false,
              winning_task_id: taskId,
              reason: "task_has_different_key",
            },
          ],
          error: null,
        };
      }
      const owner = [...tasks.values()].find(
        (t) => t.idempotency_key === key && t.id !== taskId,
      );
      if (owner) {
        return {
          data: [
            { claimed: false, winning_task_id: owner.id, reason: "duplicate" },
          ],
          error: null,
        };
      }
      task.idempotency_key = key;
      return {
        data: [{ claimed: true, winning_task_id: taskId, reason: "claimed" }],
        error: null,
      };
    },
    async find_existing_result_by_idempotency_key(args) {
      const key = String(args.p_key ?? "").trim();
      if (!key) return { data: null, error: null };
      const matches = [...tasks.values()]
        .filter((t) => t.idempotency_key === key)
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      if (matches.length === 0) return { data: null, error: null };
      const m = matches[0];
      return {
        data: [
          {
            task_id: m.id,
            status: m.status,
            result: m.result,
            error: m.error,
            created_at: m.created_at,
            updated_at: m.updated_at,
          },
        ],
        error: null,
      };
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

  return { tasks, rpc };
}

describe("computeIdempotencyKey", () => {
  it("is deterministic across re-orderings of payload keys", async () => {
    const a = await computeIdempotencyKey({
      taskType: "REVIEW_QUEUE_RESOLUTION",
      entityType: "review",
      entityId: "r-42",
      payload: { foo: 1, bar: { x: 1, y: 2 } },
    });
    const b = await computeIdempotencyKey({
      taskType: "REVIEW_QUEUE_RESOLUTION",
      entityType: "review",
      entityId: "r-42",
      payload: { bar: { y: 2, x: 1 }, foo: 1 },
    });
    expect(a).toBe(b);
    expect(a.startsWith("idem:review_queue_resolution:review:r-42:")).toBe(true);
  });

  it("differs when payload differs", async () => {
    const a = await computeIdempotencyKey({
      taskType: "X",
      entityType: "e",
      entityId: "1",
      payload: { v: 1 },
    });
    const b = await computeIdempotencyKey({
      taskType: "X",
      entityType: "e",
      entityId: "1",
      payload: { v: 2 },
    });
    expect(a).not.toBe(b);
  });

  it("accepts a precomputed payload hash", async () => {
    const k = await computeIdempotencyKey({
      taskType: "X",
      entityType: "e",
      entityId: "1",
      payloadHash: "abc",
    });
    expect(k).toBe("idem:x:e:1:abc");
  });

  it("rejects missing inputs", async () => {
    await expect(
      computeIdempotencyKey({ taskType: "", entityType: "e", entityId: "1" }),
    ).rejects.toThrow();
  });
});

describe("claimIdempotencyKey", () => {
  const baseTask = (id: string, key: string | null = null): FakeTask => ({
    id,
    idempotency_key: key,
    status: "PENDING",
    result: null,
    error: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  beforeEach(() => {
    installIdempotencyRpcMock();
  });

  it("claims a fresh key", async () => {
    const { tasks } = installIdempotencyRpcMock([baseTask("t1")]);
    const r = await claimIdempotencyKey("idem:a", "t1");
    expect(r.claimed).toBe(true);
    expect(r.reason).toBe("claimed");
    expect(tasks.get("t1")?.idempotency_key).toBe("idem:a");
  });

  it("is idempotent: re-claiming the same key on the same task succeeds", async () => {
    installIdempotencyRpcMock([baseTask("t1", "idem:a")]);
    const r = await claimIdempotencyKey("idem:a", "t1");
    expect(r.claimed).toBe(true);
    expect(r.reason).toBe("already_claimed");
  });

  it("rejects a duplicate claim from a different task and surfaces the winner", async () => {
    installIdempotencyRpcMock([
      baseTask("t-winner", "idem:a"),
      baseTask("t-loser"),
    ]);
    const r = await claimIdempotencyKey("idem:a", "t-loser");
    expect(r.claimed).toBe(false);
    expect(r.reason).toBe("duplicate");
    expect(r.winningTaskId).toBe("t-winner");
  });

  it("rejects when the task already carries a different key", async () => {
    installIdempotencyRpcMock([baseTask("t1", "idem:other")]);
    const r = await claimIdempotencyKey("idem:a", "t1");
    expect(r.claimed).toBe(false);
    expect(r.reason).toBe("task_has_different_key");
  });
});

describe("findExistingResult", () => {
  it("returns the prior result for a known key", async () => {
    installIdempotencyRpcMock([
      {
        id: "t1",
        idempotency_key: "idem:a",
        status: "SUCCESS",
        result: { ok: true, value: 99 },
        error: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:01Z",
      },
    ]);
    const r = await findExistingResult("idem:a");
    expect(r.found).toBe(true);
    expect(r.existing?.taskId).toBe("t1");
    expect(r.existing?.result).toEqual({ ok: true, value: 99 });
  });

  it("returns not-found for unknown keys", async () => {
    installIdempotencyRpcMock();
    const r = await findExistingResult("idem:missing");
    expect(r.found).toBe(false);
    expect(r.existing).toBeNull();
  });

  it("rejects an empty key without an RPC call", async () => {
    installIdempotencyRpcMock();
    const r = await findExistingResult("");
    expect(r.found).toBe(false);
    expect(r.error).toBeTruthy();
  });
});
