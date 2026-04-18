import { requireRouterOrigin } from "../_shared/edge-function-consolidation.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { requireAuthenticatedUser } from "../_shared/edge-auth.ts";
import { rejectQuerySecrets } from "../_shared/reject-query-secrets.ts";
import { cFromEdge, cRpcEdge } from "../_shared/execution/content-mutation.ts";
import {
  meiliAddDocuments, meiliCreateIndex,
  meiliUpdateSettings, meiliDeleteDocuments,
  isMeilisearchAvailable,
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
    select: "id, name, slug, subcategory, city, country, rating, vertical, latitude, longitude, is_open, logo_url, banner_url, description, updated_at",
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
    select: "id, name, price, category, image_url, description, updated_at",
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
    select: "id, name, address, city, country, property_type, latitude, longitude, updated_at",
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
    select: "id, title, price, currency, category, city, latitude, longitude, rating, image_url, description, updated_at",
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
    select: "id, full_name, avatar_url, city, role, updated_at",
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
  food_menus: {
    table: "food_items",
    select: "id, name, description, price, currency, category, image_url, restaurant_id, updated_at",
    filterableAttributes: ["category", "price", "restaurant_id"],
    sortableAttributes: ["price", "name"],
    searchableAttributes: ["name", "description", "category"],
    mapFn: (r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      price: r.price,
      currency: r.currency ?? "AED",
      category: r.category,
      image_url: r.image_url,
      restaurant_id: r.restaurant_id,
      type: "food_menu",
    }),
  },
};

const ENTITY_TO_INDEX: Record<string, string> = {
  shop: "shops",
  product: "products",
  property: "properties",
  service: "services",
  profile: "profiles",
  food_menu: "food_menus",
};

interface QueueItem {
  id: number;
  entity_type: string;
  entity_id: string;
  operation: string;
}

async function processQueue(
  supabase: ReturnType<typeof createClient>,
  batchSize = 100,
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  const { data: queueItems, error: fetchError } = await supabase
    .from("search_sync_queue")
    .select("id, entity_type, entity_id, operation")
    .is("processed_at", null)
    .order("queued_at", { ascending: true })
    .limit(batchSize);

  if (fetchError || !queueItems || queueItems.length === 0) {
    return { processed: 0, errors: fetchError ? 1 : 0 };
  }

  const grouped: Record<string, QueueItem[]> = {};
  for (const item of queueItems as QueueItem[]) {
    const key = `${item.entity_type}:${item.operation}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  const succeededIds: number[] = [];

  for (const [key, items] of Object.entries(grouped)) {
    const [entityType, operation] = key.split(":");
    const indexName = ENTITY_TO_INDEX[entityType];
    if (!indexName) {
      errors += items.length;
      continue;
    }

    const config = INDEX_CONFIGS[indexName];
    if (!config) {
      errors += items.length;
      continue;
    }

    try {
      if (operation === "delete") {
        const ids = items.map((i) => i.entity_id);
        await meiliDeleteDocuments(indexName, ids);
        processed += items.length;
        succeededIds.push(...items.map((i) => i.id));
      } else {
        const entityIds = items.map((i) => i.entity_id);
        const { data: rows, error: rowErr } = await supabase
          .from(config.table)
          .select(config.select)
          .in("id", entityIds);

        if (rowErr) {
          console.error(`[sync-meilisearch-cron] Error fetching ${indexName} rows:`, rowErr);
          errors += items.length;
          continue;
        }

        if (rows && rows.length > 0) {
          const documents = rows.map(config.mapFn);
          await meiliAddDocuments(indexName, documents as Array<{ id: string; [key: string]: unknown }>);
          processed += documents.length;
        }
        succeededIds.push(...items.map((i) => i.id));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[sync-meilisearch-cron] Queue processing error for ${indexName}:`, msg);
      errors += items.length;
    }
  }

  if (succeededIds.length > 0) {
    await cFromEdge(supabase, "search_sync_queue")
      .update({ processed_at: new Date().toISOString() })
      .in("id", succeededIds);
  }

  return { processed, errors };
}

async function incrementalSync(
  supabase: ReturnType<typeof createClient>,
  sinceTimestamp: string,
): Promise<{ results: Record<string, unknown>; totalDocuments: number; errors: number }> {
  const results: Record<string, unknown> = {};
  let totalDocuments = 0;
  let errors = 0;

  for (const [indexName, config] of Object.entries(INDEX_CONFIGS)) {
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
          .gt("updated_at", sinceTimestamp)
          .order("updated_at", { ascending: true })
          .range(offset, offset + BATCH_SIZE - 1);

        if (error) {
          console.error(`[sync-meilisearch-cron] Error fetching ${indexName}:`, error);
          errors++;
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
      errors++;
      console.error(`[sync-meilisearch-cron] Failed incremental sync for ${indexName}:`, msg);
    }
  }

  return { results, totalDocuments, errors };
}

Deno.serve(async (req) => {
  const __qsCheck = rejectQuerySecrets(req); if (__qsCheck.rejected) return __qsCheck.response!;
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const routerCheck = requireRouterOrigin(req);
  if (!routerCheck.allowed) return routerCheck.response!;
  const auth = await requireAuthenticatedUser(req);
  if (!auth.authorized) return auth.response!;

  if (auth.userId !== "service_role") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminCheck = createClient(supabaseUrl, supabaseKey);
    const { data: profile } = await adminCheck
      .from("profiles")
      .select("role")
      .eq("id", auth.userId!)
      .maybeSingle();
    if (profile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Admin role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

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
  const mode = body?.mode ?? "incremental";
  const startedAt = new Date().toISOString();

  const { data: logRow } = await cFromEdge(supabase, "search_sync_log")
    .insert({
      sync_type: mode,
      status: "running",
      started_at: startedAt,
    })
    .select("id")
    .single();

  const logId = logRow?.id;

  try {
    let queueResult = { processed: 0, errors: 0 };
    let incrementalResult = { results: {} as Record<string, unknown>, totalDocuments: 0, errors: 0 };

    queueResult = await processQueue(supabase, 500);

    if (mode === "incremental") {
      const { data: lastSync } = await supabase
        .from("search_sync_log")
        .select("completed_at")
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const sinceTimestamp = lastSync?.completed_at
        ?? new Date(Date.now() - 20 * 60 * 1000).toISOString();

      incrementalResult = await incrementalSync(supabase, sinceTimestamp);
    } else if (mode === "full") {
      const sinceTimestamp = new Date(0).toISOString();
      incrementalResult = await incrementalSync(supabase, sinceTimestamp);
    }

    const completedAt = new Date().toISOString();
    const totalErrors = queueResult.errors + incrementalResult.errors;
    const totalDocs = incrementalResult.totalDocuments + queueResult.processed;

    if (logId) {
      await cFromEdge(supabase, "search_sync_log")
        .update({
          status: totalErrors > 0 ? "completed_with_errors" : "completed",
          indexes_synced: Object.keys(incrementalResult.results),
          total_documents: totalDocs,
          queue_processed: queueResult.processed,
          errors: totalErrors,
          completed_at: completedAt,
          duration_ms: Date.now() - new Date(startedAt).getTime(),
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({
        mode,
        queue: queueResult,
        incremental: incrementalResult.results,
        totalDocuments: totalDocs,
        errors: totalErrors,
        timestamp: completedAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sync-meilisearch-cron] Fatal error:", msg);

    if (logId) {
      await cFromEdge(supabase, "search_sync_log")
        .update({
          status: "failed",
          error_message: msg,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - new Date(startedAt).getTime(),
        })
        .eq("id", logId);
    }

    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
