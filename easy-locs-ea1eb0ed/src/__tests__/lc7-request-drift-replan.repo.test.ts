/**
 * LC7 (#874) — `dashboardRepo.requestDriftReplan` repo-layer guard.
 *
 * The Replan path is RPC-only because `system.execution_tasks` REVOKES
 * INSERT/UPDATE/DELETE from `authenticated`. This test pins the
 * runtime contract:
 *   - The repo MUST call `supabase.schema("system").rpc(...)` (NOT
 *     `domainDb.system.rpc`, which does not exist on the schema-scoped
 *     accessor and would throw `rpc is not a function`).
 *   - The RPC name MUST be `request_drift_replan` and the single arg
 *     MUST be `{ p_task_id: <taskId> }` (matches the SECURITY DEFINER
 *     function signature in `20260430100000_request_drift_replan_rpc.sql`).
 *   - RPC errors MUST surface as thrown Errors (so React Query
 *     surfaces them as toasts in the admin inbox).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const rpcCalls: Array<{ schema: string; fn: string; args: unknown }> = [];
let nextRpcResult: { data: unknown; error: { message: string } | null } = {
  data: null,
  error: null,
};

vi.mock("@/services/db", () => ({
  domainDb: {
    system: {
      from: () => {
        throw new Error(
          "requestDriftReplan must NOT touch system.execution_tasks via .from()",
        );
      },
    },
  },
  db: () => ({}),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    schema: (s: string) => ({
      rpc: async (fn: string, args: unknown) => {
        rpcCalls.push({ schema: s, fn, args });
        return nextRpcResult;
      },
    }),
    auth: { getUser: async () => ({ data: { user: { id: "admin-uuid" } } }) },
  },
}));

import { dashboardRepo } from "../repositories/domain/dashboard.repo";

beforeEach(() => {
  rpcCalls.length = 0;
  nextRpcResult = { data: null, error: null };
});

describe("LC7 · dashboardRepo.requestDriftReplan", () => {
  it("calls the system.request_drift_replan RPC with { p_task_id }", async () => {
    nextRpcResult = {
      data: {
        replan_requested_at: "2026-04-30T12:00:00.000Z",
        replan_requested_by: "admin-uuid",
      },
      error: null,
    };
    const out = await dashboardRepo.requestDriftReplan(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(rpcCalls).toEqual([
      {
        schema: "system",
        fn: "request_drift_replan",
        args: { p_task_id: "11111111-1111-1111-1111-111111111111" },
      },
    ]);
    expect(out.ok).toBe(true);
    expect(out.drift_report).toMatchObject({
      replan_requested_by: "admin-uuid",
    });
  });

  it("propagates RPC errors as thrown Errors", async () => {
    nextRpcResult = {
      data: null,
      error: { message: "request_drift_replan: task is not BLOCKED_BY_DRIFT" },
    };
    await expect(
      dashboardRepo.requestDriftReplan("22222222-2222-2222-2222-222222222222"),
    ).rejects.toThrow(/request_drift_replan: task is not BLOCKED_BY_DRIFT/);
    expect(rpcCalls).toHaveLength(1);
  });

  it("does not attempt any direct table mutation on execution_tasks", async () => {
    nextRpcResult = { data: {}, error: null };
    await dashboardRepo.requestDriftReplan(
      "33333333-3333-3333-3333-333333333333",
    );
    // The mocked `domainDb.system.from` throws if called — reaching here
    // proves the repo never bypassed the RPC choke-point.
    expect(rpcCalls).toHaveLength(1);
  });
});
