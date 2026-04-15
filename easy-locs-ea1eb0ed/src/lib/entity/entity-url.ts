/**
 * ENTITY URL — Canonical slug-based routing for all public navigation.
 * =====================================================================
 * Rule: Public routes ALWAYS use /s/{slug}.
 *       entity_id is INTERNAL only (API, DB, QR payloads, wallet).
 *       Fallback to /s/{id} only when slug is missing.
 *
 * SEO-friendly food URLs use /food/r/{cuisine}/{slug} when subcategory is known.
 */

/** Build canonical public URL for any entity. */
export function entityUrl(entity: { slug?: string | null; id: string }): string {
  return entity.slug ? `/s/${entity.slug}` : `/s/${entity.id}`;
}

/** Build entity URL from raw slug or id string. */
export function entityUrlFromSlug(slugOrId: string): string {
  return `/s/${slugOrId}`;
}

/** Normalize cuisine slug for consistent URL generation. */
export function normalizeCuisineSlug(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_-]/g, "");
}

/** Build SEO-friendly food entity URL. */
export function foodEntityUrl(cuisine: string, slugOrId: string): string {
  return `/food/r/${encodeURIComponent(normalizeCuisineSlug(cuisine))}/${encodeURIComponent(slugOrId)}`;
}

/**
 * Extract slug/id from a path like "/s/some-slug" or "/food/r/{cuisine}/{slug}".
 * Returns the slug portion.
 */
export function extractSlugFromPath(path: string): string | null {
  const sMatch = path.match(/^\/s\/(.+)$/);
  if (sMatch) return sMatch[1];
  const foodMatch = path.match(/^\/food\/r\/[^/]+\/(.+)$/);
  if (foodMatch) return foodMatch[1];
  return null;
}
