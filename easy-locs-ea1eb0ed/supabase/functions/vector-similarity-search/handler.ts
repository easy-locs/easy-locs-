/**
 * vector-similarity-search — pure handler.
 *
 * The Deno-specific entrypoint (`index.ts`) wires this handler with real
 * dependencies (`Deno.env`, `Deno.serve`, `npm:@supabase/supabase-js`,
 * `_shared/embedding-client`, `_shared/edge-auth`). Keeping the handler
 * dependency-injected lets us run it under Vitest in the regular Node test
 * environment (see `src/test/vector-similarity-search.edge.test.ts`).
 */

export const EMBEDDING_DIM = 1536;
export const MAX_MATCH_COUNT = 50;
export const DEFAULT_MATCH_COUNT = 20;
export const DEFAULT_THRESHOLD = 0.3;
export const MAX_QUERY_TEXT_LENGTH = 2000;

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export interface RequestBody {
  user_id?: string;
  query_embedding?: number[];
  query_text?: string;
  match_count?: number;
  similarity_threshold?: number;
}

export interface Match {
  id: string;
  title: string;
  type: "listing" | "service" | "product";
  route: string;
  vertical: string;
  similarity: number;
  image_url?: string;
  subtitle?: string;
}

export interface MatchRow {
  id: string;
  similarity: number;
}

export interface RpcResult<T> {
  data: T | null;
  error: { message: string } | null;
}

export interface SelectBuilder<T> {
  in(column: string, ids: string[]): Promise<RpcResult<T[]>>;
}

export interface FromBuilder {
  select<T = unknown>(cols: string): SelectBuilder<T>;
}

export interface SupabaseLike {
  rpc(name: string, params: Record<string, unknown>): Promise<RpcResult<MatchRow[]>>;
  from(table: string): FromBuilder;
}

export interface AuthResult {
  authorized: boolean;
  userId?: string;
  response?: Response;
}

export interface HandlerDeps {
  requireAuthenticatedUser: (req: Request) => Promise<AuthResult>;
  createSupabaseClient: (url: string, key: string) => SupabaseLike;
  getEnv: (key: string) => string | undefined;
  embed: (text: string) => Promise<{ embedding: number[] }>;
}

export const TABLES: Array<{
  name: string;
  vertical: string;
  type: Match["type"];
  buildRoute: (id: string) => string;
}> = [
  { name: "listings", vertical: "shops", type: "listing", buildRoute: (id) => `/listings/${id}` },
  { name: "marketplace_services", vertical: "services", type: "service", buildRoute: (id) => `/services/${id}` },
  { name: "seed_products", vertical: "shops", type: "product", buildRoute: (id) => `/shops/products/${id}` },
];

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function isFiniteNumberArray(value: unknown, expectedLength?: number): value is number[] {
  if (!Array.isArray(value)) return false;
  if (expectedLength != null && value.length !== expectedLength) return false;
  for (const v of value) {
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
  }
  return true;
}

async function fetchTableMatches(
  db: SupabaseLike,
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

  const enrichedById = new Map<string, { title: string; image_url?: string; subtitle?: string }>();

  if (table.name === "listings") {
    const { data: rowsData, error: rowsErr } = await db
      .from("listings")
      .select<{
        id: string; title: string | null; category: string | null; city: string | null; image_url: string | null;
      }>("id, title, category, city, image_url")
      .in("id", ids);
    if (rowsErr) {
      console.warn(`[vector-similarity-search] enrich listings failed: ${rowsErr.message}`);
    } else {
      for (const r of rowsData ?? []) {
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
      .select<{
        id: string; title: string | null; category: string | null; city: string | null; photo_urls: unknown;
      }>("id, title, category, city, photo_urls")
      .in("id", ids);
    if (rowsErr) {
      console.warn(`[vector-similarity-search] enrich marketplace_services failed: ${rowsErr.message}`);
    } else {
      for (const r of rowsData ?? []) {
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
      .select<{
        id: string; name: string | null; category: string | null; image: string | null;
      }>("id, name, category, image")
      .in("id", ids);
    if (rowsErr) {
      console.warn(`[vector-similarity-search] enrich seed_products failed: ${rowsErr.message}`);
    } else {
      for (const r of rowsData ?? []) {
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
    if (!enriched) continue;
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

export function createHandler(deps: HandlerDeps): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const auth = await deps.requireAuthenticatedUser(req);
    if (!auth.authorized) return auth.response!;

    const body = (await req.json().catch(() => ({}))) as RequestBody;

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
        const result = await deps.embed(text);
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

    const supabaseUrl = deps.getEnv("SUPABASE_URL");
    const serviceKey = deps.getEnv("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("[vector-similarity-search] missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env");
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }
    const db = deps.createSupabaseClient(supabaseUrl, serviceKey);

    const embeddingLiteral = `[${queryEmbedding.join(",")}]`;
    const perTableCount = Math.min(MAX_MATCH_COUNT, matchCount);

    const perTable = await Promise.all(
      TABLES.map((t) => fetchTableMatches(db, t, embeddingLiteral, threshold, perTableCount)),
    );

    const merged = perTable.flat().sort((a, b) => b.similarity - a.similarity).slice(0, matchCount);

    return jsonResponse({ matches: merged });
  };
}
