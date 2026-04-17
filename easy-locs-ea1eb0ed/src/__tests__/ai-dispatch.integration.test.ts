/**
 * LB1 follow-up #836 — End-to-end integration tests for the AI dispatch flow.
 *
 * Scope: prove the full chain holds together with no live Supabase.
 *
 *   queued task row
 *     → ExecutionOrchestratorV2 (validate / authorize / lock /
 *       agent-quota peek / execute / verify / persist)
 *     → createAiCompletionAdapter (validate payload / call LLMRunner /
 *       record ai_interactions / quota.consume)
 *     → terminal status (succeeded | pending_review | failed | blocked)
 *     → simulated `system.decide_task_approval` (transition
 *       pending_review → approved → queued and re-run the orchestrator)
 *
 * The harness is a deliberate, lightweight composition of the same
 * in-memory fakes used by `src/test/orchestrator-v2.test.ts` plus stub
 * implementations of the AI adapter's three external dependencies
 * (LLMRunner, QuotaGate, InteractionSink). No production code is
 * duplicated — we wire the real `createAiCompletionAdapter` and the
 * real `ExecutionOrchestratorV2` and let them run end-to-end.
 */

import { beforeAll, describe, expect, it } from "vitest";

import {
  AdapterRegistry,
  setStrictAgentRegistration,
} from "../../supabase/functions/_shared/execution/adapter-registry.ts";
import {
  CANONICAL_EXECUTION_EVENTS,
  InMemoryEventSink,
} from "../../supabase/functions/_shared/execution/canonical-events.ts";
import {
  MemoryIdempotencyService,
} from "../../supabase/functions/_shared/execution/idempotency-service.ts";
import {
  MemoryLockService,
} from "../../supabase/functions/_shared/execution/lock-service.ts";
import {
  ExecutionOrchestratorV2,
  type AgentQuotaGate,
  type ValidationGate,
} from "../../supabase/functions/_shared/execution/orchestrator-v2.ts";
import {
  TaskVerificationService,
} from "../../supabase/functions/_shared/execution/verification-service.ts";
import {
  VerifierRegistry,
  type TaskVerifier,
} from "../../supabase/functions/_shared/execution/verifier-registry.ts";
import {
  createAiCompletionAdapter,
  type AiAdapterDeps,
  type InteractionSink,
  type LLMRunner,
  type QuotaGate,
} from "../../supabase/functions/_shared/execution/adapters/ai/ai-adapter.ts";
import {
  AI_AGENT_SLUGS,
  AI_DOMAIN,
  AI_ERROR_CODES,
  AI_TASK_TYPES,
  type AiInteractionRecord,
} from "../../supabase/functions/_shared/execution/adapters/ai/types.ts";
import type {
  ExecutionTask,
  ExecutionTaskStatus,
} from "../../supabase/functions/_shared/execution/types.ts";
import type { TaskRepository } from "../../supabase/functions/_shared/execution/persistence.ts";
import { makeTask } from "../../supabase/functions/_shared/execution/__test-helpers__.ts";

// Local in-memory repository — mirrors the SQL state machine for the
// hops used by the AI dispatch flow (including running → pending_review
// for the sensitive-output hold). The shared `MemoryTaskRepository`
// helper in `__test-helpers__.ts` predates LB1 and rejects that hop, so
// we use a more permissive fake that matches `system.execution_tasks`.
const ALLOWED: Record<ExecutionTaskStatus, ExecutionTaskStatus[]> = {
  draft: ["pending_review", "approved", "queued", "cancelled"],
  pending_review: ["approved", "rejected", "succeeded", "failed", "cancelled"],
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

class LocalRepo implements TaskRepository {
  private rows = new Map<string, ExecutionTask>();
  upsert(t: ExecutionTask) { this.rows.set(t.id, { ...t }); }
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
}

// The AI adapter declares an `agent` ref (registered in production via the
// agent reconciler), but we wire it manually here without going through
// agent registration. Strict mode would refuse the bare `register()` call
// — the same opt-out used by `orchestrator-v2.test.ts`.
beforeAll(() => setStrictAgentRegistration(false));

// ── Harness ───────────────────────────────────────────────────────────────

const PASSING_VALIDATOR: ValidationGate = { validate: async () => ({ ok: true }) };

const PASSING_VERIFIER: TaskVerifier = {
  domain: AI_DOMAIN,
  taskType: AI_TASK_TYPES.COMPLETION,
  verify: async () => ({ ok: true }),
};

const MISMATCH_VERIFIER: TaskVerifier = {
  domain: AI_DOMAIN,
  taskType: AI_TASK_TYPES.COMPLETION,
  verify: async () => ({
    ok: false,
    expected: { text: "expected" },
    actual: { text: "actual" },
    mismatchPath: "$.text",
  }),
};

interface RecordedInteraction {
  taskId: string;
  interaction: AiInteractionRecord;
}

interface ConsumeCall {
  agentId: string;
  tokens: number;
  costUsd: number;
}

function makeRunner(opts: { text?: string; throws?: Error } = {}): {
  runner: LLMRunner;
  callCount: () => number;
} {
  let calls = 0;
  return {
    runner: {
      completion: async ({ payload }) => {
        calls++;
        if (opts.throws) throw opts.throws;
        return {
          text: opts.text ?? "Hello world",
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
      embedding: async () => {
        throw new Error("not used in this suite");
      },
      rag: async () => {
        throw new Error("not used in this suite");
      },
    },
    callCount: () => calls,
  };
}

function makeQuotaGate(opts: {
  consumeOk?: boolean;
  consumeBlockedReason?: string;
} = {}): { gate: QuotaGate; consumes: ConsumeCall[] } {
  const consumes: ConsumeCall[] = [];
  return {
    gate: {
      // Adapter no longer calls peek — orchestrator owns that. Provide a
      // permissive impl anyway so the contract remains satisfied.
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

function makeInteractionSink(opts: { throws?: Error } = {}): {
  sink: InteractionSink;
  recorded: RecordedInteraction[];
} {
  const recorded: RecordedInteraction[] = [];
  return {
    sink: {
      record: async ({ task, interaction }) => {
        if (opts.throws) throw opts.throws;
        recorded.push({ taskId: task.id, interaction });
      },
    },
    recorded,
  };
}

interface BuiltHarness {
  orchestrator: ExecutionOrchestratorV2;
  registry: AdapterRegistry;
  repo: LocalRepo;
  sink: InMemoryEventSink;
  locks: MemoryLockService;
  verifierRegistry: VerifierRegistry;
  runnerCalls: () => number;
  consumes: ConsumeCall[];
  recorded: RecordedInteraction[];
}

function buildHarness(opts: {
  runnerText?: string;
  runnerThrows?: Error;
  consumeOk?: boolean;
  consumeBlockedReason?: string;
  recordThrows?: Error;
  agentQuotaGate?: AgentQuotaGate;
  verifier?: TaskVerifier | null;
  resolveAgentId?: (slug: string) => Promise<string | null>;
} = {}): BuiltHarness {
  const { runner, callCount } = makeRunner({
    text: opts.runnerText,
    throws: opts.runnerThrows,
  });
  const { gate: quota, consumes } = makeQuotaGate({
    consumeOk: opts.consumeOk,
    consumeBlockedReason: opts.consumeBlockedReason,
  });
  const { sink: interactions, recorded } = makeInteractionSink({
    throws: opts.recordThrows,
  });

  const adapterDeps: AiAdapterDeps = {
    runner,
    quota,
    interactions,
    resolveAgentId:
      opts.resolveAgentId ?? (async (slug) => `agent-${slug}`),
  };
  const adapter = createAiCompletionAdapter(adapterDeps);

  const registry = new AdapterRegistry();
  registry.register(adapter);

  const verifierRegistry = new VerifierRegistry();
  if (opts.verifier !== null) {
    verifierRegistry.register(opts.verifier ?? PASSING_VERIFIER);
  }

  const repo = new LocalRepo();
  const sink = new InMemoryEventSink();

  const orchestrator = new ExecutionOrchestratorV2({
    registry,
    repository: repo,
    locks: new MemoryLockService(),
    idempotency: new MemoryIdempotencyService(),
    validator: PASSING_VALIDATOR,
    verification: new TaskVerificationService(verifierRegistry),
    sink,
    ownerId: "test-orch-ai",
    lockTtlSeconds: 30,
    agentQuotaGate: opts.agentQuotaGate,
  });

  return {
    orchestrator,
    registry,
    repo,
    sink,
    locks: new MemoryLockService(), // unused here; orchestrator owns its own
    verifierRegistry,
    runnerCalls: callCount,
    consumes,
    recorded,
  };
}

function makeAiTask(overrides: Partial<ExecutionTask> = {}): ExecutionTask {
  // Build the base via `makeTask`, then layer overrides on top so an
  // explicit `agent_id` always survives (avoids the spread-of-undefined
  // gotcha that previously cleared the field set in the helper).
  const base = makeTask({
    domain: AI_DOMAIN,
    type: AI_TASK_TYPES.COMPLETION,
    risk_level: "MEDIUM",
    status: "queued",
    rollback_strategy: "none",
    payload: {
      feature: "support_chat",
      messages: [{ role: "user", content: "hi" }],
    },
  });
  return {
    ...base,
    ...overrides,
    agent_id: overrides.agent_id ?? `agent-${AI_AGENT_SLUGS.AI_COMPLETION}`,
    payload: overrides.payload ?? base.payload,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("LB1 #836 — AI dispatch end-to-end (happy path)", () => {
  it("dispatch → execute → ai_interactions linked → quota incremented exactly once", async () => {
    const h = buildHarness();
    const task = makeAiTask();
    h.repo.upsert(task);

    const outcome = await h.orchestrator.run(task.id);

    // Orchestrator outcome
    expect(outcome.finalStatus).toBe("succeeded");
    expect(outcome.errorCode).toBeUndefined();

    // Persistence
    const row = h.repo.snapshot(task.id);
    expect(row?.status).toBe("succeeded");

    // Provider was invoked exactly once
    expect(h.runnerCalls()).toBe(1);

    // ai_interactions row was written and is linked back to the task id
    expect(h.recorded).toHaveLength(1);
    expect(h.recorded[0].taskId).toBe(task.id);
    expect(h.recorded[0].interaction.feature).toBe("support_chat");

    // Quota was bumped exactly once with real token + cost figures
    expect(h.consumes).toHaveLength(1);
    expect(h.consumes[0].agentId).toBe(`agent-${AI_AGENT_SLUGS.AI_COMPLETION}`);
    expect(h.consumes[0].tokens).toBe(42);
    expect(h.consumes[0].costUsd).toBeCloseTo(0.000123, 6);

    // Canonical events fired in the documented order
    expect(h.sink.names()).toEqual([
      CANONICAL_EXECUTION_EVENTS.TASK_QUEUED,
      CANONICAL_EXECUTION_EVENTS.TASK_LOCKED,
      CANONICAL_EXECUTION_EVENTS.TASK_STARTED,
      CANONICAL_EXECUTION_EVENTS.TASK_VERIFIED,
      CANONICAL_EXECUTION_EVENTS.TASK_SUCCEEDED,
      CANONICAL_EXECUTION_EVENTS.TASK_UNLOCKED,
    ]);
  });
});

describe("LB1 #836 — AI dispatch sensitive path (purpose=contract)", () => {
  it("transitions running → pending_review and a simulated approval releases the response", async () => {
    const h = buildHarness();
    const task = makeAiTask({
      payload: {
        feature: "loan.contract",
        purpose: "contract",
        messages: [{ role: "user", content: "draft a loan contract" }],
      },
    });
    h.repo.upsert(task);

    const outcome = await h.orchestrator.run(task.id);

    // Orchestrator returns blocked / REVIEW_HOLD when the adapter flags
    // the output sensitive (status itself is pending_review on the row).
    expect(outcome.finalStatus).toBe("blocked");
    expect(outcome.errorCode).toBe("REVIEW_HOLD");

    const heldRow = h.repo.snapshot(task.id);
    expect(heldRow?.status).toBe("pending_review");
    expect(heldRow?.blocked_reason).toMatch(/purpose:contract/);

    // The held output is preserved on the row so the approval drawer can
    // show the reviewer what they are about to release.
    const heldResult = heldRow?.execution_result as { output?: { flaggedSensitive?: boolean } } | null | undefined;
    expect(heldResult?.output?.flaggedSensitive).toBe(true);

    // The approvals inbox query (production: `system.decide_task_approval`)
    // walks pending_review → approved → queued. We simulate the same hops
    // through the in-memory repository so the row is eligible for re-run.
    const toApproved = await h.repo.transition(task.id, "pending_review", "approved", {
      approved_by: "admin-1",
    });
    expect(toApproved).toBe(true);
    const toQueued = await h.repo.transition(task.id, "approved", "queued");
    expect(toQueued).toBe(true);

    // Re-running the orchestrator on the released task succeeds. The
    // sensitive-purpose flag is still present, so the adapter would flag
    // it again and the run would re-hold; for the integration test we
    // strip the sensitive purpose to model "approver edited and released"
    // (the production approval path persists the reviewer-edited output).
    h.repo.upsert({
      ...(h.repo.snapshot(task.id) as ExecutionTask),
      payload: {
        feature: "loan.contract",
        messages: [{ role: "user", content: "approved release" }],
      },
    });

    const releaseOutcome = await h.orchestrator.run(task.id);
    expect(releaseOutcome.finalStatus).toBe("succeeded");
    expect(h.repo.snapshot(task.id)?.status).toBe("succeeded");
  });
});

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
    const h = buildHarness({ agentQuotaGate: blockingGate });
    const task = makeAiTask();
    h.repo.upsert(task);

    const outcome = await h.orchestrator.run(task.id);

    expect(outcome.finalStatus).toBe("blocked");
    expect(outcome.errorCode).toBe("QUOTA_EXCEEDED");
    expect(h.repo.snapshot(task.id)?.status).toBe("blocked");

    // Adapter never reached: provider not invoked, no interaction row,
    // no consume bump.
    expect(h.runnerCalls()).toBe(0);
    expect(h.recorded).toHaveLength(0);
    expect(h.consumes).toHaveLength(0);

    // Lock was never acquired because the gate fires before lock.
    expect(h.sink.names()).not.toContain(CANONICAL_EXECUTION_EVENTS.TASK_LOCKED);
    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_BLOCKED);
  });

  it("ai_interactions persist failure ⇒ failed / PERSIST_INTERACTION_FAILED, no quota bump", async () => {
    const h = buildHarness({
      recordThrows: new Error("ai_interactions insert failed: simulated"),
    });
    const task = makeAiTask();
    h.repo.upsert(task);

    const outcome = await h.orchestrator.run(task.id);

    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe(AI_ERROR_CODES.PERSIST_INTERACTION_FAILED);
    expect(h.repo.snapshot(task.id)?.status).toBe("failed");

    // Provider was invoked, but persistence failed BEFORE the quota bump
    // — the adapter must not double-count when traceability is broken.
    expect(h.runnerCalls()).toBe(1);
    expect(h.consumes).toHaveLength(0);

    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_FAILED);
    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_UNLOCKED);
  });

  it("verifier mismatch ⇒ failed / VERIFICATION_MISMATCH (interaction recorded + quota bumped before verifier ran)", async () => {
    const h = buildHarness({ verifier: MISMATCH_VERIFIER });
    const task = makeAiTask();
    h.repo.upsert(task);

    const outcome = await h.orchestrator.run(task.id);

    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe("VERIFICATION_MISMATCH");
    expect(h.repo.snapshot(task.id)?.status).toBe("failed");

    // The adapter reported success — interaction was recorded and quota
    // was consumed before the verifier rejected the run.
    expect(h.runnerCalls()).toBe(1);
    expect(h.recorded).toHaveLength(1);
    expect(h.consumes).toHaveLength(1);

    expect(h.sink.names()).toContain(
      CANONICAL_EXECUTION_EVENTS.TASK_VERIFICATION_FAILED,
    );
    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_FAILED);
  });

  it("adapter throws (provider unreachable) ⇒ failed / PROVIDER_FAILED, no interaction, no consume", async () => {
    const h = buildHarness({
      runnerThrows: new Error("provider 503 unavailable"),
    });
    const task = makeAiTask();
    h.repo.upsert(task);

    const outcome = await h.orchestrator.run(task.id);

    // The AI adapter catches provider throws and returns a structured
    // failure with PROVIDER_FAILED — orchestrator therefore marks the
    // task failed via the "adapter reported failure" branch (ADAPTER_FAILED
    // never fires because errorCode is set on the result).
    expect(outcome.finalStatus).toBe("failed");
    expect(outcome.errorCode).toBe(AI_ERROR_CODES.PROVIDER_FAILED);
    expect(outcome.errorMessage).toMatch(/provider 503/);
    expect(h.repo.snapshot(task.id)?.status).toBe("failed");

    expect(h.recorded).toHaveLength(0);
    expect(h.consumes).toHaveLength(0);

    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_FAILED);
    expect(h.sink.names()).toContain(CANONICAL_EXECUTION_EVENTS.TASK_UNLOCKED);
  });
});
