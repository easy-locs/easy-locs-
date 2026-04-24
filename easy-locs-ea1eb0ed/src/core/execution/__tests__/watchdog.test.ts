/**
 * Watchdog client-side primitives tests (Task #1017).
 *
 * The deterministic logic that the SQL surface enforces (timeout detection,
 * stuck thresholds, dependency cycle checks) is tested in
 * `tests/sql/watchdog_anti_deadlock.spec.sql` against a real Postgres.
 *
 * This file pins the contract of the TS client: it must (a) early-return ok
 * for an empty dependency set, (b) translate the RPC envelope into the
 * structured `DependencyValidationResult`, and (c) never silently swallow an
 * error.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// watchdog.ts now imports db from @/services/db (migrated from raw supabase).
// We mock the db module at the boundary: db.schema() returns a stub with rpc.
vi.mock("@/services/db", () => {
  const rpcMock = vi.fn();
  const schemaStub = { rpc: rpcMock };
  const dbMock = Object.assign(
    (_table: string) => ({}),
    {
      schema: (_s: string) => schemaStub,
      __rpcMock: rpcMock,
    },
  );
  return { db: dbMock };
});

import { validateTaskDependencies } from "../watchdog";
import { db } from "@/services/db";

const rpc = (db as unknown as { __rpcMock: ReturnType<typeof vi.fn> }).__rpcMock;

describe("validateTaskDependencies", () => {
  beforeEach(() => rpc.mockReset());
  afterEach(() => rpc.mockReset());

  it("returns ok=true without calling RPC when dependsOn is empty", async () => {
    const r = await validateTaskDependencies("task-1", []);
    expect(r.ok).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects missing taskId without calling RPC", async () => {
    const r = await validateTaskDependencies("", ["dep-1"]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/taskId/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("translates dependency_not_approved into a structured result", async () => {
    rpc.mockResolvedValueOnce({
      data: [{ ok: false, reason: "dependency_not_approved", offending_id: "dep-bad" }],
      error: null,
    });
    const r = await validateTaskDependencies("task-1", ["dep-bad"]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("dependency_not_approved");
    expect(r.offendingId).toBe("dep-bad");
  });

  it("translates dependency_cycle into a structured result", async () => {
    rpc.mockResolvedValueOnce({
      data: [{ ok: false, reason: "dependency_cycle", offending_id: "dep-cycle" }],
      error: null,
    });
    const r = await validateTaskDependencies("task-1", ["dep-cycle"]);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("dependency_cycle");
    expect(r.offendingId).toBe("dep-cycle");
  });

  it("surfaces RPC errors instead of silently returning ok", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "rpc broke" } });
    const r = await validateTaskDependencies("task-1", ["dep-1"]);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("rpc broke");
  });

  it("returns ok=true when SQL gives a green light", async () => {
    rpc.mockResolvedValueOnce({
      data: [{ ok: true, reason: null, offending_id: null }],
      error: null,
    });
    const r = await validateTaskDependencies("task-1", ["dep-good"]);
    expect(r.ok).toBe(true);
    expect(r.reason).toBeNull();
  });
});
