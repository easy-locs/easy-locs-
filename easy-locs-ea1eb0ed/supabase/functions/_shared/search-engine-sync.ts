import { createClient } from "npm:@supabase/supabase-js@2.57.2";

export interface SearchDocument {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  rating: number | null;
  price: number | null;
  currency: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  slug: string | null;
  is_open: boolean | null;
  vertical: string | null;
  category: string | null;
  updated_at: string;
}

interface MeilisearchConfig {
  host: string;
  apiKey: string;
  indexName: string;
}

function getMeilisearchConfig(): MeilisearchConfig | null {
  const host = Deno.env.get("MEILISEARCH_HOST");
  const apiKey = Deno.env.get("MEILISEARCH_API_KEY");
  if (!host || !apiKey) return null;
  return { host, apiKey, indexName: "unified_search" };
}

export function isMeilisearchAvailable(): boolean {
  return getMeilisearchConfig() !== null;
}

async function meilisearchRequest(
  path: string,
  method: string,
  body?: unknown,
): Promise<Response> {
  const config = getMeilisearchConfig();
  if (!config) throw new Error("Meilisearch not configured");

  return fetch(`${config.host}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function indexDocuments(documents: SearchDocument[]): Promise<{ taskUid: number }> {
  const config = getMeilisearchConfig();
  if (!config) throw new Error("Meilisearch not configured");

  const response = await meilisearchRequest(
    `/indexes/${config.indexName}/documents`,
    "POST",
    documents,
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Meilisearch index error: ${response.status} ${err}`);
  }

  return response.json();
}

export async function searchMeilisearch(
  query: string,
  options: {
    filter?: string[];
    facets?: string[];
    limit?: number;
    offset?: number;
    sort?: string[];
  } = {},
): Promise<{
  hits: SearchDocument[];
  estimatedTotalHits: number;
  processingTimeMs: number;
}> {
  const config = getMeilisearchConfig();
  if (!config) throw new Error("Meilisearch not configured");

  const response = await meilisearchRequest(
    `/indexes/${config.indexName}/search`,
    "POST",
    {
      q: query,
      filter: options.filter,
      facets: options.facets,
      limit: options.limit ?? 20,
      offset: options.offset ?? 0,
      sort: options.sort,
      attributesToRetrieve: [
        "id", "type", "title", "subtitle", "image_url", "rating",
        "price", "currency", "city", "lat", "lng", "slug", "is_open",
        "vertical", "category",
      ],
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Meilisearch search error: ${response.status} ${err}`);
  }

  return response.json();
}

export async function configureMeilisearchIndex(): Promise<void> {
  const config = getMeilisearchConfig();
  if (!config) return;

  await meilisearchRequest(`/indexes`, "POST", {
    uid: config.indexName,
    primaryKey: "id",
  }).catch(() => {});

  await meilisearchRequest(
    `/indexes/${config.indexName}/settings`,
    "PATCH",
    {
      searchableAttributes: ["title", "subtitle", "category", "city", "vertical"],
      filterableAttributes: ["type", "city", "vertical", "category", "rating", "price", "is_open"],
      sortableAttributes: ["rating", "price", "updated_at"],
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
      },
      faceting: { maxValuesPerFacet: 100 },
      pagination: { maxTotalHits: 10000 },
    },
  );
}

export async function syncFromPostgres(
  entityType: "shop" | "product" | "property" | "service" | "profile",
  batchSize = 500,
): Promise<number> {
  if (!isMeilisearchAvailable()) return 0;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let totalSynced = 0;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const documents = await fetchBatch(supabase, entityType, batchSize, offset);
    if (documents.length === 0) {
      hasMore = false;
      break;
    }

    await indexDocuments(documents);
    totalSynced += documents.length;
    offset += batchSize;

    if (documents.length < batchSize) hasMore = false;
  }

  return totalSynced;
}

async function fetchBatch(
  supabase: ReturnType<typeof createClient>,
  entityType: string,
  limit: number,
  offset: number,
): Promise<SearchDocument[]> {
  switch (entityType) {
    case "shop": {
      const { data } = await supabase
        .from("storefront_pages")
        .select("id, name, slug, subcategory, city, logo_url, banner_url, rating, vertical, latitude, longitude, is_open, updated_at")
        .in("visibility_mode", ["public", "listed"])
        .range(offset, offset + limit - 1);
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: `shop:${r.id}`,
        type: "shop",
        title: String(r.name ?? ""),
        subtitle: String(r.subcategory ?? ""),
        image_url: (r.banner_url ?? r.logo_url ?? null) as string | null,
        rating: r.rating as number | null,
        price: null,
        currency: null,
        city: r.city as string | null,
        lat: r.latitude as number | null,
        lng: r.longitude as number | null,
        slug: r.slug as string | null,
        is_open: r.is_open as boolean | null,
        vertical: r.vertical as string | null,
        category: r.subcategory as string | null,
        updated_at: String(r.updated_at ?? new Date().toISOString()),
      }));
    }
    case "product": {
      const { data } = await supabase
        .from("seed_products")
        .select("id, name, price, category, image_url, updated_at")
        .range(offset, offset + limit - 1);
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: `product:${r.id}`,
        type: "product",
        title: String(r.name ?? ""),
        subtitle: String(r.category ?? ""),
        image_url: r.image_url as string | null,
        rating: null,
        price: r.price as number | null,
        currency: "USD",
        city: null,
        lat: null,
        lng: null,
        slug: null,
        is_open: null,
        vertical: null,
        category: r.category as string | null,
        updated_at: String(r.updated_at ?? new Date().toISOString()),
      }));
    }
    case "property": {
      const { data } = await supabase
        .from("properties")
        .select("id, name, address, city, property_type, latitude, longitude, updated_at")
        .range(offset, offset + limit - 1);
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: `property:${r.id}`,
        type: "property",
        title: String(r.name ?? r.address ?? "Property"),
        subtitle: [r.property_type, r.city].filter(Boolean).join(" · "),
        image_url: null,
        rating: null,
        price: null,
        currency: null,
        city: r.city as string | null,
        lat: r.latitude as number | null,
        lng: r.longitude as number | null,
        slug: null,
        is_open: null,
        vertical: null,
        category: r.property_type as string | null,
        updated_at: String(r.updated_at ?? new Date().toISOString()),
      }));
    }
    case "service": {
      const { data } = await supabase
        .from("listings")
        .select("id, title, price, currency, category, city, latitude, longitude, rating, image_url, updated_at")
        .in("status", ["active", "published"])
        .range(offset, offset + limit - 1);
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: `service:${r.id}`,
        type: "service",
        title: String(r.title ?? ""),
        subtitle: [r.category, r.city].filter(Boolean).join(" · "),
        image_url: r.image_url as string | null,
        rating: r.rating as number | null,
        price: r.price as number | null,
        currency: (r.currency ?? "USD") as string,
        city: r.city as string | null,
        lat: r.latitude as number | null,
        lng: r.longitude as number | null,
        slug: null,
        is_open: null,
        vertical: null,
        category: r.category as string | null,
        updated_at: String(r.updated_at ?? new Date().toISOString()),
      }));
    }
    case "profile": {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, city, role, updated_at")
        .range(offset, offset + limit - 1);
      return (data ?? []).map((r: Record<string, unknown>) => ({
        id: `profile:${r.id}`,
        type: "profile",
        title: String(r.full_name ?? "User"),
        subtitle: [r.role, r.city].filter(Boolean).join(" · "),
        image_url: r.avatar_url as string | null,
        rating: null,
        price: null,
        currency: null,
        city: r.city as string | null,
        lat: null,
        lng: null,
        slug: null,
        is_open: null,
        vertical: null,
        category: r.role as string | null,
        updated_at: String(r.updated_at ?? new Date().toISOString()),
      }));
    }
    default:
      return [];
  }
}

export async function deleteDocument(entityType: string, entityId: string): Promise<void> {
  const config = getMeilisearchConfig();
  if (!config) return;
  const docId = `${entityType}:${entityId}`;
  await meilisearchRequest(
    `/indexes/${config.indexName}/documents/${encodeURIComponent(docId)}`,
    "DELETE",
  );
}

export async function getMeilisearchHealth(): Promise<{ status: string; version?: string } | null> {
  try {
    const response = await meilisearchRequest("/health", "GET");
    if (response.ok) return response.json();
    return null;
  } catch {
    return null;
  }
}
