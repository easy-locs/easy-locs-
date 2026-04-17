/**
 * Unit tests — LB1 (#815) AI domain adapters.
 *
 * Coverage:
 *  - happy path: completion succeeds, interaction is recorded, cost+latency
 *    surface on the result, sensitive flag absent.
 *  - quota block: pre-check rejection bubbles up as QUOTA_EXCEEDED with no
 *    runner call.
 *  - invalid payload: validator rejects ⇒ INVALID_PAYLOAD, no runner call.
 *  - sensitive output: classifier flag flows through to result.flaggedSensitive.
 *  - tool-use adapter: always flags sensitive (approval mandatory).
 */
import { describe, expect, it } from "vitest";
import {
  createAiCompletionAdapter,
  createAiToolUseAdapter,
  type AiAdapterDeps,
  type LLMRunner,
} from "../../supabase/functions/_shared/execution/adapters/ai/ai-adapter.ts";
import {
  AI_AGENT_SLUGS,
  AI_ERROR_CODES,
  AI_TASK_TYPES,
  type AiInteractionRecord,
} from "../../supabase/functions/_shared/execution/adapters/ai/types.ts";
import { makeTask } from "../../supabase/functions/_shared/execution/__test-helpers__.ts";

function makeInteraction(overrides: Partial<AiInteractionRecord> = {}): AiInteractionRecord {
  return {
    feature: overrides.feature ?? "support_chat",
    provider: overrides.provider ?? "openai",
    model: overrides.model ?? "gpt-4o-mini",
    promptTokens: overrides.promptTokens ?? 12,
    completionTokens: overrides.completionTokens ?? 30,
    costUsd: overrides.costUsd ?? 0.000123,
    latencyMs: overrides.latencyMs ?? 220,
    fallbackUsed: overrides.fallbackUsed ?? false,
    status: overrides.status ?? "ok",
    metadata: overrides.metadata ?? {},
  };
}

function makeDeps(opts: {
  runnerText?: string;
  quotaOk?: boolean;
  recordedRef?: { count: number; last?: unknown };
  runnerCallsRef?: { count: number };
  resolveOk?: boolean;
  consumeCallsRef?: { count: number };
  recordThrows?: boolean;
} = {}): AiAdapterDeps {
  const recorded = opts.recordedRef ?? { count: 0 };
  const runnerCalls = opts.runnerCallsRef ?? { count: 0 };
  const runner: LLMRunner = {
    completion: async ({ payload }) => {
      runnerCalls.count++;
      return {
        text: opts.runnerText ?? "Hello world",
        interaction: makeInteraction({ feature: payload.feature }),
      };
    },
    embedding: async () => ({
      vectors: [[0.1, 0.2]],
      dim: 2,
      interaction: makeInteraction(),
    }),
    rag: async () => ({
      answer: "ans",
      citations: [],
      interaction: makeInteraction(),
    }),
  };
  return {
    runner,
    quota: {
      peek: async () =>
        opts.quotaOk === false
          ? {
              ok: false,
              blockedReason: "rate_limit",
              blockedWindow: "minute",
              currentCount: 600,
              limitCount: 600,
            }
          : { ok: true },
      consume: async () => {
        opts.consumeCallsRef && (opts.consumeCallsRef.count = (opts.consumeCallsRef.count ?? 0) + 1);
        return { ok: true };
      },
    },
    interactions: {
      record: async (args) => {
        if (opts.recordThrows) throw new Error("ai_interactions insert failed: simulated");
        recorded.count++;
        recorded.last = args;
      },
    },
    resolveAgentId: async (slug) =>
      opts.resolveOk === false ? null : `agent-${slug}`,
  };
}

const baseCtx = (taskOverrides: Record<string, unknown> = {}) => ({
  task: makeTask({
    domain: "ai",
    type: AI_TASK_TYPES.COMPLETION,
    payload: {
      feature: "support_chat",
      messages: [{ role: "user", content: "hi" }],
    },
    ...taskOverrides,
  }),
  attempt: 1,
  isReplay: false,
  logger: { info: () => {}, warn: () => {}, error: () => {} },
} as never);

describe("AI completion adapter — LB1 (#815)", () => {
  it("happy path: returns success, records interaction, surfaces cost/latency", async () => {
    const recorded = { count: 0 } as { count: number; last?: unknown };
    const runnerCalls = { count: 0 };
    const adapter = createAiCompletionAdapter(makeDeps({ recordedRef: recorded, runnerCallsRef: runnerCalls }));
    const res = await adapter.execute(baseCtx());
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.output?.cost_usd).toBeGreaterThan(0);
      expect(res.output?.latency_ms).toBeGreaterThan(0);
      expect(res.output?.flaggedSensitive).toBeUndefined();
    }
    expect(runnerCalls.count).toBe(1);
    expect(recorded.count).toBe(1);
  });

  it("quota block ⇒ QUOTA_EXCEEDED, no runner call", async () => {
    const runnerCalls = { count: 0 };
    const adapter = createAiCompletionAdapter(makeDeps({ quotaOk: false, runnerCallsRef: runnerCalls }));
    const res = await adapter.execute(baseCtx());
    expect(res.success).toBe(false);
    if (!res.success) expect(res.errorCode).toBe(AI_ERROR_CODES.QUOTA_EXCEEDED);
    expect(runnerCalls.count).toBe(0);
  });

  it("invalid payload ⇒ INVALID_PAYLOAD, no runner call", async () => {
    const runnerCalls = { count: 0 };
    const adapter = createAiCompletionAdapter(makeDeps({ runnerCallsRef: runnerCalls }));
    const res = await adapter.execute(baseCtx({ payload: { wrong: true } }));
    expect(res.success).toBe(false);
    if (!res.success) expect(res.errorCode).toBe(AI_ERROR_CODES.INVALID_PAYLOAD);
    expect(runnerCalls.count).toBe(0);
  });

  it("sensitive output: PII pattern in response sets flaggedSensitive=true", async () => {
    const adapter = createAiCompletionAdapter(
      makeDeps({ runnerText: "SSN 123-45-6789 attached, see contract." }),
    );
    const res = await adapter.execute(baseCtx());
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.output?.flaggedSensitive).toBe(true);
      expect(typeof res.output?.flaggedReason).toBe("string");
    }
  });

  it("missing agent registration ⇒ PROVIDER_FAILED", async () => {
    const adapter = createAiCompletionAdapter(makeDeps({ resolveOk: false }));
    const res = await adapter.execute(baseCtx());
    expect(res.success).toBe(false);
    if (!res.success) expect(res.errorCode).toBe(AI_ERROR_CODES.PROVIDER_FAILED);
  });

  it("counts quota exactly ONCE per run (no double-bump)", async () => {
    const consume = { count: 0 };
    const adapter = createAiCompletionAdapter(makeDeps({ consumeCallsRef: consume }));
    const res = await adapter.execute(baseCtx());
    expect(res.success).toBe(true);
    expect(consume.count).toBe(1);
  });

  it("purpose=contract forces sensitive flag pre-execution", async () => {
    const adapter = createAiCompletionAdapter(makeDeps());
    const res = await adapter.execute(
      baseCtx({
        payload: {
          feature: "loan.contract",
          purpose: "contract",
          messages: [{ role: "user", content: "draft a loan contract" }],
        },
      }),
    );
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.output?.flaggedSensitive).toBe(true);
      expect(String(res.output?.flaggedReason)).toContain("purpose:contract");
    }
  });

  it("ai_interactions persist failure ⇒ PERSIST_INTERACTION_FAILED (no silent loss)", async () => {
    const consume = { count: 0 };
    const adapter = createAiCompletionAdapter(
      makeDeps({ recordThrows: true, consumeCallsRef: consume }),
    );
    const res = await adapter.execute(baseCtx());
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.errorCode).toBe(AI_ERROR_CODES.PERSIST_INTERACTION_FAILED);
    }
    // No quota bump when persistence fails — accounting only happens after
    // a successful link.
    expect(consume.count).toBe(0);
  });
});

describe("AI tool-use adapter — LB1 (#815)", () => {
  it("always flags sensitive so approval is mandatory", async () => {
    const adapter = createAiToolUseAdapter(makeDeps());
    const res = await adapter.execute(
      baseCtx({
        type: AI_TASK_TYPES.TOOL_USE,
        payload: {
          feature: "router",
          proposedDomain: "marketplace",
          proposedTaskType: "MARKETPLACE.LISTING.PUBLISH",
          proposedPayload: { listing_id: "L-1" },
        },
      }),
    );
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.output?.flaggedSensitive).toBe(true);
      expect(res.output?.flaggedReason).toBe("tool_use_requires_approval");
    }
  });

  it("declares rollback_strategy=none (AI calls are non-undoable)", () => {
    const adapter = createAiToolUseAdapter(makeDeps());
    expect(adapter.rollback_strategy).toBe("none");
    expect(adapter.agent.slug).toBe(AI_AGENT_SLUGS.AI_TOOL_USE);
  });
});
