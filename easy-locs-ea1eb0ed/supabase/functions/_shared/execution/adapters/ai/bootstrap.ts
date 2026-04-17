/**
 * AI domain bootstrap — LB1 (#815).
 *
 * Registers all four AI adapters (completion, embedding, rag, tool_use) and
 * their verifiers on the shared global registries used by ExecutionOrchestratorV2,
 * then reconciles the in-process manifest against `system.agents`.
 *
 * Importing this module from `execution-loop/index.ts` (alongside
 * bootstrapMarketplaceAdapters) wires the AI surface area end-to-end.
 *
 * Idempotent — re-imports overwrite existing entries via { overwrite: true }.
 */

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { globalAdapterRegistry } from "../../adapter-registry.ts";
import { globalVerifierRegistry } from "../../verifier-registry.ts";
import { reconcileAgents, type ReconcileResult } from "../../agent-reconciler.ts";
import {
  createAiCompletionAdapter,
  createAiEmbeddingAdapter,
  createAiRagAdapter,
  createAiToolUseAdapter,
  createSupabaseInteractionSink,
  createSupabaseQuotaGate,
  type AiAdapterDeps,
  type InteractionSink,
  type LLMRunner,
  type QuotaGate,
} from "./ai-adapter.ts";
import { createAiVerifier } from "./ai-verifier.ts";
import { AI_AGENT_SLUGS, AI_TASK_TYPES } from "./types.ts";
import { createAiRouteRunner } from "./runner-aiRoute.ts";
import { createAgentRouterConfigLoader } from "./router-config.ts";

export interface AiBootstrapOverrides {
  runner?: LLMRunner;
  quota?: QuotaGate;
  interactions?: InteractionSink;
  resolveAgentId?: (slug: string) => Promise<string | null>;
  reconcileAgents?: boolean;
  reconcile?: (sb: SupabaseClient) => Promise<ReconcileResult>;
}

function bootEnv(): string {
  try {
    // deno-lint-ignore no-explicit-any
    const denoEnv = (globalThis as any)?.Deno?.env?.get?.bind((globalThis as any).Deno.env);
    return (
      (denoEnv && (denoEnv("SUPABASE_FUNCTION_ENV") || denoEnv("DENO_ENV") || denoEnv("NODE_ENV"))) ||
      // deno-lint-ignore no-explicit-any
      (globalThis as any)?.process?.env?.NODE_ENV ||
      "development"
    );
  } catch {
    return "development";
  }
}

/** Default agent-id resolver — caches the slug→id map for the isolate. */
function defaultResolveAgentId(sb: SupabaseClient): (slug: string) => Promise<string | null> {
  const cache = new Map<string, string | null>();
  return async (slug: string) => {
    if (cache.has(slug)) return cache.get(slug)!;
    const { data, error } = await sb
      .schema("system")
      .from("agents")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) {
      console.warn(`[ai.bootstrap] resolve agent ${slug} failed:`, error.message);
      cache.set(slug, null);
      return null;
    }
    const id = (data?.id as string | null) ?? null;
    cache.set(slug, id);
    return id;
  };
}

export async function bootstrapAiAdapters(
  sb: SupabaseClient,
  overrides: AiBootstrapOverrides = {},
): Promise<void> {
  // LB1 follow-up 4 (#837): wire the registry-aware config loader so the
  // production runner reads model / fallback chain / API-key env-var name
  // from `system.agents.metadata.router` instead of hard-coded constants.
  const runner = overrides.runner ?? createAiRouteRunner({ loadConfig: createAgentRouterConfigLoader(sb) });
  const quota = overrides.quota ?? createSupabaseQuotaGate(sb);
  const interactions = overrides.interactions ?? createSupabaseInteractionSink(sb);
  const resolveAgentId = overrides.resolveAgentId ?? defaultResolveAgentId(sb);

  const deps: AiAdapterDeps = { runner, quota, interactions, resolveAgentId };

  // Verifiers FIRST so adapter execute() never out-races them.
  globalVerifierRegistry.register(createAiVerifier(AI_TASK_TYPES.COMPLETION), { overwrite: true });
  globalVerifierRegistry.register(createAiVerifier(AI_TASK_TYPES.EMBEDDING), { overwrite: true });
  globalVerifierRegistry.register(createAiVerifier(AI_TASK_TYPES.RAG), { overwrite: true });
  globalVerifierRegistry.register(createAiVerifier(AI_TASK_TYPES.TOOL_USE), { overwrite: true });

  globalAdapterRegistry.register(createAiCompletionAdapter(deps), { overwrite: true });
  globalAdapterRegistry.register(createAiEmbeddingAdapter(deps), { overwrite: true });
  globalAdapterRegistry.register(createAiRagAdapter(deps), { overwrite: true });
  globalAdapterRegistry.register(createAiToolUseAdapter(deps), { overwrite: true });

  if (overrides.reconcileAgents === false) return;

  const env = bootEnv();
  const reconcile = overrides.reconcile ?? reconcileAgents;
  let result: ReconcileResult;
  try {
    result = await reconcile(sb);
  } catch (e) {
    const msg = `[ai.bootstrap] reconcileAgents threw: ${e instanceof Error ? e.message : String(e)}`;
    if (env === "production") throw e instanceof Error ? e : new Error(msg);
    console.warn(msg);
    return;
  }
  if (!result.ok) {
    const detail = result.failed.map((f) => `${f.slug}: ${f.error}`).join("; ");
    const msg = `[ai.bootstrap] reconcileAgents reported failures: ${detail}`;
    if (env === "production") throw new Error(msg);
    console.warn(msg);
  }
}

export { AI_AGENT_SLUGS, AI_TASK_TYPES };
