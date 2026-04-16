import { supabase } from "@/integrations/supabase/client";

export type RagDomain = "radar" | "marketplace" | "property" | "ride" | "general";

export interface RagCitation {
  id: string;
  kind: string;
  title: string;
  score: number;
  snippet?: string;
}

export interface RagAskInput {
  query: string;
  conversationId?: string;
  domain?: RagDomain;
  topK?: number;
  locale?: string;
}

export interface RagAskResult {
  reply: string;
  citations: RagCitation[];
  conversationId: string;
  provider: "openai" | "anthropic";
  fallbackUsed: boolean;
  cost: number;
}

export interface RagAskError {
  error: string;
  reason?: string;
  details?: string;
}

export async function askRag(input: RagAskInput): Promise<RagAskResult | RagAskError> {
  const { data, error } = await supabase.functions.invoke<RagAskResult | RagAskError>(
    "ai-router/rag",
    { body: input },
  );
  if (error) return { error: error.message };
  return data ?? { error: "No response" };
}

export function isRagError(res: RagAskResult | RagAskError): res is RagAskError {
  return (res as RagAskError).error !== undefined;
}
