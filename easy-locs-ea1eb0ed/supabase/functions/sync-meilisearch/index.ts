import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireServiceRole } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import {
  meiliAddDocuments, meiliCreateIndex,
  meiliUpdateSettings, isMeilisearchAvailable,
} from "../_shared/meilisearch-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-trace-id, x-span-id, x-parent-span-id, x-request-id, traceparent",
};

const INDEX_CONFIGS: Record<string, {
  table: string;
  select: string;
  filterableAttributes: string[];
  sortableAttributes: string[];
  searchableAttributes: string[];
  mapFn: (row: Record<string, unknown>) => Record<string, unknown>;
}> = {
  shops: {
    table: "storefront_pages",
    select: "id, name, slug, subcategory, city, country, rating, vertical, latitude, longitude, is_open, logo_url, banner_url, description",
    filterableAttributes: ["city", "country", "vertical", "subcategory", "is_open", "rating"],
    sortableAttributes: ["rating", "name", "created_at"],
    searchableAttributes: ["name", "subcategory", "description", "city"],
    mapFn: (r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      subcategory: r.subcategory,
      city: r.city,
      country: r.country,
      rating: r.rating,
      vertical: r.vertical,
      lat: r.latitude,
      lng: r.longitude,
      is_open: r.is_open,
      image_url: r.banner_url ?? r.logo_url,
      description: r.description,
      type: "shop",
    }),
  },
  products: {
    table: "seed_products",
    select: "id, name, price, category, image_url, description",
    filterableAttributes: ["category", "price"],
    sortableAttributes: ["price", "name"],
    searchableAttributes: ["name", "category", "description"],
    mapFn: (r) => ({
      id: r.id,
      name: r.name,
      price: r.price,
      category: r.category,
      image_url: r.image_url,
      description: r.description,
      type: "product",
    }),
  },
  properties: {
    table: "properties",
    select: "id, name, address, city, country, property_type, latitude, longitude",
    filterableAttributes: ["city", "country", "property_type"],
    sortableAttributes: ["name", "city"],
    searchableAttributes: ["name", "address", "city", "property_type"],
    mapFn: (r) => ({
      id: r.id,
      name: r.name ?? r.address,
      address: r.address,
      city: r.city,
      country: r.country,
      property_type: r.property_type,
      lat: r.latitude,
      lng: r.longitude,
      type: "property",
    }),
  },
  services: {
    table: "listings",
    select: "id, title, price, currency, category, city, latitude, longitude, rating, image_url, description",
    filterableAttributes: ["category", "city", "price", "rating"],
    sortableAttributes: ["price", "rating", "title"],
    searchableAttributes: ["title", "category", "description", "city"],
    mapFn: (r) => ({
      id: r.id,
      name: r.title,
      price: r.price,
      currency: r.currency,
      category: r.category,
      city: r.city,
      lat: r.latitude,
      lng: r.longitude,
      rating: r.rating,
      image_url: r.image_url,
      description: r.description,
      type: "service",
    }),
  },
  profiles: {
    table: "profiles",
    select: "id, full_name, avatar_url, city, role",
    filterableAttributes: ["city", "role"],
    sortableAttributes: ["full_name"],
    searchableAttributes: ["full_name", "city"],
    mapFn: (r) => ({
      id: r.id,
      name: r.full_name,
      avatar_url: r.avatar_url,
      city: r.city,
      role: r.role,
      type: "profile",
    }),
  },
};

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const auth = requireServiceRole(req);
  if (!auth.authorized) return auth.response!;

  if (!isMeilisearchAvailable()) {
    return new Response(
      JSON.stringify({ error: "Meilisearch not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const body = await req.json().catch(() => ({}));
  const { indexes: requestedIndexes, full_sync } = body;

  const indexNames = requestedIndexes ?? Object.keys(INDEX_CONFIGS);
  const results: Record<string, unknown> = {};
  let totalDocuments = 0;

  for (const indexName of indexNames) {
    const config = INDEX_CONFIGS[indexName];
    if (!config) {
      results[indexName] = { error: "Unknown index" };
      continue;
    }

    try {
      await meiliCreateIndex(indexName);

      await meiliUpdateSettings(indexName, {
        filterableAttributes: config.filterableAttributes,
        sortableAttributes: config.sortableAttributes,
        searchableAttributes: config.searchableAttributes,
      });

      const BATCH_SIZE = 500;
      let offset = 0;
      let indexed = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(config.table)
          .select(config.select)
          .range(offset, offset + BATCH_SIZE - 1);

        if (error) {
          console.error(`[sync-meilisearch] Error fetching ${indexName}:`, error);
          break;
        }

        if (!data || data.length === 0) {
          hasMore = false;
          break;
        }

        const documents = data.map(config.mapFn);
        await meiliAddDocuments(indexName, documents as Array<{ id: string; [key: string]: unknown }>);
        indexed += documents.length;
        offset += BATCH_SIZE;

        if (data.length < BATCH_SIZE) hasMore = false;
      }

      results[indexName] = { success: true, indexed };
      totalDocuments += indexed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results[indexName] = { error: msg };
      console.error(`[sync-meilisearch] Failed to sync ${indexName}:`, msg);
    }
  }

  return new Response(
    JSON.stringify({ results, totalDocuments, timestamp: new Date().toISOString() }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
