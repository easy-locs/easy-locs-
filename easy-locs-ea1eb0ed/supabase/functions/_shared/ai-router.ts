const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const OPENAI_TIMEOUT_MS = 8000;

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
  preferredProvider?: "openai" | "anthropic" | "auto";
}

export interface AIRouterResult {
  response: Response;
  provider: "openai" | "anthropic";
  fallbackUsed: boolean;
}

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";

function getOpenAIKey(): string | null {
  return Deno.env.get("OPENAI_API_KEY") ?? null;
}

function getAnthropicKey(): string | null {
  return Deno.env.get("ANTHROPIC_API_KEY") ?? null;
}

async function callOpenAI(options: AIRouterOptions): Promise<Response> {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const { messages, model = DEFAULT_OPENAI_MODEL, stream, ...rest } = options;
  delete (rest as Record<string, unknown>).preferredProvider;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

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

async function callAnthropic(options: AIRouterOptions): Promise<Response> {
  const apiKey = getAnthropicKey();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const { messages, model = DEFAULT_ANTHROPIC_MODEL, max_tokens = 2000, temperature = 0.7, stream } = options;
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

export async function aiRoute(options: AIRouterOptions): Promise<AIRouterResult> {
  const preferred = options.preferredProvider ?? "auto";
  const hasOpenAI = !!getOpenAIKey();
  const hasAnthropic = !!getAnthropicKey();

  if (preferred === "anthropic" && hasAnthropic) {
    const response = await callAnthropic(options);
    return { response, provider: "anthropic", fallbackUsed: false };
  }

  if (preferred === "openai" && hasOpenAI) {
    try {
      const response = await callOpenAI(options);
      if (response.ok) return { response, provider: "openai", fallbackUsed: false };
      if (hasAnthropic && (response.status === 429 || response.status >= 500)) {
        console.warn(`[ai-router] OpenAI returned ${response.status}, falling back to Anthropic`);
        const fallbackResp = await callAnthropic(options);
        return { response: fallbackResp, provider: "anthropic", fallbackUsed: true };
      }
      return { response, provider: "openai", fallbackUsed: false };
    } catch (err) {
      if (hasAnthropic) {
        console.warn("[ai-router] OpenAI failed, falling back to Anthropic:", (err as Error).message);
        const fallbackResp = await callAnthropic(options);
        return { response: fallbackResp, provider: "anthropic", fallbackUsed: true };
      }
      throw err;
    }
  }

  if (hasOpenAI) {
    try {
      const response = await callOpenAI(options);
      if (response.ok || !hasAnthropic) {
        return { response, provider: "openai", fallbackUsed: false };
      }
      if (response.status === 429 || response.status >= 500) {
        console.warn(`[ai-router] OpenAI returned ${response.status}, falling back to Anthropic`);
        const fallbackResp = await callAnthropic(options);
        return { response: fallbackResp, provider: "anthropic", fallbackUsed: true };
      }
      return { response, provider: "openai", fallbackUsed: false };
    } catch (err) {
      if (hasAnthropic) {
        console.warn("[ai-router] OpenAI timeout/error, falling back to Anthropic:", (err as Error).message);
        const fallbackResp = await callAnthropic(options);
        return { response: fallbackResp, provider: "anthropic", fallbackUsed: true };
      }
      throw err;
    }
  }

  if (hasAnthropic) {
    const response = await callAnthropic(options);
    return { response, provider: "anthropic", fallbackUsed: false };
  }

  throw new Error("No AI provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.");
}

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

export { callOpenAI as openaiChat };
