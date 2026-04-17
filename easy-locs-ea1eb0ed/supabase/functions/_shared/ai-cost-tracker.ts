// Cost / latency tracking for Next-Gen IA.
// Logs every AI call to public.ai_interactions and increments ai_quotas.
//
// LB Closeout #853 — IMPORTANT: this helper is for *non-dispatched* AI
// callsites only (e.g. cache-hit accounting in ai-recommendations). Any
// AI call that flows through `dispatchAiCompletion` / `dispatchAiEmbedding`
// is persisted by `createSupabaseInteractionSink` in
// `_shared/execution/adapters/ai/ai-adapter.ts`, which is the SOLE writer
// that fills `ai_interactions.execution_task_id`. Do NOT call
// `logAiInteraction` from inside a dispatched run — it would produce a
// duplicate, unlinked row.

import { createClient } from "npm:@supabase/supabase-js@2.57.2";

export interface ModelPricing {
  // USD per 1M tokens
  inputPer1M: number;
  outputPer1M: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  "gpt-4o-mini":              { inputPer1M: 0.15,  outputPer1M: 0.60 },
  "gpt-4o":                   { inputPer1M: 2.50,  outputPer1M: 10.00 },
  "gpt-4.1-mini":             { inputPer1M: 0.40,  outputPer1M: 1.60 },
  "text-embedding-3-small":   { inputPer1M: 0.02,  outputPer1M: 0 },
  "text-embedding-3-large":   { inputPer1M: 0.13,  outputPer1M: 0 },
  // Anthropic
  "claude-3-5-haiku-20241022":  { inputPer1M: 0.80,  outputPer1M: 4.00 },
  "claude-3-5-sonnet-20241022": { inputPer1M: 3.00,  outputPer1M: 15.00 },
};

export function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const p = MODEL_PRICING[model];
  if (!p) return 0;
  return (
    (promptTokens * p.inputPer1M) / 1_000_000 +
    (completionTokens * p.outputPer1M) / 1_000_000
  );
}

export interface LogInteractionInput {
  userId: string | null;
  feature: string;
  domain?: string;
  provider: "openai" | "anthropic";
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  fallbackUsed?: boolean;
  status?: "ok" | "error" | "blocked";
  blockReason?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface LogInteractionResult {
  cost: number;
  id?: string;
}

function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function logAiInteraction(input: LogInteractionInput): Promise<LogInteractionResult> {
  const cost = estimateCost(input.model, input.promptTokens, input.completionTokens);
  try {
    const db = serviceClient();
    const { data, error } = await db
      .from("ai_interactions")
      .insert({
        user_id: input.userId,
        feature: input.feature,
        domain: input.domain ?? null,
        provider: input.provider,
        model: input.model,
        prompt_tokens: input.promptTokens,
        completion_tokens: input.completionTokens,
        cost_usd: cost,
        latency_ms: input.latencyMs,
        fallback_used: !!input.fallbackUsed,
        status: input.status ?? "ok",
        block_reason: input.blockReason ?? null,
        request_id: input.requestId ?? null,
        metadata: input.metadata ?? {},
      })
      .select("id")
      .single();
    if (error) console.warn("[ai-cost-tracker] insert error:", error.message);
    if (input.userId && input.status !== "blocked") {
      await db.rpc("ai_quota_increment", {
        p_user_id: input.userId,
        p_feature: input.feature,
        p_tokens: input.promptTokens + input.completionTokens,
        p_cost: cost,
      });
    }
    return { cost, id: data?.id };
  } catch (err) {
    console.warn("[ai-cost-tracker] logging failed:", (err as Error).message);
    return { cost };
  }
}

export interface QuotaStatus {
  allowed: boolean;
  reason?: "daily_requests" | "daily_tokens" | "daily_cost";
  used: { requests: number; tokens: number; costUsd: number };
  limits: { requests: number; tokens: number; costUsd: number };
}

const DEFAULT_LIMITS = {
  requests: Number(Deno.env.get("AI_QUOTA_REQUESTS_PER_DAY") ?? 200),
  tokens:   Number(Deno.env.get("AI_QUOTA_TOKENS_PER_DAY")   ?? 200_000),
  costUsd:  Number(Deno.env.get("AI_QUOTA_COST_PER_DAY")     ?? 2.0),
};

export async function checkAiQuota(userId: string, feature: string): Promise<QuotaStatus> {
  try {
    const db = serviceClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await db
      .from("ai_quotas")
      .select("requests, tokens_used, cost_usd")
      .eq("user_id", userId)
      .eq("feature", feature)
      .eq("quota_date", today)
      .maybeSingle();

    const used = {
      requests: data?.requests ?? 0,
      tokens:   data?.tokens_used ?? 0,
      costUsd:  Number(data?.cost_usd ?? 0),
    };

    if (used.requests >= DEFAULT_LIMITS.requests) {
      return { allowed: false, reason: "daily_requests", used, limits: DEFAULT_LIMITS };
    }
    if (used.tokens >= DEFAULT_LIMITS.tokens) {
      return { allowed: false, reason: "daily_tokens", used, limits: DEFAULT_LIMITS };
    }
    if (used.costUsd >= DEFAULT_LIMITS.costUsd) {
      return { allowed: false, reason: "daily_cost", used, limits: DEFAULT_LIMITS };
    }
    return { allowed: true, used, limits: DEFAULT_LIMITS };
  } catch (err) {
    console.warn("[ai-cost-tracker] quota check failed:", (err as Error).message);
    return {
      allowed: true,
      used: { requests: 0, tokens: 0, costUsd: 0 },
      limits: DEFAULT_LIMITS,
    };
  }
}
