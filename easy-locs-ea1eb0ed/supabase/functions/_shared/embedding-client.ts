// LB Closeout #852 — embedding-client is now a thin shim over the platform
// agent registry. Direct `fetch("https://api.openai.com/v1/embeddings")` is
// no longer permitted; the AI_EMBEDDING adapter handles provider selection,
// quota and `ai_interactions` persistence. The exported API shape is
// preserved so downstream callers (vector-embed, ai-recommendations, ai-rag,
// inngest-client) continue to work without source changes.

import { dispatchAiEmbedding } from "./execution/ai-dispatch.ts";

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokensUsed: number;
}

export interface BatchEmbeddingResult {
  embeddings: number[][];
  model: string;
  totalTokens: number;
}

function ensureFeatureTag(): string {
  // Generic tag — callers that need a precise feature tag should call
  // dispatchAiEmbedding directly. Kept stable so audit lines are searchable.
  return "embedding-client.shim";
}

export async function generateEmbedding(
  text: string,
  model: string = DEFAULT_EMBEDDING_MODEL,
): Promise<EmbeddingResult> {
  const cleaned = text.replace(/\n+/g, " ").trim();
  if (!cleaned) throw new Error("Empty text cannot be embedded");

  const feature = ensureFeatureTag();
  const outcome = await dispatchAiEmbedding(
    {
      feature,
      input: cleaned,
      model,
      dimensions: EMBEDDING_DIMENSIONS,
    },
    { feature },
  );

  if (outcome.status !== "succeeded" || !outcome.output) {
    throw new Error(
      `AI_EMBEDDING dispatch ${outcome.status}` +
        (outcome.errorCode ? ` [${outcome.errorCode}]` : "") +
        (outcome.errorMessage ? `: ${outcome.errorMessage}` : ""),
    );
  }

  const vec = outcome.output.vectors[0];
  if (!vec) throw new Error("AI_EMBEDDING dispatch returned no vector");

  return {
    embedding: vec,
    model,
    // The dispatch outcome doesn't surface per-call token counts (those are
    // recorded into ai_interactions by the adapter). Callers that previously
    // logged this number now get 0 — the canonical record is the audit row.
    tokensUsed: 0,
  };
}

export async function generateBatchEmbeddings(
  texts: string[],
  model: string = DEFAULT_EMBEDDING_MODEL,
): Promise<BatchEmbeddingResult> {
  const cleaned = texts.map((t) => t.replace(/\n+/g, " ").trim()).filter(Boolean);
  if (cleaned.length === 0) throw new Error("No valid texts to embed");

  const feature = ensureFeatureTag();
  const outcome = await dispatchAiEmbedding(
    {
      feature,
      input: cleaned,
      model,
      dimensions: EMBEDDING_DIMENSIONS,
    },
    { feature },
  );

  if (outcome.status !== "succeeded" || !outcome.output) {
    throw new Error(
      `AI_EMBEDDING dispatch ${outcome.status}` +
        (outcome.errorCode ? ` [${outcome.errorCode}]` : "") +
        (outcome.errorMessage ? `: ${outcome.errorMessage}` : ""),
    );
  }

  return {
    embeddings: outcome.output.vectors,
    model,
    totalTokens: 0,
  };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error("Vector dimensions must match");
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export { EMBEDDING_DIMENSIONS, DEFAULT_EMBEDDING_MODEL };
