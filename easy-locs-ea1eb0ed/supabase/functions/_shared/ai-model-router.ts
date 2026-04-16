import { getOpenAIApiKey, type ChatMessage, type OpenAIChatOptions } from "./openai-client.ts";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const OPENAI_TIMEOUT_MS = 8000;
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022";

interface ModelRouterOptions {
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: unknown;
  preferredProvider?: "openai" | "anthropic";
}

interface ModelRouterResult {
  response: Response;
  provider: "openai" | "anthropic";
  model: string;
  fallback: boolean;
}

function getAnthropicApiKey(): string {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  return key;
}

function hasAnthropicKey(): boolean {
  return !!Deno.env.get("ANTHROPIC_API_KEY");
}

function convertMessagesToAnthropic(messages: ChatMessage[]): {
  system: string;
  messages: Array<{ role: string; content: string }>;
} {
  let system = "";
  const anthropicMessages: Array<{ role: string; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      system += (system ? "\n\n" : "") + msg.content;
    } else {
      const role = msg.role === "assistant" ? "assistant" : "user";
      anthropicMessages.push({ role, content: msg.content });
    }
  }

  if (anthropicMessages.length === 0) {
    anthropicMessages.push({ role: "user", content: "Hello" });
  }

  return { system, messages: anthropicMessages };
}

async function callOpenAI(options: ModelRouterOptions): Promise<Response> {
  const apiKey = getOpenAIApiKey();
  const body: Record<string, unknown> = {
    model: DEFAULT_OPENAI_MODEL,
    messages: options.messages,
    max_tokens: options.max_tokens ?? 2000,
    temperature: options.temperature ?? 0.7,
  };

  if (options.stream) body.stream = true;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;
  if (options.response_format) body.response_format = options.response_format;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const resp = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return resp;
  } finally {
    clearTimeout(timeout);
  }
}

async function callAnthropic(options: ModelRouterOptions): Promise<Response> {
  const apiKey = getAnthropicApiKey();
  const { system, messages } = convertMessagesToAnthropic(options.messages);

  const body: Record<string, unknown> = {
    model: DEFAULT_ANTHROPIC_MODEL,
    max_tokens: options.max_tokens ?? 2000,
    temperature: options.temperature ?? 0.7,
    messages,
  };

  if (system) body.system = system;
  if (options.stream) body.stream = true;

  return fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
}

function normalizeAnthropicResponse(anthropicData: Record<string, unknown>): Record<string, unknown> {
  const content = (anthropicData.content as Array<{ type: string; text?: string }>) ?? [];
  const textBlock = content.find((b) => b.type === "text");
  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: textBlock?.text ?? "",
        },
        finish_reason: anthropicData.stop_reason ?? "stop",
      },
    ],
    model: anthropicData.model,
    usage: anthropicData.usage,
  };
}

export async function aiModelRoute(options: ModelRouterOptions): Promise<ModelRouterResult> {
  const preferred = options.preferredProvider ?? "openai";

  if (preferred === "openai") {
    try {
      const response = await callOpenAI(options);
      if (response.ok) {
        return { response, provider: "openai", model: DEFAULT_OPENAI_MODEL, fallback: false };
      }
      console.warn(`[ai-model-router] OpenAI returned ${response.status}, attempting Anthropic fallback`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[ai-model-router] OpenAI failed (${msg}), attempting Anthropic fallback`);
    }

    if (hasAnthropicKey()) {
      try {
        const response = await callAnthropic(options);
        return { response, provider: "anthropic", model: DEFAULT_ANTHROPIC_MODEL, fallback: true };
      } catch (err) {
        console.error("[ai-model-router] Anthropic fallback also failed:", err);
        throw new Error("All AI providers failed");
      }
    }
    throw new Error("OpenAI failed and no Anthropic API key configured for fallback");
  }

  try {
    const response = await callAnthropic(options);
    if (response.ok) {
      return { response, provider: "anthropic", model: DEFAULT_ANTHROPIC_MODEL, fallback: false };
    }
    console.warn(`[ai-model-router] Anthropic returned ${response.status}, attempting OpenAI fallback`);
  } catch (err) {
    console.warn("[ai-model-router] Anthropic failed, attempting OpenAI fallback:", err);
  }

  try {
    const response = await callOpenAI(options);
    return { response, provider: "openai", model: DEFAULT_OPENAI_MODEL, fallback: true };
  } catch (err) {
    console.error("[ai-model-router] OpenAI fallback also failed:", err);
    throw new Error("All AI providers failed");
  }
}

export async function aiModelChat(options: ModelRouterOptions): Promise<{
  reply: string;
  provider: string;
  model: string;
  fallback: boolean;
}> {
  const result = await aiModelRoute(options);

  if (!result.response.ok) {
    const errText = await result.response.text();
    throw new Error(`AI API error [${result.response.status}]: ${errText}`);
  }

  const data = await result.response.json();

  let reply: string;
  if (result.provider === "anthropic") {
    const normalized = normalizeAnthropicResponse(data);
    const choices = normalized.choices as Array<{ message: { content: string } }>;
    reply = choices?.[0]?.message?.content ?? "";
  } else {
    reply = data.choices?.[0]?.message?.content ?? "";
  }

  return { reply, provider: result.provider, model: result.model, fallback: result.fallback };
}

export async function aiModelStream(options: ModelRouterOptions): Promise<{
  stream: ReadableStream;
  provider: string;
  model: string;
  fallback: boolean;
}> {
  const result = await aiModelRoute({ ...options, stream: true });

  if (!result.response.ok) {
    const errText = await result.response.text();
    throw new Error(`AI stream error [${result.response.status}]: ${errText}`);
  }

  if (result.provider === "anthropic") {
    const transformedStream = transformAnthropicStreamToOpenAI(result.response.body!);
    return { stream: transformedStream, provider: result.provider, model: result.model, fallback: result.fallback };
  }

  return { stream: result.response.body!, provider: result.provider, model: result.model, fallback: result.fallback };
}

function transformAnthropicStreamToOpenAI(anthropicStream: ReadableStream): ReadableStream {
  const reader = anthropicStream.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        return;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const jsonStr = trimmed.slice(6).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;

        try {
          const event = JSON.parse(jsonStr);
          if (event.type === "content_block_delta" && event.delta?.text) {
            const openaiChunk = {
              choices: [{ delta: { content: event.delta.text }, index: 0 }],
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(openaiChunk)}\n\n`));
          }
        } catch {
          // skip malformed chunks — partial JSON will be reassembled on next read
        }
      }
    },
  });
}

export { DEFAULT_OPENAI_MODEL, DEFAULT_ANTHROPIC_MODEL };
