/**
 * LB1 follow-up #836 — End-to-end integration tests for the AI dispatch flow.
 *
 * Scope: prove the full chain holds together with no live Supabase, starting
 * from the canonical dispatch entrypoint:
 *
 *   simulateDispatch({domain:'ai', taskType:'AI_*', payload})
 *     → mirrors `system.dispatch_execution_task` (writes a queued row,
 *       returns a `DispatchedTaskHandle` shaped like the production
 *       `src/lib/execution/dispatch.ts` helper)
 *     → ExecutionOrchestratorV2 (validate / authorize / lock /
 *       agent-quota peek / execute / verify / persist)
 *     → real ai-adapters (createAiCompletionAdapter, ...Embedding,
 *       ...Rag, ...ToolUse — all four wired in via the shared harness)
 *     → terminal status (succeeded | pending_review | failed | blocked)
 *     → simulateDecideTaskApproval — mirrors `system.decide_task_approval`
 *       SQL, including the post-execute hold release path.
 *
 * The harness lives in `src/__tests__/harnesses/ai-dispatch-harness.ts`
 * and is reusable across domains: it exposes the generic
 * `createDispatchHarness({adapters, verifiers, ...})` plus the
 * AI-specific `buildAiDispatchHarness({...})` layered on top.
 */

import { describe, expect, it } from "vitest";

import {
  buildAiDispatchHarness,
  CANONICAL_EXECUTION_EVENTS,
} from "./harnesses/ai-dispatch-harness.ts";
import type { TaskVerifier } from "../../supabase/functions/_shared/execution/verifier-registry.ts";
import type { AgentQuotaGate } from "../../supabase/functions/_shared/execution/orchestrator-v2.ts";
import {
  AI_AGENT_SLUGS,
  AI_DOMAIN,
  AI_ERROR_CODES,
  AI_TASK_TYPES,
} from "../../supabase/functions/_shared/execution/adapters/ai/types.ts";

// Per-task-type passing verifiers — the orchestrator requires one for each
// (domain, task_type) pair or the run is blocked with `NO_VERIFIER`.
const passingVerifier = (taskType: string): TaskVerifier => ({
  domain: AI_DOMAIN,
  taskType,
  verify: async () => ({ ok: true }),
});

const ALL_AI_PASSING_VERIFIERS: TaskVerifier[] = [
  passingVerifier(AI_TASK_TYPES.COMPLETION),
  passingVerifier(AI_TASK_TYPES.EMBEDDING),
  passingVerifier(AI_TASK_TYPES.RAG),
  passingVerifier(AI_TASK_TYPES.TOOL_USE),
];

const MISMATCH_COMPLETION_VERIFIER: TaskVerifier = {
  domain: AI_DOMAIN,
  taskType: AI_TASK_TYPES.COMPLETION,
  verify: async () => ({
    ok: false,
    expected: { text: "expected" },
    actual: { text: "actual" },
    mismatchPath: "$.text",
  }),
};

// ── Happy path: all four AI task types ────────────────────────────────────

describe("LB1 #836 — AI dispatch happy path (all four task types)", () => {
  it("AI_COMPLETION: dispatch → execute → ai_interactions linked → quota incremented exactly once", async () => {
    const h = buildAiDispatchHarness({ verifiers: ALL_AI_PASSING_VERIFIERS });

    const handle = h.simulateDispatch({
      domain: AI_DOMAIN,
      taskType: AI_TASK_TYPES.COMPLETION,
      payload: {
        feature: "support_chat",
        messages: [{ role: "user", content: "hi" }],
      },
    });

    // Dispatch entrypoint produced a typed handle (matches the production
    // `dispatchExecutionTask` shape) and persisted a queued row.
    expect(handle.taskId).toBeTruthy();
    expect(handle.status).toBe("queued");
    expect(handle.agentId).toBe(`agent-${AI_AGENT_SLUGS.AI_COMPLETION}`);
    expect(h.repo.snapshot(handle.taskId)?.status).toBe("queued");

    const outcome = await h.orchestrator.run(handle.taskId);

    expect(outcome.finalStatus).toBe("succeeded");
    expect(outcome.errorCode).toBeUndefined();
    expect(h.repo.snapshot(handle.taskId)?.status).toBe("succeeded");

    // Provider invoked exactly once on the completion endpoint.
    expect(h.runnerCalls()).toEqual({ completion: 1, embedding: 0, rag: 0 });

    // ai_interactions row was written and is linked back to the task id.
    expect(h.recorded).toHaveLength(1);
    expect(h.recorded[0].taskId).toBe(handle.taskId);
    expect(h.recorded[0].domainTaskType).toBe(AI_TASK_TYPES.COMPLETION);
    expect(h.recorded[0].interaction.feature).toBe("support_chat");

    // Quota was bumped exactly once with real token + cost figures.
    expect(h.consumes).toHaveLength(1);
    expect(h.consumes[0].agentId).toBe(`agent-${AI_AGENT_SLUGS.AI_COMPLETION}`);
    expect(h.consumes[0].tokens).toBe(42);
    expect(h.consumes[0].costUsd).toBeCloseTo(0.000123, 6);

    // Canonical events fired in the documented order.
    expect(h.sink.names()).toEqual([
      CANONICAL_EXECUTION_EVENTS.TASK_QUEUED,
      CANONICAL_EXECUTION_EVENTS.TASK_LOCKED,
      CANONICAL_EXECUTION_EVENTS.TASK_STARTED,
      CANONICAL_EXECUTION_EVENTS.TASK_VERIFIED,
      CANONICAL_EXECUTION_EVENTS.TASK_SUCCEEDED,
      CANONICAL_EXECUTION_EVENTS.TASK_UNLOCKED,
    ]);
  });

  it("AI_EMBEDDING: dispatch → execute → vectors persisted, quota bumped once, no completion call", async () => {
    const h = buildAiDispatchHarness({ verifiers: ALL_AI_PASSING_VERIFIERS });

    const handle = h.simulateDispatch({
      domain: AI_DOMAIN,
      taskType: AI_TASK_TYPES.EMBEDDING,
      payload: {
        feature: "search.indexing",
        input: ["hello", "world"],
      },
    });

    expect(handle.agentId).toBe(`agent-${AI_AGENT_SLUGS.AI_EMBEDDING}`);

    const outcome = await h.orchestrator.run(handle.taskId);

    expect(outcome.finalStatus).toBe("succeeded");
    expect(h.repo.snapshot(handle.taskId)?.status).toBe("succeeded");

    // Only the embedding endpoint was hit.
    expect(h.runnerCalls()).toEqual({ completion: 0, embedding: 1, rag: 0 });

    // ai_interactions row stamped with the EMBEDDING task type.
    expect(h.recorded).toHaveLength(1);
    expect(h.recorded[0].domainTaskType).toBe(AI_TASK_TYPES.EMBEDDING);
    expect(h.recorded[0].interaction.feature).toBe("search.indexing");

    // Quota bumped once with the embedding usage figures from the runner.
    expect(h.consumes).toHaveLength(1);
    expect(h.consumes[0].agentId).toBe(`agent-${AI_AGENT_SLUGS.AI_EMBEDDING}`);
    expect(h.consumes[0].tokens).toBe(8);

    // Embeddings never trigger the sensitive classifier — succeeds straight
    // through without a pending_review hop.
    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_SUCCEEDED);
    expect(h.sink.names()).not.toContain("approval.requested");
  });

  it("AI_RAG: dispatch → execute → answer + citations persisted, quota bumped once", async () => {
    const h = buildAiDispatchHarness({ verifiers: ALL_AI_PASSING_VERIFIERS });

    const handle = h.simulateDispatch({
      domain: AI_DOMAIN,
      taskType: AI_TASK_TYPES.RAG,
      payload: {
        feature: "kb.lookup",
        query: "how do I cancel a booking",
        collection: "support-docs",
      },
    });

    expect(handle.agentId).toBe(`agent-${AI_AGENT_SLUGS.AI_RAG}`);

    const outcome = await h.orchestrator.run(handle.taskId);

    expect(outcome.finalStatus).toBe("succeeded");
    expect(h.repo.snapshot(handle.taskId)?.status).toBe("succeeded");

    expect(h.runnerCalls()).toEqual({ completion: 0, embedding: 0, rag: 1 });
    expect(h.recorded).toHaveLength(1);
    expect(h.recorded[0].domainTaskType).toBe(AI_TASK_TYPES.RAG);
    expect(h.consumes).toHaveLength(1);
    expect(h.consumes[0].agentId).toBe(`agent-${AI_AGENT_SLUGS.AI_RAG}`);
    expect(h.consumes[0].tokens).toBe(75);

    // Result row carries the answer + citations exactly as built by the
    // adapter — proves the orchestrator persisted execution_result intact.
    const persisted = h.repo.snapshot(handle.taskId)?.execution_result as
      | { output?: { answer?: string; citations?: Array<{ id: string }> } }
      | null
      | undefined;
    expect(persisted?.output?.answer).toMatch(/RAG answer for/);
    expect(persisted?.output?.citations?.[0]?.id).toBe("doc-1");
  });

  it("AI_TOOL_USE: dispatch → execute → ALWAYS held for approval (flaggedSensitive=true)", async () => {
    const h = buildAiDispatchHarness({ verifiers: ALL_AI_PASSING_VERIFIERS });

    const handle = h.simulateDispatch({
      domain: AI_DOMAIN,
      taskType: AI_TASK_TYPES.TOOL_USE,
      payload: {
        feature: "agent.tool",
        proposedDomain: "marketplace",
        proposedTaskType: "MARKETPLACE.LISTING.PUBLISH",
        proposedPayload: { listingId: "list-42" },
        rationale: "user asked to publish",
      },
    });

    expect(handle.agentId).toBe(`agent-${AI_AGENT_SLUGS.AI_TOOL_USE}`);

    const outcome = await h.orchestrator.run(handle.taskId);

    // Tool use ALWAYS holds for approval — orchestrator sees the
    // flaggedSensitive signal and transitions running → pending_review.
    expect(outcome.finalStatus).toBe("blocked");
    expect(outcome.errorCode).toBe("REVIEW_HOLD");
    expect(h.repo.snapshot(handle.taskId)?.status).toBe("pending_review");

    // No model call (tool-use bypasses the LLM) but interaction still
    // recorded for audit, and quota.consume bumped with zero usage.
    expect(h.runnerCalls()).toEqual({ completion: 0, embedding: 0, rag: 0 });
    expect(h.recorded).toHaveLength(1);
    expect(h.recorded[0].domainTaskType).toBe(AI_TASK_TYPES.TOOL_USE);
    expect(h.consumes).toHaveLength(1);
    expect(h.consumes[0].tokens).toBe(0);
    expect(h.consumes[0].costUsd).toBe(0);

    // Held row appears in the approvals inbox query surface.
    const inbox = h.listApprovalsInbox();
    expect(inbox.map((r) => r.id)).toContain(handle.taskId);
    expect(inbox.find((r) => r.id === handle.taskId)?.type).toBe(
      AI_TASK_TYPES.TOOL_USE,
    );
  });
});

// ── Sensitive output → approval-inbox release path ────────────────────────

describe("LB1 #836 — AI dispatch sensitive path (purpose=contract)", () => {
  it("running → pending_review → simulated decide_task_approval(approved) releases the response", async () => {
    const h = buildAiDispatchHarness({ verifiers: ALL_AI_PASSING_VERIFIERS });

    const handle = h.simulateDispatch({
      domain: AI_DOMAIN,
      taskType: AI_TASK_TYPES.COMPLETION,
      payload: {
        feature: "loan.contract",
        purpose: "contract",
        messages: [{ role: "user", content: "draft a loan contract" }],
      },
    });

    const outcome = await h.orchestrator.run(handle.taskId);

    // Adapter flagged the output sensitive → orchestrator returns
    // blocked / REVIEW_HOLD with the row landing in pending_review.
    expect(outcome.finalStatus).toBe("blocked");
    expect(outcome.errorCode).toBe("REVIEW_HOLD");

    const heldRow = h.repo.snapshot(handle.taskId);
    expect(heldRow?.status).toBe("pending_review");
    expect(heldRow?.blocked_reason).toMatch(/purpose:contract/);

    // The held output is preserved on the row so the approval drawer can
    // show the reviewer what they are about to release.
    const heldResult = heldRow?.execution_result as
      | { output?: { flaggedSensitive?: boolean } }
      | null
      | undefined;
    expect(heldResult?.output?.flaggedSensitive).toBe(true);

    // The approvals-inbox query surface picks up the held row.
    const inboxBefore = h.listApprovalsInbox();
    expect(inboxBefore.map((r) => r.id)).toContain(handle.taskId);

    // Production: `system.decide_task_approval(approved)` on a held row
    // releases via the post-execute branch (pending_review → succeeded).
    const decision = await h.simulateDecideTaskApproval(handle.taskId, "approved", {
      reviewer: "admin-1",
    });
    expect(decision.ok).toBe(true);
    expect(decision.post_execute_hold).toBe(true);
    expect(decision.task_status).toBe("succeeded");

    // Inbox is now empty for this task.
    const inboxAfter = h.listApprovalsInbox();
    expect(inboxAfter.map((r) => r.id)).not.toContain(handle.taskId);

    // approval.decided canonical event fired alongside the orchestrator events.
    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.APPROVAL_DECIDED);
  });

  it("classifier flags PII in completion output ⇒ pending_review, inbox-visible, releasable via approval", async () => {
    // No purpose=contract / sensitive caller hint — the heuristic
    // classifier must catch the email pattern in the runner output.
    const h = buildAiDispatchHarness({
      verifiers: ALL_AI_PASSING_VERIFIERS,
      completionText: "Sure — please email me at user@example.com to confirm.",
    });

    const handle = h.simulateDispatch({
      domain: AI_DOMAIN,
      taskType: AI_TASK_TYPES.COMPLETION,
      payload: {
        feature: "support_chat",
        messages: [{ role: "user", content: "how do i reach you?" }],
      },
    });

    const outcome = await h.orchestrator.run(handle.taskId);

    // Classifier flagged → orchestrator returns blocked / REVIEW_HOLD and
    // parks the row in pending_review with the matched-pattern reason.
    expect(outcome.finalStatus).toBe("blocked");
    expect(outcome.errorCode).toBe("REVIEW_HOLD");

    const heldRow = h.repo.snapshot(handle.taskId);
    expect(heldRow?.status).toBe("pending_review");
    expect(heldRow?.blocked_reason).toMatch(/pii/);

    // Held output preserved so the reviewer can see it before releasing.
    const heldResult = heldRow?.execution_result as
      | { output?: { flaggedSensitive?: boolean; text?: string } }
      | null
      | undefined;
    expect(heldResult?.output?.flaggedSensitive).toBe(true);
    expect(heldResult?.output?.text).toContain("user@example.com");

    // Approvals-inbox query surface picks up the row.
    expect(h.listApprovalsInbox().map((r) => r.id)).toContain(handle.taskId);

    // Release via the simulated decide_task_approval RPC (post-execute
    // hold branch ⇒ pending_review → succeeded).
    const decision = await h.simulateDecideTaskApproval(handle.taskId, "approved", {
      reviewer: "admin-1",
    });
    expect(decision.post_execute_hold).toBe(true);
    expect(decision.task_status).toBe("succeeded");
    expect(h.repo.snapshot(handle.taskId)?.status).toBe("succeeded");
    expect(h.listApprovalsInbox().map((r) => r.id)).not.toContain(handle.taskId);
  });

  it("decide_task_approval(rejected) on a held row terminates as failed/REVIEW_REJECTED", async () => {
    const h = buildAiDispatchHarness({ verifiers: ALL_AI_PASSING_VERIFIERS });

    const handle = h.simulateDispatch({
      domain: AI_DOMAIN,
      taskType: AI_TASK_TYPES.COMPLETION,
      payload: {
        feature: "loan.contract",
        purpose: "contract",
        messages: [{ role: "user", content: "draft a loan contract" }],
      },
    });

    await h.orchestrator.run(handle.taskId);
    expect(h.repo.snapshot(handle.taskId)?.status).toBe("pending_review");

    const decision = await h.simulateDecideTaskApproval(handle.taskId, "rejected", {
      reason: "policy violation",
      reviewer: "admin-1",
    });
    expect(decision.task_status).toBe("failed");
    expect(decision.post_execute_hold).toBe(true);

    const final = h.repo.snapshot(handle.taskId);
    expect(final?.status).toBe("failed");
    expect(final?.error_code).toBe("REVIEW_REJECTED");
    expect(final?.blocked_reason).toBe("policy violation");
  });
});

// ── Failure-path coverage ─────────────────────────────────────────────────

describe("LB1 #836 — AI dispatch failure paths", () => {
  it("orchestrator agent-quota peek refuses ⇒ blocked / QUOTA_EXCEEDED, runner never called, no consume", async () => {
    const blockingGate: AgentQuotaGate = {
      peek: async () => ({
        ok: false,
        reason: "rate_limit",
        window: "minute",
        currentCount: 600,
        limitCount: 600,
      }),
    };
    const h = buildAiDispatchHarness({
      verifiers: ALL_AI_PASSING_VERIFIERS,
      agentQuotaGate: blockingGate,
    });

    const handle = h.simulateDispatch({
      domain: AI_DOMAIN,
      taskType: AI_TASK_TYPES.COMPLETION,
      payload: {
        feature: "support_chat",
        messages: [{ role: "user", content: "hi" }],
      },
    });

    const outcome = await h.orchestrator.run(handle.taskId);

    expect(outcome.finalStatus).toBe("blocked");
    expect(outcome.errorCode).toBe("QUOTA_EXCEEDED");
    expect(h.repo.snapshot(handle.taskId)?.status).toBe("blocked");

    // Adapter never reached: provider not invoked, no interaction row,
    // no consume bump.
    expect(h.runnerCalls()).toEqual({ completion: 0, embedding: 0, rag: 0 });
    expect(h.recorded).toHaveLength(0);
    expect(h.consumes).toHaveLength(0);

    expect(h.sink.names()).not.toContain(CANONICAL_EXECUTION_EVENTS.TASK_LOCKED);
    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_BLOCKED);
  });

  it("ai_interactions persist failure ⇒ failed / PERSIST_INTERACTION_FAILED, no quota bump", async () => {
    const h = buildAiDispatchHarness({
      verifiers: ALL_AI_PASSING_VERIFIERS,
      recordThrows: new Error("ai_interactions insert failed: simulated"),
    });

    const handle = h.simulateDispatch({
      domain: AI_DOMAIN,
      taskType: AI_TASK_TYPES.COMPLETION,
      payload: {
        feature: "support_chat",
        messages: [{ role: "user", content: "hi" }],
      },
    });

    const outcome = await h.orchestrator.run(handle.taskId);

    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe(AI_ERROR_CODES.PERSIST_INTERACTION_FAILED);
    expect(h.repo.snapshot(handle.taskId)?.status).toBe("failed");

    // Provider was invoked, but persistence failed BEFORE the quota bump
    // — the adapter must not double-count when traceability is broken.
    expect(h.runnerCalls()).toEqual({ completion: 1, embedding: 0, rag: 0 });
    expect(h.consumes).toHaveLength(0);

    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_FAILED);
    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_UNLOCKED);
  });

  it("verifier mismatch ⇒ failed / VERIFICATION_MISMATCH (interaction recorded + quota bumped before verifier ran)", async () => {
    const h = buildAiDispatchHarness({
      verifiers: [MISMATCH_COMPLETION_VERIFIER],
    });

    const handle = h.simulateDispatch({
      domain: AI_DOMAIN,
      taskType: AI_TASK_TYPES.COMPLETION,
      payload: {
        feature: "support_chat",
        messages: [{ role: "user", content: "hi" }],
      },
    });

    const outcome = await h.orchestrator.run(handle.taskId);

    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe("VERIFICATION_MISMATCH");
    expect(h.repo.snapshot(handle.taskId)?.status).toBe("failed");

    // The adapter reported success — interaction recorded and quota
    // consumed before the verifier rejected the run.
    expect(h.runnerCalls()).toEqual({ completion: 1, embedding: 0, rag: 0 });
    expect(h.recorded).toHaveLength(1);
    expect(h.consumes).toHaveLength(1);

    expect(h.sink.names()).toContain(
      CANONICAL_EXECUTION_EVENTS.TASK_VERIFICATION_FAILED,
    );
    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_FAILED);
  });

  it("adapter throws (provider unreachable) ⇒ failed / PROVIDER_FAILED, no interaction, no consume", async () => {
    const h = buildAiDispatchHarness({
      verifiers: ALL_AI_PASSING_VERIFIERS,
      runnerThrows: {
        method: "completion",
        error: new Error("provider 503 unavailable"),
      },
    });

    const handle = h.simulateDispatch({
      domain: AI_DOMAIN,
      taskType: AI_TASK_TYPES.COMPLETION,
      payload: {
        feature: "support_chat",
        messages: [{ role: "user", content: "hi" }],
      },
    });

    const outcome = await h.orchestrator.run(handle.taskId);

    // The AI adapter catches provider throws and returns a structured
    // failure with PROVIDER_FAILED — orchestrator marks the task failed
    // via the "adapter reported failure" branch.
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe(AI_ERROR_CODES.PROVIDER_FAILED);
    expect(outcome.errorMessage).toMatch(/provider 503/);
    expect(h.repo.snapshot(handle.taskId)?.status).toBe("failed");

    expect(h.recorded).toHaveLength(0);
    expect(h.consumes).toHaveLength(0);

    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_FAILED);
    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_UNLOCKED);
  });
});
