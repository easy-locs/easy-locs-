import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { checkServerRateLimit, rateLimitResponse } from "../_shared/server-rate-limiter.ts";
import { meiliSearch, isMeilisearchAvailable } from "../_shared/meilisearch-client.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  try {
    const rlResult = await checkServerRateLimit(req, "search-meilisearch");
    if (!rlResult.allowed) return rateLimitResponse(rlResult);

    const authCheck = await requireAuthenticatedUser(req);
    if (!authCheck.authorized) return authCheck.response!;

    if (!isMeilisearchAvailable()) {
      return new Response(
        JSON.stringify({ error: "Search engine not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      query, indexes, limit = 20, offset = 0,
      filters, facets, sort,
    } = body;

    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ results: [], total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchIndexes = indexes ?? ["shops", "products", "properties", "services", "profiles"];
    const allResults: Array<Record<string, unknown>> = [];
    const facetDistributions: Record<string, Record<string, Record<string, number>>> = {};

    const searchPromises = searchIndexes.map(async (indexName: string) => {
      try {
        const searchOptions: {
          q: string;
          limit: number;
          offset: number;
          filter?: string[];
          facets?: string[];
          sort?: string[];
        } = {
          q: query.trim(),
          limit: Math.min(limit, 50),
          offset,
        };

        if (filters?.[indexName]) {
          searchOptions.filter = Array.isArray(filters[indexName])
            ? filters[indexName]
            : [filters[indexName]];
        }
        if (facets) searchOptions.facets = facets;
        if (sort) searchOptions.sort = sort;

        const result = await meiliSearch(indexName, searchOptions);

        if (result.facetDistribution) {
          facetDistributions[indexName] = result.facetDistribution;
        }

        return result.hits.map((hit) => ({
          ...hit,
          _index: indexName,
          _score: 1,
        }));
      } catch (err) {
        console.warn(`[search-meilisearch] Error searching ${indexName}:`, err);
        return [];
      }
    });

    const settled = await Promise.allSettled(searchPromises);
    for (const result of settled) {
      if (result.status === "fulfilled") {
        allResults.push(...result.value);
      }
    }

    return new Response(
      JSON.stringify({
        results: allResults,
        total: allResults.length,
        facets: Object.keys(facetDistributions).length > 0 ? facetDistributions : undefined,
        query: query.trim(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[search-meilisearch] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
