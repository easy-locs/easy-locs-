/**
 * Tests for the `vector-similarity-search` edge function (task #920).
 *
 * The handler logic is extracted into `handler.ts` so we can run it under
 * Vitest (Node) without pulling in Deno-only / `npm:` imports. We test:
 *
 *   1. Validation
 *      - missing JWT → 401
 *      - missing both query_embedding and query_text → 400
 *      - query_embedding wrong type / wrong length (must be 1536 dims) → 400
 *      - non-POST → 405; OPTIONS preflight → 200 + CORS headers
 *      - misconfigured env (missing SUPABASE_URL) → 500
 *
 *   2. Happy path with a stub `match_embeddings` RPC and seeded enrichment
 *      rows: response contains a correctly-shaped `matches` array, globally
 *      sorted by similarity desc, capped at match_count.
 *
 *   3. Graceful degradation: when one of the three tables errors (RPC or
 *      enrichment), results from the other two still come back.
 *
 *   4. Smoke test on the frontend consumer `fetchPgvectorSimilar` proving it
 *      sends the new `query_text` payload and consumes `{ matches: [...] }`
 *      back into the recommendation engine output.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createHandler,
  EMBEDDING_DIM,
  type AuthResult,
  type HandlerDeps,
  type Match,
  type MatchRow,
  type SupabaseLike,
} from "../../supabase/functions/vector-similarity-search/handler.ts";

type RpcFn = (name: string, params: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
type SelectInFn = (col: string, ids: string[]) => Promise<{ data: unknown; error: { message: string } | null }>;
type FromFn = (table: string) => { select: (cols: string) => { in: SelectInFn } };

interface BuildDepsOptions {
  auth?: AuthResult;
  rpc?: RpcFn;
  from?: FromFn;
  embed?: HandlerDeps["embed"];
  env?: Record<string, string | undefined>;
}

function buildDeps(opts: BuildDepsOptions = {}): HandlerDeps {
  const env: Record<string, string | undefined> = {
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "service-key",
    ...opts.env,
  };
  const rpc: RpcFn = opts.rpc ?? (async () => ({ data: [], error: null }));
  const from: FromFn = opts.from ?? ((_table) => ({ select: () => ({ in: async () => ({ data: [], error: null }) }) }));
  const supa: SupabaseLike = {
    rpc: rpc as SupabaseLike["rpc"],
    from: from as unknown as SupabaseLike["from"],
  };
  return {
    requireAuthenticatedUser: vi.fn().mockResolvedValue(opts.auth ?? { authorized: true, userId: "u1" }),
    createSupabaseClient: () => supa,
    getEnv: (k) => env[k],
    embed: opts.embed ?? (async () => ({ embedding: Array(EMBEDDING_DIM).fill(0.01) })),
  };
}

function makeRequest(init: { method?: string; body?: unknown; auth?: boolean } = {}) {
  const { method = "POST", body, auth = true } = init;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers["authorization"] = "Bearer test-token";
  return new Request("https://example.test/vector-similarity-search", {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("vector-similarity-search handler — validation", () => {
  it("returns 401 when JWT/authorization is missing", async () => {
    const handler = createHandler(
      buildDeps({
        auth: {
          authorized: false,
          response: new Response(JSON.stringify({ error: "Missing authorization header" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }),
        },
      }),
    );
    const res = await handler(makeRequest({ auth: false, body: { query_text: "anything" } }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toMatch(/auth/i);
  });

  it("returns 400 when neither query_embedding nor query_text is provided", async () => {
    const handler = createHandler(buildDeps());
    const res = await handler(makeRequest({ body: { user_id: "u1" } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/query_embedding.*query_text|query_text.*query_embedding/);
  });

  it("returns 400 when query_embedding is not a finite number array", async () => {
    const handler = createHandler(buildDeps());
    const res = await handler(makeRequest({ body: { query_embedding: ["not", "numbers"] } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/finite/);
  });

  it("returns 400 when query_embedding has the wrong dimension count", async () => {
    const handler = createHandler(buildDeps());
    const wrongLength = Array(EMBEDDING_DIM - 1).fill(0.1);
    const res = await handler(makeRequest({ body: { query_embedding: wrongLength } }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain(`${EMBEDDING_DIM}`);
    expect(body.error).toContain(`${wrongLength.length}`);
  });

  it("returns 400 when query_embedding contains NaN", async () => {
    const handler = createHandler(buildDeps());
    const bad = Array(EMBEDDING_DIM).fill(0.1);
    bad[5] = NaN;
    const res = await handler(makeRequest({ body: { query_embedding: bad } }));
    expect(res.status).toBe(400);
  });

  it("returns 405 for non-POST methods", async () => {
    const handler = createHandler(buildDeps());
    const res = await handler(makeRequest({ method: "GET" }));
    expect(res.status).toBe(405);
  });

  it("returns 200 with CORS headers on OPTIONS preflight", async () => {
    const handler = createHandler(buildDeps());
    const res = await handler(makeRequest({ method: "OPTIONS", auth: false }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods") ?? "").toContain("POST");
  });

  it("returns 500 when SUPABASE_URL/SERVICE_ROLE_KEY env is missing", async () => {
    const handler = createHandler(
      buildDeps({ env: { SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined } }),
    );
    const res = await handler(
      makeRequest({ body: { query_embedding: Array(EMBEDDING_DIM).fill(0.1) } }),
    );
    expect(res.status).toBe(500);
  });

  it("returns 502 when embed throws on query_text", async () => {
    const handler = createHandler(
      buildDeps({ embed: async () => { throw new Error("provider down"); } }),
    );
    const res = await handler(makeRequest({ body: { query_text: "food near me" } }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/embed/i);
  });

  it("returns 502 when embed returns wrong-dim vector", async () => {
    const handler = createHandler(
      buildDeps({ embed: async () => ({ embedding: Array(128).fill(0.1) }) }),
    );
    const res = await handler(makeRequest({ body: { query_text: "food near me" } }));
    expect(res.status).toBe(502);
  });
});

describe("vector-similarity-search handler — happy path", () => {
  it("returns matches sorted by similarity desc and shaped per the contract", async () => {
    // Stub match_embeddings RPC: each table returns two rows with known
    // similarity scores so we can verify global ordering across tables.
    const rpc: RpcFn = async (name, params) => {
      expect(name).toBe("match_embeddings");
      const table = params.p_table_name as string;
      const rowsByTable: Record<string, MatchRow[]> = {
        listings: [{ id: "L1", similarity: 0.95 }, { id: "L2", similarity: 0.55 }],
        marketplace_services: [{ id: "S1", similarity: 0.80 }, { id: "S2", similarity: 0.40 }],
        seed_products: [{ id: "P1", similarity: 0.70 }, { id: "P2", similarity: 0.30 }],
      };
      return { data: rowsByTable[table] ?? [], error: null };
    };

    const from: FromFn = (table) => ({
      select: () => ({
        in: async (_col, ids) => {
          if (table === "listings") {
            return {
              data: ids.map((id) => ({ id, title: `Listing ${id}`, category: "Cat", city: "City", image_url: `img-${id}.jpg` })),
              error: null,
            };
          }
          if (table === "marketplace_services") {
            return {
              data: ids.map((id) => ({ id, title: `Service ${id}`, category: "Pro", city: "Town", photo_urls: [`svc-${id}.jpg`] })),
              error: null,
            };
          }
          if (table === "seed_products") {
            return {
              data: ids.map((id) => ({ id, name: `Product ${id}`, category: "Goods", image: `prod-${id}.jpg` })),
              error: null,
            };
          }
          return { data: [], error: null };
        },
      }),
    });

    const handler = createHandler(buildDeps({ rpc, from }));

    const res = await handler(
      makeRequest({
        body: {
          query_embedding: Array(EMBEDDING_DIM).fill(0.1),
          match_count: 6,
          similarity_threshold: 0.2,
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { matches: Match[] };
    expect(Array.isArray(body.matches)).toBe(true);
    expect(body.matches.length).toBe(6);

    // Global similarity-desc ordering across all three tables.
    expect(body.matches.map((m) => m.id)).toEqual(["L1", "S1", "P1", "L2", "S2", "P2"]);
    for (let i = 1; i < body.matches.length; i++) {
      expect(body.matches[i - 1].similarity).toBeGreaterThanOrEqual(body.matches[i].similarity);
    }

    // Shape & per-table enrichment.
    const l1 = body.matches.find((m) => m.id === "L1")!;
    expect(l1).toMatchObject({ type: "listing", vertical: "shops", route: "/listings/L1", title: "Listing L1", image_url: "img-L1.jpg" });
    expect(l1.subtitle).toContain("Cat");

    const s1 = body.matches.find((m) => m.id === "S1")!;
    expect(s1).toMatchObject({ type: "service", vertical: "services", route: "/services/S1", title: "Service S1", image_url: "svc-S1.jpg" });

    const p1 = body.matches.find((m) => m.id === "P1")!;
    expect(p1).toMatchObject({ type: "product", vertical: "shops", route: "/shops/products/P1", title: "Product P1", image_url: "prod-P1.jpg", subtitle: "Goods" });
  });

  it("respects match_count cap", async () => {
    const rpc: RpcFn = async (_name, params) => {
      const count = params.p_match_count as number;
      const table = params.p_table_name as string;
      return {
        data: Array.from({ length: count }, (_, i) => ({ id: `${table}-${i}`, similarity: 0.5 - i * 0.01 })),
        error: null,
      };
    };
    const from: FromFn = (table) => ({
      select: () => ({
        in: async (_c, ids) => ({
          data: ids.map((id) => table === "seed_products"
            ? { id, name: id, category: null, image: null }
            : { id, title: id, category: null, city: null, image_url: null, photo_urls: null }),
          error: null,
        }),
      }),
    });
    const handler = createHandler(buildDeps({ rpc, from }));
    const res = await handler(makeRequest({ body: { query_embedding: Array(EMBEDDING_DIM).fill(0.1), match_count: 5 } }));
    expect(res.status).toBe(200);
    expect((await res.json()).matches.length).toBe(5);
  });

  it("uses query_text path: calls embed and proceeds", async () => {
    const embed = vi.fn(async () => ({ embedding: Array(EMBEDDING_DIM).fill(0.2) }));
    const handler = createHandler(buildDeps({ embed }));
    const res = await handler(makeRequest({ body: { query_text: "  pizza near me  " } }));
    expect(res.status).toBe(200);
    expect(embed).toHaveBeenCalledWith("pizza near me");
  });
});

describe("vector-similarity-search handler — graceful degradation", () => {
  it("returns matches from the other two tables when one table's RPC errors", async () => {
    const rpc: RpcFn = async (_name, params) => {
      const table = params.p_table_name as string;
      if (table === "marketplace_services") {
        return { data: null, error: { message: "rpc boom" } };
      }
      return {
        data: [{ id: `${table}-1`, similarity: table === "listings" ? 0.9 : 0.6 }],
        error: null,
      };
    };
    const from: FromFn = (table) => ({
      select: () => ({
        in: async (_c, ids) => ({
          data: ids.map((id) => table === "seed_products"
            ? { id, name: `name-${id}`, category: "c", image: "i.jpg" }
            : { id, title: `title-${id}`, category: "c", city: "ct", image_url: "img.jpg", photo_urls: [] }),
          error: null,
        }),
      }),
    });
    const handler = createHandler(buildDeps({ rpc, from }));
    const res = await handler(makeRequest({ body: { query_embedding: Array(EMBEDDING_DIM).fill(0.1) } }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { matches: Match[] };
    const ids = body.matches.map((m) => m.id);
    expect(ids).toContain("listings-1");
    expect(ids).toContain("seed_products-1");
    expect(ids.find((id) => id.startsWith("marketplace_services"))).toBeUndefined();
    // Globally sorted: listings (0.9) before seed_products (0.6).
    expect(ids[0]).toBe("listings-1");
  });

  it("returns matches from other tables when one table's enrichment SELECT errors", async () => {
    const rpc: RpcFn = async (_n, params) => ({
      data: [{ id: `${params.p_table_name}-x`, similarity: 0.5 }],
      error: null,
    });
    const from: FromFn = (table) => ({
      select: () => ({
        in: async (_c, ids) => {
          if (table === "listings") {
            return { data: null, error: { message: "enrich boom" } };
          }
          return {
            data: ids.map((id) => table === "seed_products"
              ? { id, name: `n-${id}`, category: "c", image: "i" }
              : { id, title: `t-${id}`, category: "c", city: "ct", image_url: "i", photo_urls: [] }),
            error: null,
          };
        },
      }),
    });
    const handler = createHandler(buildDeps({ rpc, from }));
    const res = await handler(makeRequest({ body: { query_embedding: Array(EMBEDDING_DIM).fill(0.1) } }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { matches: Match[] };
    const ids = body.matches.map((m) => m.id);
    // listings rows had no enrichment → dropped. Other tables surface.
    expect(ids).not.toContain("listings-x");
    expect(ids).toContain("marketplace_services-x");
    expect(ids).toContain("seed_products-x");
  });

  it("returns empty matches array (not error) when all three tables return zero rows", async () => {
    const handler = createHandler(buildDeps());
    const res = await handler(makeRequest({ body: { query_embedding: Array(EMBEDDING_DIM).fill(0.1) } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matches).toEqual([]);
  });
});

describe("recommendation-engine fetchPgvectorSimilar — frontend consumer smoke", () => {
  it("sends `query_text` to the edge function and surfaces returned matches into recs", async () => {
    vi.resetModules();

    const invokeMock = vi.fn().mockResolvedValue({
      data: {
        matches: [
          {
            id: "ext_listing_42",
            title: "External pgvector match",
            type: "listing",
            route: "/food/ext-42",
            vertical: "food",
            similarity: 0.91,
            image_url: "https://img.test/42.jpg",
            subtitle: "Top match",
          },
        ],
      },
      error: null,
    });

    vi.doMock("@/services/db", () => ({
      db: { functions: { invoke: invokeMock } },
    }));

    const engine = await import("@/engines/recommendations/recommendation-engine");

    engine.trackUserInteraction("user-pg-1", "rec_food_1", "favorite");

    const results = await engine.scoreRecommendationsAsync({
      userId: "user-pg-1",
      timeOfDay: "afternoon",
      recentRoutes: ["/food/x"],
      favorites: ["rec_food_1"],
    });

    expect(invokeMock).toHaveBeenCalled();
    const [fnName, opts] = invokeMock.mock.calls[0];
    expect(fnName).toBe("vector-similarity-search");
    expect(opts.body).toMatchObject({
      user_id: "user-pg-1",
      similarity_threshold: 0.3,
    });
    // The current consumer sends free-form text (server-side embedding path).
    expect(typeof opts.body.query_text).toBe("string");
    expect(opts.body.query_text.length).toBeGreaterThan(0);

    const surfaced = results.find((r) => r.id === "ext_listing_42");
    expect(surfaced).toBeDefined();
    expect(surfaced!.title).toBe("External pgvector match");
    expect(surfaced!.imageUrl).toBe("https://img.test/42.jpg");
    expect(surfaced!.subtitle).toBe("Top match");
  });

  it("gracefully degrades when the edge function returns empty matches", async () => {
    vi.resetModules();

    const invokeMock = vi.fn().mockResolvedValue({ data: { matches: [] }, error: null });
    vi.doMock("@/services/db", () => ({
      db: { functions: { invoke: invokeMock } },
    }));

    const engine = await import("@/engines/recommendations/recommendation-engine");
    engine.trackUserInteraction("user-pg-2", "rec_taxi_1", "favorite");

    const results = await engine.scoreRecommendationsAsync({
      userId: "user-pg-2",
      timeOfDay: "morning",
      recentRoutes: ["/mobility/taxi"],
      favorites: ["rec_taxi_1"],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => !r.id.startsWith("ext_"))).toBe(true);
  });

  it("gracefully degrades when the edge function errors", async () => {
    vi.resetModules();

    const invokeMock = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    vi.doMock("@/services/db", () => ({
      db: { functions: { invoke: invokeMock } },
    }));

    const engine = await import("@/engines/recommendations/recommendation-engine");
    engine.trackUserInteraction("user-pg-3", "rec_stay_1", "favorite");

    const results = await engine.scoreRecommendationsAsync({
      userId: "user-pg-3",
      timeOfDay: "evening",
      recentRoutes: ["/travel/stays"],
      favorites: ["rec_stay_1"],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => !r.id.startsWith("ext_"))).toBe(true);
  });
});
