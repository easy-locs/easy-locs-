/**
 * vector-similarity-search
 *
 * Runs a pgvector cosine-similarity query against the embedding-augmented
 * tables (listings, marketplace_services, seed_products) and returns ranked
 * matches enriched with the metadata the frontend recommendation engine
 * needs to render result cards.
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
import { generateEmbedding, EMBEDDING_DIMENSIONS } from "../_shared/embedding-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EMBEDDING_DIM = EMBEDDING_DIMENSIONS;
const MAX_MATCH_COUNT = 50;
const DEFAULT_MATCH_COUNT = 20;
const DEFAULT_THRESHOLD = 0.3;
const MAX_QUERY_TEXT_LENGTH = 2000;

interface RequestBody {
  user_id?: string;
  query_embedding?: number[];
  query_text?: string;
  match_count?: number;
  similarity_threshold?: number;
}

interface Match {
  id: string;
  title: string;
  type: "listing" | "service" | "product";
  route: string;
  vertical: string;
  similarity: number;
  image_url?: string;
  subtitle?: string;
}

interface MatchRow {
  id: string;
  similarity: number;
}

const TABLES: Array<{
  name: string;
  vertical: string;
  type: Match["type"];
  buildRoute: (id: string) => string;
}> = [
  { name: "listings", vertical: "shops", type: "listing", buildRoute: (id) => `/listings/${id}` },
  { name: "marketplace_services", vertical: "services", type: "service", buildRoute: (id) => `/services/${id}` },
  { name: "seed_products", vertical: "shops", type: "product", buildRoute: (id) => `/shops/products/${id}` },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isFiniteNumberArray(value: unknown, expectedLength?: number): value is number[] {
  if (!Array.isArray(value)) return false;
  if (expectedLength != null && value.length !== expectedLength) return false;
  for (const v of value) {
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
  }
  return true;
}

async function fetchTableMatches(
  db: ReturnType<typeof createClient>,
  table: typeof TABLES[number],
  embeddingLiteral: string,
  threshold: number,
  perTableCount: number,
): Promise<Match[]> {
  const { data, error } = await db.rpc("match_embeddings", {
    p_table_name: table.name,
    p_query_embedding: embeddingLiteral,
    p_match_threshold: threshold,
    p_match_count: perTableCount,
  });

  if (error) {
    console.warn(`[vector-similarity-search] match_embeddings(${table.name}) failed: ${error.message}`);
    return [];
  }

  const rows = (data ?? []) as MatchRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const similarityById = new Map(rows.map((r) => [r.id, Number(r.similarity) || 0]));

  // Per-table enrichment: pull only the columns we know exist on each table.
  let enrichedById = new Map<string, { title: string; image_url?: string; subtitle?: string }>();

  if (table.name === "listings") {
    const { data: rowsData, error: rowsErr } = await db
      .from("listings")
      .select("id, title, category, city, image_url")
      .in("id", ids);
    if (rowsErr) {
      console.warn(`[vector-similarity-search] enrich listings failed: ${rowsErr.message}`);
    } else {
      for (const r of (rowsData ?? []) as Array<{
        id: string; title: string | null; category: string | null; city: string | null; image_url: string | null;
      }>) {
        const subtitleParts = [r.category, r.city].filter(Boolean);
        enrichedById.set(r.id, {
          title: r.title ?? "Listing",
          image_url: r.image_url ?? undefined,
          subtitle: subtitleParts.length ? subtitleParts.join(" · ") : undefined,
        });
      }
    }
  } else if (table.name === "marketplace_services") {
    const { data: rowsData, error: rowsErr } = await db
      .from("marketplace_services")
      .select("id, title, category, city, photo_urls")
      .in("id", ids);
    if (rowsErr) {
      console.warn(`[vector-similarity-search] enrich marketplace_services failed: ${rowsErr.message}`);
    } else {
      for (const r of (rowsData ?? []) as Array<{
        id: string; title: string | null; category: string | null; city: string | null; photo_urls: unknown;
      }>) {
        const photos = Array.isArray(r.photo_urls) ? (r.photo_urls as string[]) : [];
        const subtitleParts = [r.category, r.city].filter(Boolean);
        enrichedById.set(r.id, {
          title: r.title ?? "Service",
          image_url: photos[0],
          subtitle: subtitleParts.length ? subtitleParts.join(" · ") : undefined,
        });
      }
    }
  } else if (table.name === "seed_products") {
    const { data: rowsData, error: rowsErr } = await db
      .from("seed_products")
      .select("id, name, category, image")
      .in("id", ids);
    if (rowsErr) {
      console.warn(`[vector-similarity-search] enrich seed_products failed: ${rowsErr.message}`);
    } else {
      for (const r of (rowsData ?? []) as Array<{
        id: string; name: string | null; category: string | null; image: string | null;
      }>) {
        enrichedById.set(r.id, {
          title: r.name ?? "Product",
          image_url: r.image ?? undefined,
          subtitle: r.category ?? undefined,
        });
      }
    }
  }

  const matches: Match[] = [];
  for (const id of ids) {
    const enriched = enrichedById.get(id);
    if (!enriched) continue; // row may have been deleted between RPC and enrichment
    matches.push({
      id,
      title: enriched.title,
      type: table.type,
      route: table.buildRoute(id),
      vertical: table.vertical,
      similarity: similarityById.get(id) ?? 0,
      image_url: enriched.image_url,
      subtitle: enriched.subtitle,
    });
  }
  return matches;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const auth = await requireAuthenticatedUser(req);
  if (!auth.authorized) return auth.response!;

  const body = (await req.json().catch(() => ({}))) as RequestBody;

  // Accept either a pre-computed embedding (must match the canonical
  // EMBEDDING_DIM) or free-form text the server will embed via the shared
  // AI_EMBEDDING adapter. Text is preferred for callers that don't already
  // hold a 1536-dim vector (e.g. the in-browser recommendation engine).
  let queryEmbedding: number[] | null = null;

  if (body.query_embedding !== undefined) {
    if (!isFiniteNumberArray(body.query_embedding)) {
      return jsonResponse({ error: "query_embedding must be a finite number[]" }, 400);
    }
    if (body.query_embedding.length !== EMBEDDING_DIM) {
      return jsonResponse(
        { error: `query_embedding must have ${EMBEDDING_DIM} dimensions, got ${body.query_embedding.length}` },
        400,
      );
    }
    queryEmbedding = body.query_embedding;
  } else if (typeof body.query_text === "string" && body.query_text.trim().length > 0) {
    const text = body.query_text.trim().slice(0, MAX_QUERY_TEXT_LENGTH);
    try {
      const result = await generateEmbedding(text);
      if (result.embedding.length !== EMBEDDING_DIM) {
        console.warn(
          `[vector-similarity-search] embedding-client returned ${result.embedding.length} dims, expected ${EMBEDDING_DIM}`,
        );
        return jsonResponse({ error: "Embedding service returned unexpected dimensions" }, 502);
      }
      queryEmbedding = result.embedding;
    } catch (err) {
      console.warn(
        `[vector-similarity-search] generateEmbedding failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return jsonResponse({ error: "Failed to embed query_text" }, 502);
    }
  } else {
    return jsonResponse(
      { error: "Either query_embedding (number[]) or query_text (string) is required" },
      400,
    );
  }

  const matchCount = Math.max(
    1,
    Math.min(MAX_MATCH_COUNT, Math.floor(body.match_count ?? DEFAULT_MATCH_COUNT)),
  );
  const threshold = typeof body.similarity_threshold === "number" && Number.isFinite(body.similarity_threshold)
    ? Math.max(0, Math.min(1, body.similarity_threshold))
    : DEFAULT_THRESHOLD;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("[vector-similarity-search] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env");
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }
  const db = createClient(supabaseUrl, serviceKey);

  // pgvector accepts the embedding as a string literal of the form "[v1,v2,...]"
  const embeddingLiteral = `[${queryEmbedding.join(",")}]`;

  // Fetch a generous slice from each table so we can globally rank and
  // truncate to match_count after merging.
  const perTableCount = Math.min(MAX_MATCH_COUNT, matchCount);

  const perTable = await Promise.all(
    TABLES.map((t) => fetchTableMatches(db, t, embeddingLiteral, threshold, perTableCount)),
  );

  const merged = perTable.flat().sort((a, b) => b.similarity - a.similarity).slice(0, matchCount);

  return jsonResponse({ matches: merged });
});
