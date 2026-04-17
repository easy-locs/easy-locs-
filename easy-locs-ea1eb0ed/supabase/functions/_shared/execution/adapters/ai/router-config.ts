/**
 * Registry-aware AI router config loader — LB1 follow-up 4 (#837).
 *
 * Replaces the hard-coded provider / model / API-key choices in
 * `_shared/ai-router.ts` with a per-agent configuration sourced from
 * `system.agents.metadata.router`. Rotating a provider key, swapping a
 * default model, or changing the fallback chain is now a single
 * configuration change visible in the agent inspector — the inner
 * provider plumbing in `ai-router.ts` no longer reads `Deno.env`
 * directly.
 *
 * Actual secret values still live in environment variables; only the
 * env-var NAME is stored in agent metadata, so secret rotation never
 * touches the database.
 *
 * Telemetry is built here too: the canonical `AiInteractionRecord`
 * shape (provider, model, tokens, cost, latency, fallback_used) is
 * assembled by `buildInteraction()` so any caller — adapter or direct —
 * gets the same record without provider knowledge leaking out.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import type { AiInteractionRecord, AiTaskType } from "./types.ts";
import { AI_AGENT_SLUGS, AI_TASK_TYPES } from "./types.ts";

export type AiProviderName = "openai" | "anthropic";

export interface AiProviderEntry {
  provider: AiProviderName;
  model: string;
  /** Name of the env var that holds the API key — never the secret itself. */
  keyEnv: string;
  /** Optional per-provider request timeout (ms). */
  timeoutMs?: number;
}

export interface AgentRouterConfig {
  /** What kind of provider call this agent makes. */
  kind: "chat" | "embedding";
  primary: AiProviderEntry;
  /** Ordered fallback chain. Empty array = no fallbacks. */
  fallbacks: AiProviderEntry[];
  /** USD cost per 1k tokens, keyed by model. */
  costPer1k: Record<string, { prompt: number; completion: number }>;
  /** Diagnostic origin: "registry" (read from metadata) or "env_default". */
  source: "registry" | "env_default";
}

// ── Defaults used when an agent has no router metadata or when the
//   legacy env-only `aiRoute()` entry point is invoked. These are
//   intentionally identical to the constants previously hard-coded in
//   `ai-router.ts` so behaviour is byte-identical for un-migrated
//   callers.
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const DEFAULT_OPENAI_TIMEOUT_MS = 8000;

const DEFAULT_COST_PER_1K: Record<string, { prompt: number; completion: number }> = {
  "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "gpt-4o": { prompt: 0.0025, completion: 0.01 },
  "claude-3-5-haiku-20241022": { prompt: 0.0008, completion: 0.004 },
  "text-embedding-3-small": { prompt: 0.00002, completion: 0 },
  "text-embedding-3-large": { prompt: 0.00013, completion: 0 },
};

/** Read-only env accessor that works in both Deno (edge) and Node (tests). */
function envGet(name: string): string | null {
  try {
    // deno-lint-ignore no-explicit-any
    const denoEnv = (globalThis as any)?.Deno?.env?.get?.bind((globalThis as any).Deno.env);
    if (denoEnv) return denoEnv(name) ?? null;
  } catch { /* fall through */ }
  // deno-lint-ignore no-explicit-any
  const procEnv = (globalThis as any)?.process?.env;
  return procEnv?.[name] ?? null;
}

export function readApiKey(entry: AiProviderEntry): string | null {
  return envGet(entry.keyEnv);
}

/** Returns the env-derived legacy default — used by deprecated `aiRoute()`. */
export function envDefaultChatConfig(): AgentRouterConfig {
  return {
    kind: "chat",
    primary: {
      provider: "openai",
      model: DEFAULT_OPENAI_MODEL,
      keyEnv: "OPENAI_API_KEY",
      timeoutMs: DEFAULT_OPENAI_TIMEOUT_MS,
    },
    fallbacks: [
      { provider: "anthropic", model: DEFAULT_ANTHROPIC_MODEL, keyEnv: "ANTHROPIC_API_KEY" },
    ],
    costPer1k: DEFAULT_COST_PER_1K,
    source: "env_default",
  };
}

export function envDefaultEmbeddingConfig(): AgentRouterConfig {
  return {
    kind: "embedding",
    primary: {
      provider: "openai",
      model: DEFAULT_EMBEDDING_MODEL,
      keyEnv: "OPENAI_API_KEY",
    },
    fallbacks: [],
    costPer1k: DEFAULT_COST_PER_1K,
    source: "env_default",
  };
}

// ── Per-slug default kind (so the loader knows which default to fall back
//   to when an agent has no router metadata yet). Keeps the loader from
//   guessing.
const SLUG_KIND: Record<string, "chat" | "embedding"> = {
  [AI_AGENT_SLUGS.AI_COMPLETION]: "chat",
  [AI_AGENT_SLUGS.AI_EMBEDDING]: "embedding",
  [AI_AGENT_SLUGS.AI_RAG]: "chat",
  // tool_use never calls a model — but if a future build does, treat as chat.
  [AI_AGENT_SLUGS.AI_TOOL_USE]: "chat",
};

/** Map a task type back to its registered agent slug. */
export function slugForTaskType(taskType: AiTaskType): string {
  switch (taskType) {
    case AI_TASK_TYPES.COMPLETION: return AI_AGENT_SLUGS.AI_COMPLETION;
    case AI_TASK_TYPES.EMBEDDING: return AI_AGENT_SLUGS.AI_EMBEDDING;
    case AI_TASK_TYPES.RAG: return AI_AGENT_SLUGS.AI_RAG;
    case AI_TASK_TYPES.TOOL_USE: return AI_AGENT_SLUGS.AI_TOOL_USE;
  }
  throw new Error(`slugForTaskType: unknown task type ${taskType}`);
}

interface RawRouterMeta {
  primary?: { provider?: string; model?: string; key_env?: string; timeout_ms?: number };
  fallbacks?: Array<{ provider?: string; model?: string; key_env?: string; timeout_ms?: number }>;
  cost_per_1k?: Record<string, { prompt?: number; completion?: number }>;
  kind?: "chat" | "embedding";
}

function coerceEntry(raw: RawRouterMeta["primary"] | undefined, fallbackKeyEnv: string): AiProviderEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const provider = (raw.provider === "openai" || raw.provider === "anthropic") ? raw.provider : null;
  if (!provider) return null;
  const model = typeof raw.model === "string" && raw.model.length > 0 ? raw.model : null;
  if (!model) return null;
  const keyEnv = typeof raw.key_env === "string" && raw.key_env.length > 0 ? raw.key_env : fallbackKeyEnv;
  const entry: AiProviderEntry = { provider, model, keyEnv };
  if (typeof raw.timeout_ms === "number" && raw.timeout_ms > 0) entry.timeoutMs = raw.timeout_ms;
  return entry;
}

function defaultKeyEnvFor(provider: string): string {
  return provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
}

function parseRouterMeta(meta: RawRouterMeta | null | undefined, slug: string): AgentRouterConfig | null {
  if (!meta || typeof meta !== "object") return null;
  const kind = meta.kind ?? SLUG_KIND[slug] ?? "chat";
  const primary = coerceEntry(meta.primary, defaultKeyEnvFor(meta.primary?.provider ?? "openai"));
  if (!primary) return null;
  const fallbacks: AiProviderEntry[] = [];
  for (const f of meta.fallbacks ?? []) {
    const e = coerceEntry(f, defaultKeyEnvFor(f.provider ?? "anthropic"));
    if (e) fallbacks.push(e);
  }
  const costPer1k: Record<string, { prompt: number; completion: number }> = { ...DEFAULT_COST_PER_1K };
  for (const [model, c] of Object.entries(meta.cost_per_1k ?? {})) {
    if (typeof c?.prompt === "number") {
      costPer1k[model] = {
        prompt: c.prompt,
        completion: typeof c.completion === "number" ? c.completion : 0,
      };
    }
  }
  return { kind, primary, fallbacks, costPer1k, source: "registry" };
}

// ── Loader with per-isolate TTL cache. The registry is the source of
//   truth, but a stampede of edge invocations should not hammer
//   `system.agents` — 60s is short enough that an operator change
//   propagates within a minute and long enough to amortise lookups.
export interface AgentRouterConfigLoader {
  (slug: string): Promise<AgentRouterConfig>;
  invalidate(slug?: string): void;
}

const CACHE_TTL_MS = 60_000;

interface CacheEntry { config: AgentRouterConfig; expires: number }

export function createAgentRouterConfigLoader(sb: SupabaseClient): AgentRouterConfigLoader {
  const cache = new Map<string, CacheEntry>();

  const loader = (async (slug: string): Promise<AgentRouterConfig> => {
    const hit = cache.get(slug);
    if (hit && hit.expires > Date.now()) return hit.config;

    let config: AgentRouterConfig;
    try {
      const { data, error } = await sb
        .schema("system")
        .from("agents")
        .select("metadata")
        .eq("slug", slug)
        .maybeSingle();
      if (error) {
        console.warn(`[ai-router-config] load ${slug} failed: ${error.message}; using env defaults`);
        config = (SLUG_KIND[slug] ?? "chat") === "embedding" ? envDefaultEmbeddingConfig() : envDefaultChatConfig();
      } else {
        const router = (data?.metadata as { router?: RawRouterMeta } | null)?.router;
        const parsed = parseRouterMeta(router, slug);
        config = parsed ?? ((SLUG_KIND[slug] ?? "chat") === "embedding"
          ? envDefaultEmbeddingConfig()
          : envDefaultChatConfig());
      }
    } catch (e) {
      console.warn(
        `[ai-router-config] load ${slug} threw: ${e instanceof Error ? e.message : String(e)}; using env defaults`,
      );
      config = (SLUG_KIND[slug] ?? "chat") === "embedding"
        ? envDefaultEmbeddingConfig()
        : envDefaultChatConfig();
    }

    cache.set(slug, { config, expires: Date.now() + CACHE_TTL_MS });
    return config;
  }) as AgentRouterConfigLoader;

  loader.invalidate = (slug?: string) => {
    if (slug) cache.delete(slug);
    else cache.clear();
  };
  return loader;
}

// ── Canonical telemetry construction ──────────────────────────────────────

export function priceFor(
  costTable: Record<string, { prompt: number; completion: number }>,
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const row = costTable[model] ?? { prompt: 0.0001, completion: 0.0003 };
  return (promptTokens * row.prompt + completionTokens * row.completion) / 1000;
}

export interface InteractionInput {
  feature: string;
  provider: AiProviderName | "internal";
  model: string;
  promptTokens: number;
  completionTokens: number;
  startedAt: number;
  fallbackUsed: boolean;
  status?: "ok" | "error" | "blocked";
  blockReason?: string;
  metadata?: Record<string, unknown>;
  costTable?: Record<string, { prompt: number; completion: number }>;
}

export function buildInteraction(input: InteractionInput): AiInteractionRecord {
  const costTable = input.costTable ?? DEFAULT_COST_PER_1K;
  const costUsd = input.provider === "internal"
    ? 0
    : priceFor(costTable, input.model, input.promptTokens, input.completionTokens);
  const record: AiInteractionRecord = {
    feature: input.feature,
    provider: input.provider,
    model: input.model,
    promptTokens: input.promptTokens,
    completionTokens: input.completionTokens,
    costUsd,
    latencyMs: Date.now() - input.startedAt,
    fallbackUsed: input.fallbackUsed,
    status: input.status ?? "ok",
    metadata: input.metadata ?? {},
  };
  if (input.blockReason) record.blockReason = input.blockReason;
  return record;
}
