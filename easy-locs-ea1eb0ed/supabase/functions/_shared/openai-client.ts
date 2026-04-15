const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

export function getOpenAIApiKey(): string {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return key;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface OpenAIChatOptions {
  model?: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: unknown;
}

export const DEFAULT_MODEL = "gpt-4o-mini";

export async function openaiChat(options: OpenAIChatOptions): Promise<Response> {
  const apiKey = getOpenAIApiKey();
  const { model = DEFAULT_MODEL, ...rest } = options;
  return fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, ...rest }),
  });
}
