import { createDomainRouter } from "../_shared/domain-router.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { buildCacheHeaders, generateETag, checkConditionalRequest } from "../_shared/cache-headers.ts";
import { getCachedResponse, setCachedResponse, invalidateCacheOnMutation } from "../_shared/edge-cache.ts";
import { cachedQuery, QUERY_CACHE_NAMESPACES, invalidateQueryCache } from "../_shared/redis-query-cache.ts";
import { isMeilisearchAvailable, searchMeilisearch } from "../_shared/search-engine-sync.ts";
import { proxyToFunction } from "../_shared/edge-function-consolidation.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

const CACHE_NS = "marketplace";

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const router = createDomainRouter({
  domain: "marketplace",
  routes: [
    {
      method: "POST",
      pattern: "/listings",
      handler: async (ctx) => {
        const { category, city, page, limit: reqLimit, sort } = ctx.body as {
          category?: string;
          city?: string;
          page?: number;
          limit?: number;
          sort?: string;
        };

        const supabase = getSupabase();
        const pageNum = Math.max(1, page ?? 1);
        const queryLimit = Math.min(reqLimit ?? 20, 50);
        const offset = (pageNum - 1) * queryLimit;

        const SAFE_STATUSES = ["active", "published"];

        const data = await cachedQuery(
          {
            namespace: QUERY_CACHE_NAMESPACES.SERVICE_LISTINGS,
            keyParts: ["list", category ?? "all", city ?? "all", "public", String(pageNum)],
            ttlSeconds: 120,
          },
          async () => {
            let query = supabase
              .from("listings")
              .select("*", { count: "exact" })
              .in("status", SAFE_STATUSES)
              .range(offset, offset + queryLimit - 1);

            if (category) query = query.ilike("category", `%${category}%`);
            if (city) query = query.ilike("city", `%${city}%`);
            if (sort === "price_asc") query = query.order("price", { ascending: true });
            else if (sort === "price_desc") query = query.order("price", { ascending: false });
            else if (sort === "rating") query = query.order("rating", { ascending: false });
            else query = query.order("created_at", { ascending: false });

            const { data, error, count } = await query;
            if (error) throw error;
            return { listings: data, total: count };
          },
        );

        const body = JSON.stringify(data);
        const etag = generateETag(body);
        const notModified = checkConditionalRequest(ctx.req, etag, ctx.corsHeaders);
        if (notModified) return notModified;

        const cacheHeaders = buildCacheHeaders({ maxAge: 60, sMaxAge: 300, staleWhileRevalidate: 30, etag, vary: ["Accept-Encoding"] });
        return new Response(body, {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
      requireAuth: false,
    },
    {
      method: "POST",
      pattern: "/listings/detail",
      handler: async (ctx) => {
        const { id } = ctx.body as { id: string };
        const supabase = getSupabase();

        const cached = await getCachedResponse(
          ctx.req,
          { ttlSeconds: 300, namespace: CACHE_NS },
          undefined, undefined, undefined,
          id,
        );
        if (cached) {
          const cacheHeaders = buildCacheHeaders("listing");
          for (const [k, v] of Object.entries(cacheHeaders)) cached.headers.set(k, v);
          for (const [k, v] of Object.entries(ctx.corsHeaders)) cached.headers.set(k, v);
          return cached;
        }

        const { data, error } = await supabase
          .from("listings")
          .select("*")
          .eq("id", id)
          .in("status", ["active", "published"])
          .maybeSingle();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        if (!data) {
          return new Response(JSON.stringify({ error: "Not found" }), {
            status: 404,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const body = JSON.stringify({ listing: data });
        await setCachedResponse(ctx.req, body, { ttlSeconds: 300, namespace: CACHE_NS }, undefined, undefined, undefined, id);

        const cacheHeaders = buildCacheHeaders("listing");
        return new Response(body, {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
      requireAuth: false,
    },
    {
      method: "POST",
      pattern: "/listings/create",
      handler: async (ctx) => {
        const supabase = getSupabase();
        const rawListing = ctx.body as Record<string, unknown>;

        const ALLOWED_CREATE_FIELDS = new Set([
          "title", "description", "price", "currency", "category",
          "city", "address", "latitude", "longitude", "image_url",
          "images", "availability", "tags", "type", "vertical",
        ]);
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rawListing)) {
          if (key === "action") continue;
          if (ALLOWED_CREATE_FIELDS.has(key)) sanitized[key] = value;
        }

        const { data, error } = await supabase
          .from("listings")
          .insert({ ...sanitized, user_id: ctx.userId, status: "draft" })
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        await invalidateCacheOnMutation(CACHE_NS);
        await invalidateQueryCache(QUERY_CACHE_NAMESPACES.SERVICE_LISTINGS);
        await invalidateQueryCache(QUERY_CACHE_NAMESPACES.TRENDING_LISTINGS);

        const cacheHeaders = buildCacheHeaders("mutation");
        return new Response(JSON.stringify({ listing: data }), {
          status: 201,
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/listings/update",
      handler: async (ctx) => {
        const { id, action: _action, ...rawUpdates } = ctx.body as { id: string; action?: string } & Record<string, unknown>;
        const supabase = getSupabase();

        const ALLOWED_LISTING_FIELDS = new Set([
          "title", "description", "price", "currency", "category",
          "city", "address", "latitude", "longitude", "image_url",
          "images", "availability", "tags", "status",
        ]);
        const BLOCKED_STATUSES = new Set(["admin_hidden", "suspended"]);
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(rawUpdates)) {
          if (ALLOWED_LISTING_FIELDS.has(key)) {
            if (key === "status" && typeof value === "string" && BLOCKED_STATUSES.has(value)) continue;
            sanitized[key] = value;
          }
        }

        if (Object.keys(sanitized).length === 0) {
          return new Response(JSON.stringify({ error: "No valid fields to update" }), {
            status: 400,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data, error } = await supabase
          .from("listings")
          .update(sanitized)
          .eq("id", id)
          .eq("user_id", ctx.userId)
          .select()
          .single();

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        await invalidateCacheOnMutation(CACHE_NS);
        await invalidateQueryCache(QUERY_CACHE_NAMESPACES.SERVICE_LISTINGS);

        const cacheHeaders = buildCacheHeaders("mutation");
        return new Response(JSON.stringify({ listing: data }), {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
    },
    {
      method: "POST",
      pattern: "/search",
      handler: async (ctx) => {
        const { query, types, filters, page, limit: reqLimit } = ctx.body as {
          query: string;
          types?: string[];
          filters?: Record<string, unknown>;
          page?: number;
          limit?: number;
        };

        if (!query || query.trim().length < 2) {
          return new Response(JSON.stringify({ results: [], total: 0 }), {
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const pageNum = Math.max(1, page ?? 1);
        const queryLimit = Math.min(reqLimit ?? 20, 50);

        if (isMeilisearchAvailable()) {
          try {
            const meiliFilters: string[] = [];
            if (types && types.length > 0) {
              meiliFilters.push(`type IN [${types.map(t => `"${t}"`).join(", ")}]`);
            }
            if (filters) {
              if (filters.city) meiliFilters.push(`city = "${filters.city}"`);
              if (filters.vertical) meiliFilters.push(`vertical = "${filters.vertical}"`);
              if (filters.min_rating) meiliFilters.push(`rating >= ${filters.min_rating}`);
            }

            const result = await searchMeilisearch(query, {
              filter: meiliFilters.length > 0 ? meiliFilters : undefined,
              limit: queryLimit,
              offset: (pageNum - 1) * queryLimit,
              sort: ["rating:desc"],
            });

            const body = JSON.stringify({
              results: result.hits,
              total: result.estimatedTotalHits,
              page: pageNum,
              limit: queryLimit,
              engine: "meilisearch",
              processingTimeMs: result.processingTimeMs,
            });

            const cacheHeaders = buildCacheHeaders("search");
            return new Response(body, {
              headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
            });
          } catch (err) {
            ctx.logger.warn("meilisearch_fallback", { error: err as Error });
          }
        }

        const supabase = getSupabase();
        const tsQuery = query.trim().split(/\s+/).join(" & ");

        let ftsQuery = supabase
          .from("listings")
          .select("*", { count: "exact" })
          .textSearch("fts", tsQuery, { type: "websearch" })
          .in("status", ["active", "published"])
          .range((pageNum - 1) * queryLimit, pageNum * queryLimit - 1);

        if (types && types.length > 0) {
          ftsQuery = ftsQuery.in("type", types);
        }
        if (filters?.city) {
          ftsQuery = ftsQuery.ilike("city", `%${filters.city}%`);
        }

        const { data: ftsData, error: ftsError, count: ftsCount } = await ftsQuery;

        if (ftsError) {
          return new Response(JSON.stringify({ error: ftsError.message }), {
            status: 500,
            headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
          });
        }

        const ftsBody = JSON.stringify({
          results: ftsData ?? [],
          total: ftsCount ?? 0,
          page: pageNum,
          limit: queryLimit,
          engine: "postgres_fts",
        });

        const cacheHeaders = buildCacheHeaders("search");
        return new Response(ftsBody, {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
      requireAuth: false,
    },
    {
      method: "POST",
      pattern: "/trending",
      handler: async (ctx) => {
        const supabase = getSupabase();

        const data = await cachedQuery(
          {
            namespace: QUERY_CACHE_NAMESPACES.TRENDING_LISTINGS,
            keyParts: ["global"],
            ttlSeconds: 300,
          },
          async () => {
            const { data, error } = await supabase
              .from("listings")
              .select("id, title, category, city, price, rating, image_url")
              .in("status", ["active", "published"])
              .order("rating", { ascending: false })
              .limit(20);
            if (error) throw error;
            return data;
          },
        );

        const body = JSON.stringify({ trending: data });
        const cacheHeaders = buildCacheHeaders("listing");
        return new Response(body, {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
      requireAuth: false,
    },
    {
      method: "POST",
      pattern: "/categories",
      handler: async (ctx) => {
        const supabase = getSupabase();

        const data = await cachedQuery(
          {
            namespace: QUERY_CACHE_NAMESPACES.POPULAR_CATEGORIES,
            keyParts: ["all"],
            ttlSeconds: 600,
          },
          async () => {
            const { data, error } = await supabase
              .from("categories")
              .select("id, name, parent_name, slug")
              .order("name");
            if (error) throw error;
            return data;
          },
        );

        const body = JSON.stringify({ categories: data });
        const cacheHeaders = buildCacheHeaders("static");
        return new Response(body, {
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json", ...cacheHeaders },
        });
      },
      requireAuth: false,
    },
    {
      method: "POST",
      pattern: "/expire-listings",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "expire-listings", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/shop-import",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "shop-import-processor", cors, ctx.rawBody);
      },
    },
    {
      method: "POST",
      pattern: "/uae-scrape-onboard",
      handler: async (ctx) => {
        const cors = getCorsHeaders(ctx.req);
        return proxyToFunction(ctx.req, "uae-scrape-onboard", cors, ctx.rawBody);
      },
    },
  ],
});

Deno.serve(router);
