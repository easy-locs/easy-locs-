/**
 * ENTITY URL — Canonical slug-based routing for all public navigation.
 * =====================================================================
 * Rule: Public routes ALWAYS use /s/{slug}.
 *       entity_id is INTERNAL only (API, DB, QR payloads, wallet).
 *       Fallback to /s/{id} only when slug is missing.
 */

/** Build canonical public URL for any entity. */
export function entityUrl(entity: { slug?: string | null; id: string }): string {
  return entity.slug ? `/s/${entity.slug}` : `/s/${entity.id}`;
}

/** Build entity URL from raw slug or id string. */
export function entityUrlFromSlug(slugOrId: string): string {
  return `/s/${slugOrId}`;
}

/**
 * Extract slug/id from a path like "/s/some-slug".
 * Returns the slug portion.
 */
export function extractSlugFromPath(path: string): string | null {
  const match = path.match(/^\/s\/(.+)$/);
  return match?.[1] ?? null;
}
