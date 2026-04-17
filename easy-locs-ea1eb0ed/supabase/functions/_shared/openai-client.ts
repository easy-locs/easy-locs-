// LB Closeout #852 — `openai-client.ts` is retired.
//
// Every AI callsite must now go through `dispatchAiCompletion`
// (or `dispatchAiEmbedding` / `dispatchAiRag` / `dispatchAiToolUse`) in
// `_shared/execution/ai-dispatch.ts`, so the call is governed by the
// platform agent registry: quota, sensitive routing, approval flow, and
// `ai_interactions` audit are guaranteed.
//
// This module is kept as a compile-time stub so any rogue import surfaces
// as an immediate, loud error instead of silently re-introducing a
// provider-key bypass.

const REPLACEMENT_NOTE =
  "openai-client.ts is retired (#852). Use dispatchAiCompletion from " +
  "_shared/execution/ai-dispatch.ts instead.";

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

export function getOpenAIApiKey(): string {
  throw new Error(REPLACEMENT_NOTE);
}

export function openaiChat(_options: OpenAIChatOptions): Promise<Response> {
  throw new Error(REPLACEMENT_NOTE);
}
