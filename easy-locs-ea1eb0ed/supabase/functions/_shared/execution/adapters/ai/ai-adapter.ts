/**
 * AI domain adapters — LB1 (#815).
 *
 * One DomainAdapter per AI task type. All four share:
 *
 *   1. Payload validation (typed reject ⇒ INVALID_PAYLOAD).
 *   2. Quota gate via `system.consume_agent_quota` (rolling minute + day
 *      counters; rejection ⇒ QUOTA_EXCEEDED, deterministic across replicas).
 *   3. Provider call via the injected `LLMRunner` so tests can swap a fake
 *      runner without touching the global `aiRoute`.
 *   4. Sensitive-output classifier — non-AI gate, no model call. When it
 *      flags, the adapter returns SUCCESS with `flaggedSensitive=true` and
 *      the orchestrator's post-execute hook flips the task into
 *      `pending_review` (handled outside this file).
 *   5. Append-only `public.ai_interactions` row linked back to the run via
 *      `execution_task_id` so the conversation explorer can replay it.
 *
 * Rollback strategy: ALL four declare `rollback_strategy="none"`. AI calls
 * are non-undoable (a sent token cannot be unsent), and idempotency is
 * handled at the orchestrator layer via `getIdempotencyKey`. The registry
 * REJECTS adapters that mix `none` with a `rollback()` handler — we honour
 * that by simply not exporting one.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import type {
  AdapterResult,
  DomainAdapter,
  ExecutionContext,
  ExecutionTask,
} from "../../types.ts";
import {
  AI_AGENT_SLUGS,
  AI_DOMAIN,
  AI_ERROR_CODES,
  AI_SENSITIVE_PURPOSES,
  AI_TASK_TYPES,
  type AiCompletionPayload,
  type AiCompletionPurpose,
  type AiCompletionResult,
  type AiEmbeddingPayload,
  type AiEmbeddingResult,
  type AiInteractionRecord,
  type AiRagPayload,
  type AiRagResult,
  type AiTaskType,
  type AiToolUsePayload,
  type AiToolUseResult,
  validateCompletionPayload,
  validateEmbeddingPayload,
  validateRagPayload,
  validateToolUsePayload,
} from "./types.ts";
import {
  classifySensitiveOutput,
  type SensitiveSignal,
} from "./sensitive-classifier.ts";

// ── Pluggable provider runner ─────────────────────────────────────────────
// Tests swap this; production wires it to `_shared/ai-router.ts#aiRoute`.

export interface LLMRunnerCompletionInput {
  payload: AiCompletionPayload;
  task: ExecutionTask;
}
export interface LLMRunnerCompletionOutput {
  text: string;
  json?: unknown;
  interaction: AiInteractionRecord;
}
export interface LLMRunnerEmbeddingInput {
  payload: AiEmbeddingPayload;
  task: ExecutionTask;
}
export interface LLMRunnerEmbeddingOutput {
  vectors: number[][];
  dim: number;
  interaction: AiInteractionRecord;
}
export interface LLMRunnerRagInput {
  payload: AiRagPayload;
  task: ExecutionTask;
}
export interface LLMRunnerRagOutput {
  answer: string;
  citations: Array<{ id: string; score: number; snippet?: string }>;
  interaction: AiInteractionRecord;
}

export interface LLMRunner {
  completion(input: LLMRunnerCompletionInput): Promise<LLMRunnerCompletionOutput>;
  embedding(input: LLMRunnerEmbeddingInput): Promise<LLMRunnerEmbeddingOutput>;
  rag(input: LLMRunnerRagInput): Promise<LLMRunnerRagOutput>;
}

// ── Quota gate (DB RPC) ───────────────────────────────────────────────────

export type QuotaResult =
  | { ok: true }
  | {
    ok: false;
    blockedReason: string;
    blockedWindow: string;
    currentCount: number;
    limitCount: number;
  };

export interface QuotaGate {
  /** Read-only pre-flight check. Never increments. */
  peek(args: { agentId: string }): Promise<QuotaResult>;
  /** Single post-call accounting bump with the actual usage. */
  consume(args: { agentId: string; tokens: number; costUsd: number }): Promise<QuotaResult>;
}

function rowToQuotaResult(
  row: { ok?: boolean; blocked_reason?: string; blocked_window?: string; current_count?: number; limit_count?: number } | null | undefined,
): QuotaResult {
  if (!row || row.ok !== true) {
    return {
      ok: false,
      blockedReason: row?.blocked_reason ?? "unknown",
      blockedWindow: row?.blocked_window ?? "unknown",
      currentCount: row?.current_count ?? 0,
      limitCount: row?.limit_count ?? 0,
    };
  }
  return { ok: true };
}

export function createSupabaseQuotaGate(sb: SupabaseClient): QuotaGate {
  const callRpc = async (fn: "peek_agent_quota" | "consume_agent_quota", args: Record<string, unknown>): Promise<QuotaResult> => {
    const { data, error } = await sb.schema("system").rpc(fn, args);
    if (error) {
      // Conservative: if the RPC fails, fail closed — better to refuse a
      // call than to silently bypass quota.
      return {
        ok: false,
        blockedReason: `quota_rpc_error:${error.message}`,
        blockedWindow: "rpc",
        currentCount: 0,
        limitCount: 0,
      };
    }
    return rowToQuotaResult(Array.isArray(data) ? data[0] : data);
  };
  return {
    peek: ({ agentId }) => callRpc("peek_agent_quota", { p_agent_id: agentId }),
    consume: ({ agentId, tokens, costUsd }) =>
      callRpc("consume_agent_quota", {
        p_agent_id: agentId,
        p_tokens: tokens,
        p_cost_usd: costUsd,
      }),
  };
}

// ── Interaction sink (writes ai_interactions linked to the task) ─────────

export interface InteractionSink {
  record(args: {
    task: ExecutionTask;
    interaction: AiInteractionRecord;
    domainTaskType: AiTaskType;
  }): Promise<void>;
}

export class InteractionSinkError extends Error {
  constructor(public readonly cause: string) {
    super(`ai_interactions insert failed: ${cause}`);
    this.name = "InteractionSinkError";
  }
}

export function createSupabaseInteractionSink(sb: SupabaseClient): InteractionSink {
  return {
    async record({ task, interaction, domainTaskType }) {
      let supabaseError: { message: string } | null = null;
      try {
        const { error } = await sb.from("ai_interactions").insert({
          user_id: task.requested_by ?? null,
          feature: interaction.feature,
          domain: AI_DOMAIN,
          provider: interaction.provider,
          model: interaction.model,
          prompt_tokens: interaction.promptTokens,
          completion_tokens: interaction.completionTokens,
          cost_usd: interaction.costUsd,
          latency_ms: interaction.latencyMs,
          fallback_used: interaction.fallbackUsed,
          status: interaction.status,
          block_reason: interaction.blockReason ?? null,
          execution_task_id: task.id,
          metadata: {
            ...(interaction.metadata ?? {}),
            task_type: domainTaskType,
            correlation_id: task.correlation_id ?? null,
          },
        });
        supabaseError = error ? { message: error.message } : null;
      } catch (e) {
        supabaseError = { message: e instanceof Error ? e.message : String(e) };
      }
      if (supabaseError) {
        // Deterministic failure: every AI call MUST be traceable end-to-end.
        // The orchestrator catches this and stamps the run with
        // PERSIST_INTERACTION_FAILED so operators can investigate.
        console.error("[ai-adapter] ai_interactions insert failed:", supabaseError.message);
        throw new InteractionSinkError(supabaseError.message);
      }
    },
  };
}

// ── Adapter factory ───────────────────────────────────────────────────────

export interface AiAdapterDeps {
  /** Pluggable provider runner (production: wraps _shared/ai-router.ts). */
  runner: LLMRunner;
  /** Quota gate. */
  quota: QuotaGate;
  /** Sink that persists ai_interactions linked to the task. */
  interactions: InteractionSink;
  /** Resolves the agent UUID for a slug; default reads system.agents. */
  resolveAgentId: (slug: string) => Promise<string | null>;
  now?: () => Date;
}

function commonAgentRef(slug: string, kind: "ai.router" | "ai.tool", policy: string) {
  return {
    slug,
    version: "1.0.0",
    kind,
    displayName: ({
      [AI_AGENT_SLUGS.AI_COMPLETION]: "AI Completion Agent",
      [AI_AGENT_SLUGS.AI_EMBEDDING]: "AI Embedding Agent",
      [AI_AGENT_SLUGS.AI_RAG]: "AI RAG Agent",
      [AI_AGENT_SLUGS.AI_TOOL_USE]: "AI Tool-Use Agent",
    } as Record<string, string>)[slug] ?? slug,
    ownerTeam: "ai-platform",
    policyProfile: policy,
    quotas: {},
    metadata: {
      rollback_strategy: "none",
      sensitive_classifier: true,
    },
  };
}

interface CommonExecuteOpts {
  taskType: AiTaskType;
  agentSlug: string;
  deps: AiAdapterDeps;
  // Returns either a fully-typed result (success path) or null (validator failed).
  buildResult: (
    ctx: ExecutionContext,
  ) => Promise<
    | {
      success: true;
      result: Record<string, unknown> & { interaction: AiInteractionRecord };
      sensitive?: SensitiveSignal;
    }
    | {
      success: false;
      errorCode: string;
      errorMessage: string;
      logs: string[];
    }
  >;
}

async function executeWithGuards(opts: CommonExecuteOpts, ctx: ExecutionContext): Promise<AdapterResult> {
  const ts = () => (opts.deps.now?.() ?? new Date()).toISOString();
  const logs: string[] = [];

  // Step 1: resolve agent (needed for quota lookup).
  const agentId = await opts.deps.resolveAgentId(opts.agentSlug);
  if (!agentId) {
    return {
      success: false,
      errorCode: AI_ERROR_CODES.PROVIDER_FAILED,
      errorMessage: `agent ${opts.agentSlug} not registered in system.agents`,
      logs: [`[${ts()}] resolve.no_agent ${opts.agentSlug}`],
    };
  }
  logs.push(`[${ts()}] resolve.ok agent_id=${agentId}`);

  // Step 2: quota pre-check is now owned by the orchestrator (LB1 #834,
  // ORCHESTRATOR_ERROR_CODES.QUOTA_EXCEEDED). The adapter only calls
  // `consume()` in Step 5 with real token/cost usage; calling `peek()` here
  // would duplicate the orchestrator's gate and split the source of truth.

  // Step 3: provider call + result build.
  let outcome;
  try {
    outcome = await opts.buildResult(ctx);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logs.push(`[${ts()}] provider.threw ${msg}`);
    return {
      success: false,
      errorCode: AI_ERROR_CODES.PROVIDER_FAILED,
      errorMessage: msg,
      logs,
    };
  }
  if (outcome.success === false) {
    return {
      ...outcome,
      logs: [...logs, ...outcome.logs],
    };
  }
  const { result, sensitive } = outcome;
  const interaction = result.interaction;
  logs.push(
    `[${ts()}] provider.ok provider=${interaction.provider} model=${interaction.model} ` +
      `tokens=${interaction.promptTokens}+${interaction.completionTokens} ` +
      `cost=${interaction.costUsd.toFixed(6)} latency_ms=${interaction.latencyMs}` +
      (interaction.fallbackUsed ? " fallback=true" : ""),
  );

  // Step 4: persist ai_interactions linked to this run. Failure to link is
  // a deterministic error — we never lose end-to-end traceability silently.
  try {
    await opts.deps.interactions.record({
      task: ctx.task,
      interaction,
      domainTaskType: opts.taskType,
    });
    logs.push(`[${ts()}] interaction.recorded`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logs.push(`[${ts()}] interaction.persist_failed ${msg}`);
    return {
      success: false,
      errorCode: AI_ERROR_CODES.PERSIST_INTERACTION_FAILED,
      errorMessage: msg,
      output: {
        provider: interaction.provider,
        model: interaction.model,
        tokens: interaction.promptTokens + interaction.completionTokens,
        cost_usd: interaction.costUsd,
      },
      logs,
    };
  }

  // Step 5: SINGLE post-call accounting bump with real cost / token counts.
  // The rate-limit decision was already made in Step 2 (peek); this is the
  // only call that increments counters.
  const post = await opts.deps.quota.consume({
    agentId,
    tokens: interaction.promptTokens + interaction.completionTokens,
    costUsd: interaction.costUsd,
  });
  if (!post.ok) {
    // LB1 #834 — post-execute accounting MUST be authoritative. If the
    // quota RPC refuses (race with another worker, clock drift, RPC
    // outage), we fail loud rather than recording a warning and
    // continuing. Silent continuation here would let agents drift past
    // their daily budget by exactly one extra run per occurrence — the
    // governance layer treats that as a hard violation.
    logs.push(`[${ts()}] quota.consume_failed ${post.blockedReason ?? "rejected"}`);
    return {
      success: false,
      errorCode: "QUOTA_EXCEEDED",
      errorMessage: `Quota accounting failed: ${post.blockedReason ?? "rejected"}`,
      logs,
      actionsTaken: [`ai.${opts.taskType.toLowerCase()}`],
      // Surface real provider/usage diagnostics on the failure path so
      // governance dashboards (and the orchestrator's execution_result
      // payload) can attribute the budget overrun to a specific call.
      // `output` mirrors `effects` for back-compat with the LB1 #834
      // consumer that read `effects.*`.
      output: {
        provider: interaction.provider,
        model: interaction.model,
        prompt_tokens: interaction.promptTokens,
        completion_tokens: interaction.completionTokens,
        tokens: interaction.promptTokens + interaction.completionTokens,
        cost_usd: interaction.costUsd,
        latency_ms: interaction.latencyMs,
        quota_block_reason: post.blockedReason,
        quota_block_window: post.blockedWindow,
      },
      logs,
      actionsTaken: [`ai.${opts.taskType.toLowerCase()}`],
    };
  }

  // Step 6: surface the sensitive signal in the result so the orchestrator's
  // post-execute hook can flip the task into pending_review.
  const finalResult: Record<string, unknown> = {
    ...result,
    cost_usd: interaction.costUsd,
    latency_ms: interaction.latencyMs,
  };
  if (sensitive?.flagged) {
    finalResult.flaggedSensitive = true;
    finalResult.flaggedReason = sensitive.reason ?? "sensitive";
    finalResult.flaggedPatterns = sensitive.matchedPatterns ?? [];
    logs.push(`[${ts()}] sensitive.flagged reason=${sensitive.reason}`);
  }

  return {
    success: true,
    output: finalResult,
    logs,
    actionsTaken: [
      `ai.${opts.taskType.toLowerCase()}`,
      ...(sensitive?.flagged ? ["sensitive.flagged"] : []),
    ],
  };
}

// ── Per-task-type adapter constructors ────────────────────────────────────

export function createAiCompletionAdapter(deps: AiAdapterDeps): DomainAdapter {
  return {
    domain: AI_DOMAIN,
    taskType: AI_TASK_TYPES.COMPLETION,
    agent: commonAgentRef(AI_AGENT_SLUGS.AI_COMPLETION, "ai.router", "ai-default"),
    rollback_strategy: "none",
    async execute(ctx) {
      return executeWithGuards(
        {
          taskType: AI_TASK_TYPES.COMPLETION,
          agentSlug: AI_AGENT_SLUGS.AI_COMPLETION,
          deps,
          buildResult: async (c) => {
            const v = validateCompletionPayload(c.task.payload);
            if (!v.ok) {
              return {
                success: false as const,
                errorCode: AI_ERROR_CODES.INVALID_PAYLOAD,
                errorMessage: v.reason,
                logs: [`validate.failed ${v.reason}`],
              };
            }
            // Purpose-driven sensitive routing — when a caller declares the
            // call is for a contract / PII generation / moderation override,
            // we engage the ai-sensitive policy BEFORE the model is called
            // by force-flagging the run for approval. Heuristic output
            // classification still runs as a second line of defence.
            const purpose = (v.data.purpose ?? "general") as AiCompletionPurpose;
            const purposeIsSensitive = AI_SENSITIVE_PURPOSES.includes(purpose);
            const out = await deps.runner.completion({ payload: v.data, task: c.task });
            const heuristic = classifySensitiveOutput(out.text, {
              callerHint: v.data.sensitive === true || purposeIsSensitive,
              feature: v.data.feature,
            });
            const sensitive: SensitiveSignal = purposeIsSensitive
              ? {
                flagged: true,
                reason: heuristic.flagged
                  ? `purpose:${purpose}+${heuristic.reason ?? "heuristic"}`
                  : `purpose:${purpose}`,
                matchedPatterns: heuristic.matchedPatterns ?? [],
              }
              : heuristic;
            const built: AiCompletionResult = {
              text: out.text,
              json: out.json,
              interaction: out.interaction,
            };
            // Lift tool calls into the result so v_ai_runs.tools_used can
            // surface them to the conversation explorer without parsing the
            // payload again.
            const enriched: Record<string, unknown> = {
              ...(built as unknown as Record<string, unknown>),
              purpose,
            };
            if (Array.isArray(v.data.tools) && v.data.tools.length > 0) {
              enriched.tools_used = v.data.tools.map((t) => ({
                name: t.name,
                description: t.description ?? null,
              }));
            }
            return {
              success: true as const,
              result: enriched as Record<string, unknown> & { interaction: AiInteractionRecord },
              sensitive,
            };
          },
        },
        ctx,
      );
    },
  };
}

export function createAiEmbeddingAdapter(deps: AiAdapterDeps): DomainAdapter {
  return {
    domain: AI_DOMAIN,
    taskType: AI_TASK_TYPES.EMBEDDING,
    agent: commonAgentRef(AI_AGENT_SLUGS.AI_EMBEDDING, "ai.router", "ai-default"),
    rollback_strategy: "none",
    async execute(ctx) {
      return executeWithGuards(
        {
          taskType: AI_TASK_TYPES.EMBEDDING,
          agentSlug: AI_AGENT_SLUGS.AI_EMBEDDING,
          deps,
          buildResult: async (c) => {
            const v = validateEmbeddingPayload(c.task.payload);
            if (!v.ok) {
              return {
                success: false as const,
                errorCode: AI_ERROR_CODES.INVALID_PAYLOAD,
                errorMessage: v.reason,
                logs: [`validate.failed ${v.reason}`],
              };
            }
            const out = await deps.runner.embedding({ payload: v.data, task: c.task });
            const built: AiEmbeddingResult = {
              vectors: out.vectors,
              dim: out.dim,
              interaction: out.interaction,
            };
            return {
              success: true as const,
              result: built as unknown as Record<string, unknown> & { interaction: AiInteractionRecord },
              // Embeddings never trigger the sensitive classifier — the
              // payload may itself be sensitive but the output is opaque
              // numbers; gating belongs at the COMPLETION layer.
            };
          },
        },
        ctx,
      );
    },
  };
}

export function createAiRagAdapter(deps: AiAdapterDeps): DomainAdapter {
  return {
    domain: AI_DOMAIN,
    taskType: AI_TASK_TYPES.RAG,
    agent: commonAgentRef(AI_AGENT_SLUGS.AI_RAG, "ai.router", "ai-default"),
    rollback_strategy: "none",
    async execute(ctx) {
      return executeWithGuards(
        {
          taskType: AI_TASK_TYPES.RAG,
          agentSlug: AI_AGENT_SLUGS.AI_RAG,
          deps,
          buildResult: async (c) => {
            const v = validateRagPayload(c.task.payload);
            if (!v.ok) {
              return {
                success: false as const,
                errorCode: AI_ERROR_CODES.INVALID_PAYLOAD,
                errorMessage: v.reason,
                logs: [`validate.failed ${v.reason}`],
              };
            }
            const out = await deps.runner.rag({ payload: v.data, task: c.task });
            const sensitive = classifySensitiveOutput(out.answer, {
              feature: v.data.feature,
            });
            const built: AiRagResult = {
              answer: out.answer,
              citations: out.citations,
              interaction: out.interaction,
            };
            return {
              success: true as const,
              result: built as unknown as Record<string, unknown> & { interaction: AiInteractionRecord },
              sensitive,
            };
          },
        },
        ctx,
      );
    },
  };
}

export function createAiToolUseAdapter(deps: AiAdapterDeps): DomainAdapter {
  return {
    domain: AI_DOMAIN,
    taskType: AI_TASK_TYPES.TOOL_USE,
    agent: commonAgentRef(AI_AGENT_SLUGS.AI_TOOL_USE, "ai.tool", "ai-sensitive"),
    rollback_strategy: "none",
    async execute(ctx) {
      return executeWithGuards(
        {
          taskType: AI_TASK_TYPES.TOOL_USE,
          agentSlug: AI_AGENT_SLUGS.AI_TOOL_USE,
          deps,
          buildResult: async (c) => {
            const v = validateToolUsePayload(c.task.payload);
            if (!v.ok) {
              return {
                success: false as const,
                errorCode: AI_ERROR_CODES.INVALID_PAYLOAD,
                errorMessage: v.reason,
                logs: [`validate.failed ${v.reason}`],
              };
            }
            // Tool use does NOT call the model; it merely materialises the
            // proposed dispatch and lets the L5 inbox release it.
            const interaction: AiInteractionRecord = {
              feature: v.data.feature,
              provider: "internal",
              model: "tool-use-router",
              promptTokens: 0,
              completionTokens: 0,
              costUsd: 0,
              latencyMs: 0,
              fallbackUsed: false,
              status: "ok",
              metadata: {
                proposed_domain: v.data.proposedDomain,
                proposed_task_type: v.data.proposedTaskType,
              },
            };
            const built: AiToolUseResult = {
              proposedDomain: v.data.proposedDomain,
              proposedTaskType: v.data.proposedTaskType,
              proposedPayload: v.data.proposedPayload,
              rationale: v.data.rationale ?? null,
              interaction,
              flaggedSensitive: true,
              flaggedReason: "tool_use_requires_approval",
            };
            return {
              success: true as const,
              result: built as unknown as Record<string, unknown> & { interaction: AiInteractionRecord },
              sensitive: { flagged: true, reason: "tool_use_requires_approval" },
            };
          },
        },
        ctx,
      );
    },
  };
}
