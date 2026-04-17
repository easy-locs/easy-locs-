/**
 * Shared AI dispatch test harness (LB1 #836 rework).
 *
 * Reusable in-memory wiring for any test that needs to drive the canonical
 * Easy-Locs execution flow end-to-end:
 *
 *   simulateDispatch({domain, taskType, payload, ...})
 *     → mirrors `system.dispatch_execution_task` (writes a queued row,
 *       returns a `DispatchedTaskHandle` shaped exactly like the
 *       `src/lib/execution/dispatch.ts` helper that production callsites use)
 *   orchestrator.run(taskId)
 *     → real `ExecutionOrchestratorV2` + real domain adapters
 *   listApprovalsInbox()
 *     → mirrors the approvals-inbox query surface used by
 *       `src/pages/admin/AdminApprovalsPage.tsx` (rows in `pending_review`)
 *   simulateDecideTaskApproval(taskId, decision, opts)
 *     → mirrors `system.decide_task_approval` SQL RPC, including the
 *       post-execute hold branch (release succeeds, rejection fails,
 *       changes_requested → draft) and the canonical event emission.
 *
 * The harness deliberately mirrors the SQL contract rather than mocking
 * `@/services/db` because the orchestrator + adapters are Deno modules
 * that import via `https://esm.sh/...`. A direct `db` mock would require
 * the entire src ↔ supabase functions boundary to be re-plumbed for
 * vitest. Instead we honour the same row shape and return shape, so any
 * caller that uses `dispatchExecutionTask` + `decide_task_approval` in
 * production exercises the same state machine here.
 *
 * The harness is generic over the set of adapters / verifiers the caller
 * registers; the AI-specific helpers (LLMRunner / QuotaGate /
 * InteractionSink stubs, four-adapter wiring) are layered on top via
 * `buildAiDispatchHarness({...})`.
 */

import {
  AdapterRegistry,
  setStrictAgentRegistration,
} from "../../../supabase/functions/_shared/execution/adapter-registry.ts";
import {
  CANONICAL_EXECUTION_EVENTS,
  InMemoryEventSink,
} from "../../../supabase/functions/_shared/execution/canonical-events.ts";
import {
  MemoryIdempotencyService,
} from "../../../supabase/functions/_shared/execution/idempotency-service.ts";
import {
  MemoryLockService,
} from "../../../supabase/functions/_shared/execution/lock-service.ts";
import {
  ExecutionOrchestratorV2,
  type AgentQuotaGate,
  type ValidationGate,
} from "../../../supabase/functions/_shared/execution/orchestrator-v2.ts";
import {
  TaskVerificationService,
} from "../../../supabase/functions/_shared/execution/verification-service.ts";
import {
  VerifierRegistry,
  type TaskVerifier,
} from "../../../supabase/functions/_shared/execution/verifier-registry.ts";
import {
  createAiCompletionAdapter,
  createAiEmbeddingAdapter,
  createAiRagAdapter,
  createAiToolUseAdapter,
  type AiAdapterDeps,
  type InteractionSink,
  type LLMRunner,
  type QuotaGate,
} from "../../../supabase/functions/_shared/execution/adapters/ai/ai-adapter.ts";
import {
  AI_AGENT_SLUGS,
  AI_DOMAIN,
  AI_TASK_TYPES,
  type AiInteractionRecord,
  type AiTaskType,
} from "../../../supabase/functions/_shared/execution/adapters/ai/types.ts";
import type {
  ExecutionTask,
  ExecutionTaskStatus,
} from "../../../supabase/functions/_shared/execution/types.ts";
import type { DomainAdapter } from "../../../supabase/functions/_shared/execution/adapter-registry.ts";
import type { TaskRepository } from "../../../supabase/functions/_shared/execution/persistence.ts";
import { makeTask } from "../../../supabase/functions/_shared/execution/__test-helpers__.ts";

// ── In-memory repository (mirrors `system.execution_tasks` transitions) ──

/**
 * Permissive transition table — extends the shared
 * `MemoryTaskRepository` rules with the LB1 hops the AI dispatch flow
 * needs (running → pending_review for sensitive holds, pending_review →
 * succeeded/failed for post-execute approval / rejection).
 */
const ALLOWED: Record<ExecutionTaskStatus, ExecutionTaskStatus[]> = {
  draft: ["pending_review", "approved", "queued", "cancelled"],
  pending_review: ["approved", "rejected", "succeeded", "failed", "draft", "cancelled"],
  approved: ["queued", "cancelled"],
  rejected: ["draft", "cancelled"],
  queued: ["running", "blocked", "cancelled"],
  running: ["succeeded", "failed", "blocked", "pending_review", "running"],
  failed: ["queued", "blocked", "rolled_back", "rolling_back", "cancelled"],
  succeeded: ["rolled_back", "rolling_back"],
  blocked: ["queued", "cancelled"],
  rolling_back: ["rolled_back", "rollback_failed"],
  rolled_back: [],
  rollback_failed: ["rolling_back", "blocked", "cancelled"],
  cancelled: [],
};

export class HarnessTaskRepository implements TaskRepository {
  private rows = new Map<string, ExecutionTask>();
  upsert(t: ExecutionTask) {
    this.rows.set(t.id, { ...t });
  }
  async loadTask(id: string): Promise<ExecutionTask | null> {
    const r = this.rows.get(id);
    return r ? { ...r } : null;
  }
  async transition(
    id: string,
    from: ExecutionTaskStatus,
    to: ExecutionTaskStatus,
    patch: Record<string, unknown> = {},
  ): Promise<boolean> {
    const r = this.rows.get(id);
    if (!r) return false;
    if (r.status !== from) return false;
    if (from !== to && !ALLOWED[from].includes(to)) return false;
    this.rows.set(id, { ...r, ...patch, status: to } as ExecutionTask);
    return true;
  }
  snapshot(id: string): ExecutionTask | null {
    const r = this.rows.get(id);
    return r ? { ...r } : null;
  }
  /** Test-only direct write (e.g. simulating reviewer-edited payload). */
  rawUpdate(id: string, patch: Partial<ExecutionTask>): void {
    const r = this.rows.get(id);
    if (!r) return;
    this.rows.set(id, { ...r, ...patch } as ExecutionTask);
  }
  /** Approvals-inbox query surface — production: filter by status. */
  listByStatus(status: ExecutionTaskStatus): ExecutionTask[] {
    return Array.from(this.rows.values())
      .filter((r) => r.status === status)
      .map((r) => ({ ...r }));
  }
}

// ── Dispatch + approval simulators (mirror the SQL contract) ──────────────

/** Matches the shape of `src/lib/execution/dispatch.ts#DispatchedTaskHandle`. */
export interface DispatchedTaskHandle {
  taskId: string;
  status: "queued" | "approved" | "blocked" | "pending_review";
  agentId: string | null;
  agentVersionId: string | null;
  blockedReason: string | null;
}

export interface SimulateDispatchInput {
  domain: string;
  taskType: string;
  payload?: Record<string, unknown>;
  riskLevel?: ExecutionTask["risk_level"];
  requiresApproval?: boolean;
  approvedBy?: string | null;
  requestedBy?: string;
  correlationId?: string | null;
  agentId?: string | null;
}

/**
 * Simulates `system.dispatch_execution_task`. Inserts a fully-shaped
 * `system.execution_tasks` row into the harness repo and returns the
 * handle the production helper would return.
 */
export function makeSimulateDispatch(repo: HarnessTaskRepository) {
  return function simulateDispatch(input: SimulateDispatchInput): DispatchedTaskHandle {
    const status: ExecutionTask["status"] = input.requiresApproval
      ? "pending_review"
      : "queued";
    const row = makeTask({
      domain: input.domain,
      type: input.taskType,
      risk_level: input.riskLevel ?? "MEDIUM",
      status,
      payload: input.payload ?? {},
      approved_by: input.approvedBy ?? "admin-1",
      requested_by: input.requestedBy ?? "system",
      correlation_id: input.correlationId ?? null,
      requires_approval: input.requiresApproval ?? false,
      rollback_strategy: "none",
    });
    // Adapter resolves agent id from the slug; we stamp the row with the
    // same convention used by the harness resolveAgentId default below.
    const agentId =
      input.agentId ??
      `agent-${input.taskType === AI_TASK_TYPES.COMPLETION
        ? AI_AGENT_SLUGS.AI_COMPLETION
        : input.taskType === AI_TASK_TYPES.EMBEDDING
          ? AI_AGENT_SLUGS.AI_EMBEDDING
          : input.taskType === AI_TASK_TYPES.RAG
            ? AI_AGENT_SLUGS.AI_RAG
            : input.taskType === AI_TASK_TYPES.TOOL_USE
              ? AI_AGENT_SLUGS.AI_TOOL_USE
              : input.domain
        }`;
    const stamped: ExecutionTask = { ...row, agent_id: agentId } as ExecutionTask;
    repo.upsert(stamped);
    return {
      taskId: stamped.id,
      status,
      agentId,
      agentVersionId: null,
      blockedReason: null,
    };
  };
}

export type ApprovalDecision = "approved" | "rejected" | "changes_requested" | "comment";

export interface DecideTaskApprovalResult {
  ok: true;
  idempotent: boolean;
  approval_id: string;
  decision: ApprovalDecision;
  task_status: ExecutionTaskStatus;
  post_execute_hold: boolean;
}

/**
 * Simulates `system.decide_task_approval`. Mirrors the post-execute /
 * pre-execute branching in `20260425000000_lb1_lifecycle_quota.sql`:
 *   - approved + post-execute hold ⇒ pending_review → succeeded
 *   - approved + pre-execute       ⇒ pending_review → approved
 *   - rejected + post-execute hold ⇒ pending_review → failed (REVIEW_REJECTED)
 *   - rejected + pre-execute       ⇒ pending_review → rejected
 *   - changes_requested            ⇒ pending_review → draft
 *
 * Caller-id / role gating is omitted — the SQL function enforces
 * super_admin via `has_role()`; that is verified by
 * `supabase/tests/admin_approvals_inbox.test.sql`. This simulator is for
 * the orchestration / state-machine half of the contract.
 */
export function makeSimulateDecideTaskApproval(
  repo: HarnessTaskRepository,
  sink?: InMemoryEventSink,
) {
  let approvalSeq = 0;
  return async function simulateDecideTaskApproval(
    taskId: string,
    decision: ApprovalDecision,
    opts: { reason?: string; reviewer?: string } = {},
  ): Promise<DecideTaskApprovalResult> {
    const current = repo.snapshot(taskId);
    if (!current) throw new Error(`decide_task_approval: task ${taskId} not found`);
    if (current.status !== "pending_review" && decision !== "comment") {
      throw new Error(
        `decide_task_approval: task ${taskId} is in status ${current.status} (must be pending_review)`,
      );
    }
    if (decision === "rejected" && !opts.reason) {
      throw new Error("decide_task_approval: rejection requires a non-empty reason");
    }
    const postExecute = current.execution_result != null;
    const reviewer = opts.reviewer ?? "admin-1";
    const approvalId = `approval-${++approvalSeq}`;

    if (decision === "approved") {
      if (postExecute) {
        await repo.transition(taskId, "pending_review", "succeeded", {
          approved_by: reviewer,
        });
      } else {
        await repo.transition(taskId, "pending_review", "approved", {
          approved_by: reviewer,
        });
      }
    } else if (decision === "rejected") {
      if (postExecute) {
        await repo.transition(taskId, "pending_review", "failed", {
          error_code: "REVIEW_REJECTED",
          blocked_reason: opts.reason,
        });
      } else {
        await repo.transition(taskId, "pending_review", "rejected", {
          blocked_reason: opts.reason,
        });
      }
    } else if (decision === "changes_requested") {
      await repo.transition(taskId, "pending_review", "draft", {
        blocked_reason: opts.reason ?? "changes requested by reviewer",
      });
    }

    sink?.emit({
      name: CANONICAL_EXECUTION_EVENTS.APPROVAL_DECIDED,
      taskId,
      domain: current.domain,
      taskType: current.type,
      timestamp: new Date().toISOString(),
      correlationId: current.correlation_id ?? null,
      rootTaskId: current.root_task_id ?? null,
      payload: {
        approval_id: approvalId,
        decision,
        reviewer,
        reason: opts.reason ?? null,
        post_execute_hold: postExecute,
      },
    });

    const after = repo.snapshot(taskId)!;
    return {
      ok: true,
      idempotent: false,
      approval_id: approvalId,
      decision,
      task_status: after.status,
      post_execute_hold: postExecute,
    };
  };
}

// ── Generic dispatch harness factory ──────────────────────────────────────

export interface DispatchHarness {
  orchestrator: ExecutionOrchestratorV2;
  registry: AdapterRegistry;
  repo: HarnessTaskRepository;
  sink: InMemoryEventSink;
  verifierRegistry: VerifierRegistry;
  simulateDispatch: ReturnType<typeof makeSimulateDispatch>;
  simulateDecideTaskApproval: ReturnType<typeof makeSimulateDecideTaskApproval>;
  listApprovalsInbox(): ExecutionTask[];
}

export const PASSING_VALIDATOR: ValidationGate = { validate: async () => ({ ok: true }) };

export function createDispatchHarness(opts: {
  adapters: DomainAdapter[];
  verifiers?: TaskVerifier[];
  agentQuotaGate?: AgentQuotaGate;
  validator?: ValidationGate;
}): DispatchHarness {
  // The adapters declare an `agent` ref but bypass agent registration —
  // mirrors the opt-out used by `orchestrator-v2.test.ts`.
  setStrictAgentRegistration(false);

  const registry = new AdapterRegistry();
  for (const a of opts.adapters) registry.register(a);

  const verifierRegistry = new VerifierRegistry();
  for (const v of opts.verifiers ?? []) verifierRegistry.register(v);

  const repo = new HarnessTaskRepository();
  const sink = new InMemoryEventSink();

  const orchestrator = new ExecutionOrchestratorV2({
    registry,
    repository: repo,
    locks: new MemoryLockService(),
    idempotency: new MemoryIdempotencyService(),
    validator: opts.validator ?? PASSING_VALIDATOR,
    verification: new TaskVerificationService(verifierRegistry),
    sink,
    ownerId: "test-orch-ai",
    lockTtlSeconds: 30,
    agentQuotaGate: opts.agentQuotaGate,
  });

  const simulateDispatch = makeSimulateDispatch(repo);
  const simulateDecideTaskApproval = makeSimulateDecideTaskApproval(repo, sink);

  return {
    orchestrator,
    registry,
    repo,
    sink,
    verifierRegistry,
    simulateDispatch,
    simulateDecideTaskApproval,
    listApprovalsInbox: () => repo.listByStatus("pending_review"),
  };
}

// ── AI-specific stubs + factory ───────────────────────────────────────────

export interface RecordedInteraction {
  taskId: string;
  domainTaskType: AiTaskType;
  interaction: AiInteractionRecord;
}

export interface ConsumeCall {
  agentId: string;
  tokens: number;
  costUsd: number;
}

export interface AiHarnessOpts {
  /** Override completion text. */
  completionText?: string;
  /** Throw inside the LLMRunner method — exercises PROVIDER_FAILED. */
  runnerThrows?: { method: "completion" | "embedding" | "rag"; error: Error };
  /** Force `consume()` to fail. */
  consumeOk?: boolean;
  consumeBlockedReason?: string;
  /** Throw inside the InteractionSink — exercises PERSIST_INTERACTION_FAILED. */
  recordThrows?: Error;
  /** Plug in an orchestrator-side quota gate (peek). */
  agentQuotaGate?: AgentQuotaGate;
  /** Verifier override (default: passing for COMPLETION). */
  verifiers?: TaskVerifier[];
  /** Override agent-id resolver (default: `agent-${slug}`). */
  resolveAgentId?: (slug: string) => Promise<string | null>;
}

export interface AiDispatchHarness extends DispatchHarness {
  runnerCalls(): { completion: number; embedding: number; rag: number };
  consumes: ConsumeCall[];
  recorded: RecordedInteraction[];
}

function makeRunner(
  opts: AiHarnessOpts,
): { runner: LLMRunner; counts: { completion: number; embedding: number; rag: number } } {
  const counts = { completion: 0, embedding: 0, rag: 0 };
  const maybeThrow = (method: "completion" | "embedding" | "rag") => {
    if (opts.runnerThrows && opts.runnerThrows.method === method) {
      throw opts.runnerThrows.error;
    }
  };
  return {
    counts,
    runner: {
      completion: async ({ payload }) => {
        counts.completion++;
        maybeThrow("completion");
        return {
          text: opts.completionText ?? "Hello world",
          interaction: {
            feature: payload.feature,
            provider: "openai",
            model: "gpt-4o-mini",
            promptTokens: 12,
            completionTokens: 30,
            costUsd: 0.000123,
            latencyMs: 220,
            fallbackUsed: false,
            status: "ok",
            metadata: {},
          },
        };
      },
      embedding: async ({ payload }) => {
        counts.embedding++;
        maybeThrow("embedding");
        const inputs = Array.isArray(payload.input) ? payload.input : [payload.input];
        return {
          vectors: inputs.map(() => [0.1, 0.2, 0.3]),
          dim: 3,
          interaction: {
            feature: payload.feature,
            provider: "openai",
            model: "text-embedding-3-small",
            promptTokens: 8,
            completionTokens: 0,
            costUsd: 0.000004,
            latencyMs: 30,
            fallbackUsed: false,
            status: "ok",
            metadata: {},
          },
        };
      },
      rag: async ({ payload }) => {
        counts.rag++;
        maybeThrow("rag");
        return {
          answer: `RAG answer for ${payload.query}`,
          citations: [{ id: "doc-1", score: 0.95, snippet: "relevant snippet" }],
          interaction: {
            feature: payload.feature,
            provider: "openai",
            model: "gpt-4o-mini",
            promptTokens: 50,
            completionTokens: 25,
            costUsd: 0.0002,
            latencyMs: 400,
            fallbackUsed: false,
            status: "ok",
            metadata: {},
          },
        };
      },
    },
  };
}

function makeQuotaGate(
  opts: AiHarnessOpts,
): { gate: QuotaGate; consumes: ConsumeCall[] } {
  const consumes: ConsumeCall[] = [];
  return {
    gate: {
      // Adapter no longer calls peek; orchestrator owns the pre-check.
      peek: async () => ({ ok: true }),
      consume: async ({ agentId, tokens, costUsd }) => {
        consumes.push({ agentId, tokens, costUsd });
        return opts.consumeOk === false
          ? {
              ok: false as const,
              blockedReason: opts.consumeBlockedReason ?? "daily_budget_exhausted",
              blockedWindow: "day",
              currentCount: 999,
              limitCount: 999,
            }
          : { ok: true as const };
      },
    },
    consumes,
  };
}

function makeInteractionSink(
  opts: AiHarnessOpts,
): { sink: InteractionSink; recorded: RecordedInteraction[] } {
  const recorded: RecordedInteraction[] = [];
  return {
    sink: {
      record: async ({ task, interaction, domainTaskType }) => {
        if (opts.recordThrows) throw opts.recordThrows;
        recorded.push({ taskId: task.id, interaction, domainTaskType });
      },
    },
    recorded,
  };
}

/**
 * Wires all four AI adapters (completion, embedding, rag, tool-use) into
 * a `createDispatchHarness` instance with the AI-specific stubs.
 */
export function buildAiDispatchHarness(opts: AiHarnessOpts = {}): AiDispatchHarness {
  const { runner, counts } = makeRunner(opts);
  const { gate: quota, consumes } = makeQuotaGate(opts);
  const { sink: interactions, recorded } = makeInteractionSink(opts);

  const adapterDeps: AiAdapterDeps = {
    runner,
    quota,
    interactions,
    resolveAgentId:
      opts.resolveAgentId ?? (async (slug) => `agent-${slug}`),
  };

  const adapters: DomainAdapter[] = [
    createAiCompletionAdapter(adapterDeps),
    createAiEmbeddingAdapter(adapterDeps),
    createAiRagAdapter(adapterDeps),
    createAiToolUseAdapter(adapterDeps),
  ];

  const base = createDispatchHarness({
    adapters,
    verifiers: opts.verifiers,
    agentQuotaGate: opts.agentQuotaGate,
  });

  return {
    ...base,
    runnerCalls: () => ({ ...counts }),
    consumes,
    recorded,
  };
}

// Re-export the canonical events constant so test files do not need to
// import from the supabase-functions tree directly.
export { CANONICAL_EXECUTION_EVENTS };
