/**
 * Production LLMRunner that wraps the existing `_shared/ai-router.ts#aiRoute`
 * primitive — same OpenAI→Anthropic fallback, same key handling, same
 * timeout — but reshaped into the AdapterRunner contract LB1 (#815) needs.
 *
 * Tests inject a fake `LLMRunner` instead of importing this file, so the
 * runner is intentionally thin: it exists only to bind the registry adapter
 * to the existing provider plumbing without duplicating it.
 */

import {
  aiRoute,
  DEFAULT_OPENAI_MODEL,
  type AIRouterOptions,
} from "../../../ai-router.ts";
import type {
  AiInteractionRecord,
} from "./types.ts";
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
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

// Extremely conservative cost defaults; production should re-tune from a
// pricing table. Numbers in USD per 1k tokens.
const COST_PER_1K_PROMPT: Record<string, number> = {
  "gpt-4o-mini": 0.00015,
  "gpt-4o": 0.0025,
  "claude-3-5-haiku-20241022": 0.0008,
  "text-embedding-3-small": 0.00002,
  "text-embedding-3-large": 0.00013,
};
const COST_PER_1K_COMPLETION: Record<string, number> = {
  "gpt-4o-mini": 0.0006,
  "gpt-4o": 0.01,
  "claude-3-5-haiku-20241022": 0.004,
};

function priceFor(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pIn = COST_PER_1K_PROMPT[model] ?? 0.0001;
  const pOut = COST_PER_1K_COMPLETION[model] ?? 0.0003;
  return (promptTokens * pIn + completionTokens * pOut) / 1000;
}

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

export function createAiRouteRunner(): LLMRunner {
  return {
    async completion(
      input: LLMRunnerCompletionInput,
    ): Promise<LLMRunnerCompletionOutput> {
      const startedAt = Date.now();
      const opts: AIRouterOptions = {
        messages: input.payload.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        model: input.payload.model,
        max_tokens: input.payload.maxTokens,
        temperature: input.payload.temperature,
        response_format: input.payload.responseFormat === "json"
          ? { type: "json_object" }
          : undefined,
      };
      const routed = await aiRoute(opts);
      const json = await readChatJson(routed.response);
      const text = json.choices?.[0]?.message?.content ?? "";
      const promptTokens = json.usage?.prompt_tokens ?? 0;
      const completionTokens = json.usage?.completion_tokens ?? 0;
      const model = input.payload.model ?? DEFAULT_OPENAI_MODEL;
      const interaction: AiInteractionRecord = {
        feature: input.payload.feature,
        provider: routed.provider,
        model,
        promptTokens,
        completionTokens,
        costUsd: priceFor(model, promptTokens, completionTokens),
        latencyMs: Date.now() - startedAt,
        fallbackUsed: routed.fallbackUsed,
        status: "ok",
        metadata: {},
      };
      let parsedJson: unknown;
      if (input.payload.responseFormat === "json") {
        try {
          parsedJson = JSON.parse(text);
        } catch {
          // Leave undefined; the verifier doesn't require it, only `text`.
        }
      }
      return { text, json: parsedJson, interaction };
    },

    async embedding(
      input: LLMRunnerEmbeddingInput,
    ): Promise<LLMRunnerEmbeddingOutput> {
      const startedAt = Date.now();
      const apiKey = (globalThis as { Deno?: { env: { get(k: string): string | undefined } } })
        .Deno?.env.get("OPENAI_API_KEY");
      if (!apiKey) throw new Error("OPENAI_API_KEY not configured");
      const model = input.payload.model ?? DEFAULT_EMBEDDING_MODEL;
      const inputs = Array.isArray(input.payload.input)
        ? input.payload.input
        : [input.payload.input];
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
      const promptTokens = json.usage?.prompt_tokens ?? 0;
      const interaction: AiInteractionRecord = {
        feature: input.payload.feature,
        provider: "openai",
        model,
        promptTokens,
        completionTokens: 0,
        costUsd: priceFor(model, promptTokens, 0),
        latencyMs: Date.now() - startedAt,
        fallbackUsed: false,
        status: "ok",
        metadata: { input_count: inputs.length, dim },
      };
      return { vectors, dim, interaction };
    },

    async rag(input: LLMRunnerRagInput): Promise<LLMRunnerRagOutput> {
      // Default RAG runner: degenerate to a completion call with the query
      // as the user message. Real retrieval lives in domain-specific RAG
      // adapters that override this runner — kept here as a sane fallback.
      const startedAt = Date.now();
      const routed = await aiRoute({
        messages: [
          { role: "system", content: `Answer using the ${input.payload.collection} collection. Be concise.` },
          { role: "user", content: input.payload.query },
        ],
        model: input.payload.model,
      });
      const json = await readChatJson(routed.response);
      const answer = json.choices?.[0]?.message?.content ?? "";
      const promptTokens = json.usage?.prompt_tokens ?? 0;
      const completionTokens = json.usage?.completion_tokens ?? 0;
      const model = input.payload.model ?? DEFAULT_OPENAI_MODEL;
      const interaction: AiInteractionRecord = {
        feature: input.payload.feature,
        provider: routed.provider,
        model,
        promptTokens,
        completionTokens,
        costUsd: priceFor(model, promptTokens, completionTokens),
        latencyMs: Date.now() - startedAt,
        fallbackUsed: routed.fallbackUsed,
        status: "ok",
        metadata: { collection: input.payload.collection, top_k: input.payload.topK ?? 0 },
      };
      return { answer, citations: [], interaction };
    },
  };
}
