/**
 * Production LLMRunner that wraps the registry-aware
 * `_shared/ai-router.ts#aiRouteForAgent` primitive — same fallback
 * mechanics as before, but model / provider / API-key env-var-name now
 * come from `system.agents.metadata.router` instead of being hard-coded.
 *
 * Tests inject a fake `LLMRunner` instead of importing this file, so the
 * runner is intentionally thin: it exists only to bind the registry
 * adapter to the registry-aware provider plumbing.
 */

import {
  aiRouteForAgent,
  finaliseInteraction,
} from "../../../ai-router.ts";
import {
  type AgentRouterConfig,
  type AgentRouterConfigLoader,
  buildInteraction,
  envDefaultChatConfig,
  envDefaultEmbeddingConfig,
  readApiKey,
  slugForTaskType,
} from "./router-config.ts";
import { AI_TASK_TYPES, type AiInteractionRecord } from "./types.ts";
import type {
  LLMRunner,
  LLMRunnerCompletionInput,
  LLMRunnerCompletionOutput,
  LLMRunnerEmbeddingInput,
  LLMRunnerEmbeddingOutput,
  LLMRunnerRagInput,
  LLMRunnerRagOutput,
} from "./ai-adapter.ts";

const EMBEDDING_URL = "https://api.openai.com/v1/embeddings";

interface ChatJson {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

async function readChatJson(response: Response): Promise<ChatJson> {
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`provider HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
  return await response.json() as ChatJson;
}

export interface AiRouteRunnerDeps {
  /** Loads the per-agent router config from `system.agents.metadata.router`.
   *  When omitted, the runner falls back to env-derived defaults so that
   *  unit tests and deployments without registry access still work. */
  loadConfig?: AgentRouterConfigLoader;
}

async function loadOrDefault(
  deps: AiRouteRunnerDeps,
  slug: string,
  kind: "chat" | "embedding",
): Promise<AgentRouterConfig> {
  if (deps.loadConfig) {
    try {
      return await deps.loadConfig(slug);
    } catch (e) {
      console.warn(
        `[runner-aiRoute] loadConfig(${slug}) failed: ${e instanceof Error ? e.message : String(e)}; using env default`,
      );
    }
  }
  return kind === "embedding" ? envDefaultEmbeddingConfig() : envDefaultChatConfig();
}

export function createAiRouteRunner(deps: AiRouteRunnerDeps = {}): LLMRunner {
  return {
    async completion(
      input: LLMRunnerCompletionInput,
    ): Promise<LLMRunnerCompletionOutput> {
      const config = await loadOrDefault(deps, slugForTaskType(AI_TASK_TYPES.COMPLETION), "chat");
      const routed = await aiRouteForAgent({
        config,
        feature: input.payload.feature,
        options: {
          messages: input.payload.messages.map((m) => ({ role: m.role, content: m.content })),
          model: input.payload.model,
          max_tokens: input.payload.maxTokens,
          temperature: input.payload.temperature,
          response_format: input.payload.responseFormat === "json"
            ? { type: "json_object" }
            : undefined,
        },
      });
      const json = await readChatJson(routed.response);
      const text = json.choices?.[0]?.message?.content ?? "";
      const interaction = finaliseInteraction(
        routed.interaction,
        config.costPer1k,
        json.usage?.prompt_tokens ?? 0,
        json.usage?.completion_tokens ?? 0,
      );
      let parsedJson: unknown;
      if (input.payload.responseFormat === "json") {
        try { parsedJson = JSON.parse(text); } catch { /* leave undefined */ }
      }
      return { text, json: parsedJson, interaction };
    },

    async embedding(
      input: LLMRunnerEmbeddingInput,
    ): Promise<LLMRunnerEmbeddingOutput> {
      const startedAt = Date.now();
      const config = await loadOrDefault(deps, slugForTaskType(AI_TASK_TYPES.EMBEDDING), "embedding");
      const entry = config.primary; // embedding has no fallback chain by default
      const apiKey = readApiKey(entry);
      if (!apiKey) throw new Error(`${entry.keyEnv} not configured`);
      const model = input.payload.model ?? entry.model;
      const inputs = Array.isArray(input.payload.input) ? input.payload.input : [input.payload.input];
      const body: Record<string, unknown> = { model, input: inputs };
      if (input.payload.dimensions) body.dimensions = input.payload.dimensions;
      const res = await fetch(EMBEDDING_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`embedding HTTP ${res.status}: ${t.slice(0, 200)}`);
      }
      const json = await res.json() as {
        data?: Array<{ embedding: number[] }>;
        usage?: { prompt_tokens?: number };
      };
      const vectors = (json.data ?? []).map((d) => d.embedding);
      const dim = vectors[0]?.length ?? 0;
      const interaction: AiInteractionRecord = buildInteraction({
        feature: input.payload.feature,
        provider: entry.provider,
        model,
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: 0,
        startedAt,
        fallbackUsed: false,
        costTable: config.costPer1k,
        metadata: { input_count: inputs.length, dim, config_source: config.source, key_env: entry.keyEnv },
      });
      return { vectors, dim, interaction };
    },

    async rag(input: LLMRunnerRagInput): Promise<LLMRunnerRagOutput> {
      // Default RAG runner: degenerate to a completion call with the query
      // as the user message. Real retrieval lives in domain-specific RAG
      // adapters that override this runner — kept here as a sane fallback.
      const config = await loadOrDefault(deps, slugForTaskType(AI_TASK_TYPES.RAG), "chat");
      const routed = await aiRouteForAgent({
        config,
        feature: input.payload.feature,
        options: {
          messages: [
            { role: "system", content: `Answer using the ${input.payload.collection} collection. Be concise.` },
            { role: "user", content: input.payload.query },
          ],
          model: input.payload.model,
        },
      });
      const json = await readChatJson(routed.response);
      const answer = json.choices?.[0]?.message?.content ?? "";
      const interaction = finaliseInteraction(
        {
          ...routed.interaction,
          metadata: {
            ...(routed.interaction.metadata ?? {}),
            collection: input.payload.collection,
            top_k: input.payload.topK ?? 0,
          },
        },
        config.costPer1k,
        json.usage?.prompt_tokens ?? 0,
        json.usage?.completion_tokens ?? 0,
      );
      return { answer, citations: [], interaction };
    },
  };
}
