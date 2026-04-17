/**
 * vector-similarity-search
 *
 * Runs a pgvector cosine-similarity query against the embedding-augmented
 * tables (listings, marketplace_services, seed_products) and returns ranked
 * matches enriched with the metadata the frontend recommendation engine
 * needs to render result cards.
 *
 * The actual request/response logic lives in `./handler.ts` so it can be
 * unit-tested under Vitest without pulling in Deno-only / `npm:` imports.
 *
 * Input (one of `query_embedding` or `query_text` is required):
 *   - query_embedding: number[] — pre-computed vector. Must have the
 *     canonical embedding dimension (1536) so it lines up with the columns
 *     written by `vector-embed`.
 *   - query_text: string — free-form text describing the user's interests;
 *     the function will embed it server-side via the shared AI_EMBEDDING
 *     adapter. Preferred for in-browser callers (e.g. recommendation-engine)
 *     that don't already hold a 1536-dim vector.
 *   - user_id?: string — currently unused for filtering but accepted for
 *     forward compatibility (e.g. excluding items the user already owns).
 *   - match_count?: number (default 20, capped at 50)
 *   - similarity_threshold?: number (default 0.3)
 *
 * Output:
 *   - matches: Array<{ id, title, type, route, vertical, similarity,
 *                       image_url?, subtitle? }>
 */
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { generateEmbedding } from "../_shared/embedding-client.ts";
import { createHandler, type SupabaseLike } from "./handler.ts";

Deno.serve(
  createHandler({
    requireAuthenticatedUser,
    createSupabaseClient: (url, key) => createClient(url, key) as unknown as SupabaseLike,
    getEnv: (key) => Deno.env.get(key),
    embed: async (text) => {
      const result = await generateEmbedding(text);
      return { embedding: result.embedding };
    },
  }),
);
