/**
 * LB1 #836 — Dispatch entrypoint boundary test.
 *
 * Exercises the real `dispatchExecutionTask` helper from
 * `src/lib/execution/dispatch.ts` against a mocked Supabase RPC. The
 * companion suite (`ai-dispatch.integration.test.ts`) drives the
 * orchestrator from a `simulateDispatch` mirror; this file pins down the
 * other half of the contract — the helper's wire shape: which RPC is
 * called, with which arguments, and how it shapes the returned handle.
 *
 * Together the two suites cover the full chain from caller → RPC →
 * row → orchestrator → adapter without ever touching a live Supabase
 * instance.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();

vi.mock("@/services/db", () => ({
  db: {
    schema: (_schema: string) => ({ rpc }),
  },
}));

import { dispatchExecutionTask, DispatchError } from "@/lib/execution/dispatch";

describe("dispatchExecutionTask — wire boundary against mocked Supabase RPC", () => {
  beforeEach(() => rpc.mockReset());

  it("calls system.dispatch_execution_task with the correct argument shape and returns a typed handle", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        task_id: "t-1",
        status: "queued",
        agent_id: "agent-ai-completion",
        agent_version_id: "v-1",
        blocked_reason: null,
      },
      error: null,
    });

    const handle = await dispatchExecutionTask({
      domain: "ai",
      taskType: "AI_COMPLETION",
      payload: {
        feature: "support_chat",
        messages: [{ role: "user", content: "hi" }],
      },
      idempotencyKey: "idem-1",
      correlationId: "corr-1",
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "dispatch_execution_task",
      expect.objectContaining({
        p_type: "AI_COMPLETION",
        p_domain: "ai",
        p_payload: expect.objectContaining({ feature: "support_chat" }),
        p_idempotency_key: "idem-1",
        p_correlation_id: "corr-1",
        p_approval_policy: "policy-default",
        p_metadata: {},
      }),
    );

    expect(handle).toEqual({
      taskId: "t-1",
      status: "queued",
      agentId: "agent-ai-completion",
      agentVersionId: "v-1",
      blockedReason: null,
    });
  });

  it("forwards `id` when the RPC returns a row keyed by `id` instead of `task_id`", async () => {
    rpc.mockResolvedValueOnce({
      data: {
        id: "t-2",
        status: "queued",
        agent_id: null,
        agent_version_id: null,
        blocked_reason: null,
      },
      error: null,
    });

    const handle = await dispatchExecutionTask({
      domain: "marketplace",
      taskType: "MARKETPLACE.LISTING.PUBLISH",
    });
    expect(handle.taskId).toBe("t-2");
    expect(handle.agentId).toBeNull();
  });

  it("throws DispatchError when the RPC returns an error", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "permission denied" },
    });

    await expect(
      dispatchExecutionTask({ domain: "ai", taskType: "AI_COMPLETION" }),
    ).rejects.toBeInstanceOf(DispatchError);
  });

  it("throws DispatchError when the RPC returns no data", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });

    await expect(
      dispatchExecutionTask({ domain: "ai", taskType: "AI_COMPLETION" }),
    ).rejects.toMatchObject({
      name: "DispatchError",
      message: expect.stringMatching(/no data/),
    });
  });
});
