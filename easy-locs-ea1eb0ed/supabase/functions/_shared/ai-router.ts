/**
 * Shared AI provider router.
 *
 * As of LB1 follow-up 4 (#837) this module no longer reads `Deno.env`
 * directly when invoked through the registry — `aiRouteForAgent()`
 * accepts an `AgentRouterConfig` resolved from `system.agents.metadata.
 * router`, and the env-var holding the API key is named in that config.
 * Rotating a provider key, swapping a default model, or rearranging the
 * fallback chain is therefore a single configuration change visible in
 * the agent inspector — no code edit required.
 *
 * The legacy `aiRoute()` / `aiRouteAndParse()` entry points are retained
 * unchanged for callers that have not yet migrated through the
 * adapter; they internally delegate to the new path with an env-derived
 * default config and are marked `@deprecated`.
 */

import {
  type AgentRouterConfig,
  type AiProviderEntry,
  buildInteraction,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_TIMEOUT_MS,
  envDefaultChatConfig,
  readApiKey,
} from "./execution/adapters/ai/router-config.ts";
import type { AiInteractionRecord } from "./execution/adapters/ai/types.ts";

export {
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OPENAI_MODEL,
} from "./execution/adapters/ai/router-config.ts";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export interface ChatMessage {
  role: string;
  content: string;
}

export interface AIRouterOptions {
  messages: ChatMessage[];
  model?: string;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: unknown;
  /** @deprecated — model + provider chain are sourced from the agent
   *  registry. Retained so legacy callers compile, but ignored when
   *  invoked via `aiRouteForAgent`. */
  preferredProvider?: "openai" | "anthropic" | "auto";
}

export interface AIRouterResult {
  response: Response;
  provider: "openai" | "anthropic";
  fallbackUsed: boolean;
}

/** Like `AIRouterResult` but also returns the canonical telemetry record
 *  so adapters and direct callers share one provider-agnostic shape. */
export interface AIRouterResultWithTelemetry extends AIRouterResult {
  interaction: AiInteractionRecord;
}

// ── Provider call primitives. Both take an explicit `entry` so the
//   key env-var name is config-driven, not hard-coded.

async function callOpenAI(entry: AiProviderEntry, options: AIRouterOptions): Promise<Response> {
  const apiKey = readApiKey(entry);
  if (!apiKey) throw new Error(`${entry.keyEnv} not configured`);

  const { messages, model = entry.model, stream, ...rest } = options;
  delete (rest as Record<string, unknown>).preferredProvider;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), entry.timeoutMs ?? DEFAULT_OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream: !!stream, ...rest }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function convertMessagesForAnthropic(messages: ChatMessage[]): {
  system: string;
  anthropicMessages: Array<{ role: string; content: string }>;
} {
  let system = "";
  const anthropicMessages: Array<{ role: string; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      system += (system ? "\n\n" : "") + msg.content;
    } else {
      anthropicMessages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      });
    }
  }

  if (anthropicMessages.length === 0) {
    anthropicMessages.push({ role: "user", content: "Hello" });
  }

  return { system, anthropicMessages };
}

async function callAnthropic(entry: AiProviderEntry, options: AIRouterOptions): Promise<Response> {
  const apiKey = readApiKey(entry);
  if (!apiKey) throw new Error(`${entry.keyEnv} not configured`);

  const { messages, model = entry.model, max_tokens = 2000, temperature = 0.7, stream } = options;
  const { system, anthropicMessages } = convertMessagesForAnthropic(messages);

  const body: Record<string, unknown> = {
    model,
    max_tokens,
    temperature,
    messages: anthropicMessages,
    stream: !!stream,
  };
  if (system) body.system = system;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (stream && response.ok && response.body) {
    const transformedStream = transformAnthropicStreamToOpenAI(response.body);
    return new Response(transformedStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  return response;
}

function transformAnthropicStreamToOpenAI(input: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async start(controller) {
      const reader = input.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === "[DONE]") continue;

            try {
              const event = JSON.parse(jsonStr);
              if (event.type === "content_block_delta" && event.delta?.text) {
                const openAIChunk = {
                  choices: [{
                    delta: { content: event.delta.text },
                    index: 0,
                    finish_reason: null,
                  }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`));
              } else if (event.type === "message_stop") {
                const stopChunk = {
                  choices: [{ delta: {}, index: 0, finish_reason: "stop" }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(stopChunk)}\n\n`));
              }
            } catch {
              console.warn("[ai-router] Failed to parse Anthropic stream chunk");
            }
          }
        }
      } catch (err) {
        console.error("[ai-router] Stream transform error:", err);
        controller.error(err);
      }
    },
  });
}

function normalizeAnthropicResponse(data: Record<string, unknown>): {
  choices: Array<{ message: { role: string; content: string } }>;
} {
  const content = (data.content as Array<{ type: string; text: string }>)?.[0]?.text ?? "";
  return {
    choices: [{ message: { role: "assistant", content } }],
  };
}

async function callProvider(entry: AiProviderEntry, options: AIRouterOptions): Promise<Response> {
  return entry.provider === "anthropic" ? callAnthropic(entry, options) : callOpenAI(entry, options);
}

// ── New, registry-aware entry point. Every AI agent run goes through
//   here; the config (model, fallback chain, key env-var names) comes
//   from `system.agents.metadata.router` via the loader in
//   `router-config.ts`.

export interface AiRouteForAgentInput {
  config: AgentRouterConfig;
  options: AIRouterOptions;
  /** Free-text caller tag (e.g. "support.triage") propagated into the
   *  canonical interaction record. */
  feature: string;
  /** Optional clock injection for tests. */
  now?: () => number;
}

export async function aiRouteForAgent(
  input: AiRouteForAgentInput,
): Promise<AIRouterResultWithTelemetry> {
  if (input.config.kind !== "chat") {
    throw new Error(`aiRouteForAgent: config.kind must be "chat" (got "${input.config.kind}")`);
  }

  const startedAt = (input.now ?? Date.now)();
  const chain: AiProviderEntry[] = [input.config.primary, ...input.config.fallbacks];
  const attempted: Array<{ provider: string; reason: string }> = [];

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    const isLast = i === chain.length - 1;
    const fallbackUsed = i > 0;

    if (!readApiKey(entry)) {
      attempted.push({ provider: entry.provider, reason: `${entry.keyEnv}_missing` });
      if (isLast) {
        throw new Error(
          `aiRouteForAgent: no provider key available; attempted=${
            attempted.map((a) => `${a.provider}:${a.reason}`).join(",")
          }`,
        );
      }
      continue;
    }

    try {
      const response = await callProvider(entry, input.options);
      const retriable = response.status === 429 || response.status >= 500;
      if (response.ok || isLast || !retriable) {
        // We do NOT consume the body here — the caller still needs it.
        // Telemetry is built with token counts of zero; the caller updates
        // them via `finaliseInteraction()` once the body is parsed.
        const interaction = buildInteraction({
          feature: input.feature,
          provider: entry.provider,
          model: input.options.model ?? entry.model,
          promptTokens: 0,
          completionTokens: 0,
          startedAt,
          fallbackUsed,
          status: response.ok ? "ok" : "error",
          blockReason: response.ok ? undefined : `provider_http_${response.status}`,
          costTable: input.config.costPer1k,
          metadata: {
            attempts: [...attempted, { provider: entry.provider, reason: response.ok ? "ok" : `http_${response.status}` }],
            config_source: input.config.source,
            key_env: entry.keyEnv,
          },
        });
        return { response, provider: entry.provider, fallbackUsed, interaction };
      }
      console.warn(
        `[ai-router] ${entry.provider} returned ${response.status}; trying fallback`,
      );
      attempted.push({ provider: entry.provider, reason: `http_${response.status}` });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ai-router] ${entry.provider} threw: ${msg}; trying fallback`);
      attempted.push({ provider: entry.provider, reason: `threw:${msg.slice(0, 80)}` });
      if (isLast) throw err;
    }
  }

  // Unreachable: the loop either returns or throws on the last entry.
  throw new Error("aiRouteForAgent: exhausted provider chain without resolution");
}

/** Update token counts on a canonical interaction once the body is parsed. */
export function finaliseInteraction(
  interaction: AiInteractionRecord,
  costTable: Record<string, { prompt: number; completion: number }>,
  promptTokens: number,
  completionTokens: number,
): AiInteractionRecord {
  const row = costTable[interaction.model] ?? { prompt: 0.0001, completion: 0.0003 };
  return {
    ...interaction,
    promptTokens,
    completionTokens,
    costUsd: (promptTokens * row.prompt + completionTokens * row.completion) / 1000,
  };
}

// ── Legacy env-only entry points ──────────────────────────────────────────
// These are retained for callers that haven't migrated through
// `dispatchExecutionTask`. They internally call the registry-aware path
// with a config built from environment variables, so the inner provider
// plumbing is identical for both.

/**
 * @deprecated Use `dispatchExecutionTask({ domain: "ai", taskType: "AI_COMPLETION", ... })`
 * so the call goes through the registered AI agent. This function exists only
 * for backwards compatibility with callers that have not migrated yet.
 */
export async function aiRoute(options: AIRouterOptions): Promise<AIRouterResult> {
  const config = envDefaultChatConfig();
  const { response, provider, fallbackUsed } = await aiRouteForAgent({
    config,
    options,
    feature: "legacy.aiRoute",
  });
  return { response, provider, fallbackUsed };
}

/**
 * @deprecated See `aiRoute` — this wrapper is kept only for legacy callers.
 */
export async function aiRouteAndParse(options: AIRouterOptions): Promise<{
  content: string;
  provider: "openai" | "anthropic";
  fallbackUsed: boolean;
}> {
  const { response, provider, fallbackUsed } = await aiRoute(options);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI ${provider} error [${response.status}]: ${errText}`);
  }

  const data = await response.json();

  let content: string;
  if (provider === "anthropic") {
    const normalized = normalizeAnthropicResponse(data);
    content = normalized.choices[0]?.message?.content ?? "";
  } else {
    content = data.choices?.[0]?.message?.content ?? "";
  }

  return { content, provider, fallbackUsed };
}

/** @deprecated Use `aiRouteForAgent` with a registry-resolved config. */
export const openaiChat = (options: AIRouterOptions) =>
  callOpenAI(envDefaultChatConfig().primary, options);

// Sanity: keep DEFAULT_OPENAI_MODEL in scope so the deprecated re-export
// above resolves at module init even if tree-shaken differently.
void DEFAULT_OPENAI_MODEL;
