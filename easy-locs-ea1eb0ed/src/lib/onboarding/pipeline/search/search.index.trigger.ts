/**
 * search.index.trigger — Triggers search index update and map marker creation
 * after storefront persistence. Makes new shops immediately discoverable.
 */

export interface SearchIndexPayload {
  storefrontId: string;
  slug: string;
  name: string;
  vertical: string;
  subcategory?: string | null;
  city?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  description?: string | null;
  tags?: string[];
}

export interface SearchIndexResult {
  searchIndexed: boolean;
  mapMarkerCreated: boolean;
  errors: string[];
}

/**
 * Triggers search index update via Supabase function or direct upsert.
 * Non-blocking soft-fail — errors are logged but don't break the pipeline.
 */
export async function triggerSearchIndex(
  payload: SearchIndexPayload,
): Promise<SearchIndexResult> {
  const errors: string[] = [];
  let searchIndexed = false;
  let mapMarkerCreated = false;

  try {
    const { db } = await import("@/services/db");

    const { error: searchError } = await db
      .from("search_index")
      .upsert(
        {
          storefront_id: payload.storefrontId,
          slug: payload.slug,
          name: payload.name,
          vertical: payload.vertical,
          subcategory: payload.subcategory ?? null,
          city: payload.city ?? null,
          country: payload.country ?? null,
          description: payload.description ?? null,
          tags: payload.tags ?? [],
          indexed_at: new Date().toISOString(),
        },
        { onConflict: "storefront_id" },
      );

    if (searchError) {
      errors.push(`search_index upsert: ${searchError.message}`);
    } else {
      searchIndexed = true;
    }
  } catch (e: unknown) {
    errors.push(`search_index error: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (payload.lat != null && payload.lng != null) {
    try {
      const { db } = await import("@/services/db");

      const { error: mapError } = await db
        .from("map_markers")
        .upsert(
          {
            storefront_id: payload.storefrontId,
            slug: payload.slug,
            name: payload.name,
            vertical: payload.vertical,
            lat: payload.lat,
            lng: payload.lng,
            city: payload.city ?? null,
            country: payload.country ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "storefront_id" },
        );

      if (mapError) {
        errors.push(`map_markers upsert: ${mapError.message}`);
      } else {
        mapMarkerCreated = true;
      }
    } catch (e: unknown) {
      errors.push(`map_markers error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (errors.length > 0) {
    console.warn("[search.index.trigger] soft errors:", errors);
  }

  return { searchIndexed, mapMarkerCreated, errors };
}
