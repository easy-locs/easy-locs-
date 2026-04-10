/**
 * Auto-Enricher — Fills missing fields on a CanonicalEntity.
 * Covers: photos, hours, coordinates, descriptions, SEO, catalog.
 */
import type { CanonicalEntity } from "../types";
import { generateSlug, generateSeoTitle, generateSeoDescription } from "./seo-enricher";

export interface EnrichmentAction {
  field: string;
  action: "filled" | "improved" | "skipped";
  reason: string;
}

/**
 * Enrich a canonical entity in-place with derived/computed fields.
 * Returns list of enrichment actions taken.
 */
export function autoEnrich(entity: CanonicalEntity): EnrichmentAction[] {
  const actions: EnrichmentAction[] = [];

  // Slug
  if (!entity.slug && entity.canonicalName) {
    entity.slug = generateSlug(entity.canonicalName, entity.city);
    actions.push({ field: "slug", action: "filled", reason: "derived from name+city" });
  }

  // SEO Title
  if (!entity.seoTitle && entity.canonicalName) {
    entity.seoTitle = generateSeoTitle(entity.canonicalName, entity.taxonomy);
    actions.push({ field: "seoTitle", action: "filled", reason: "auto-generated" });
  }

  // SEO Description
  if (!entity.seoDescription && entity.canonicalName) {
    entity.seoDescription = generateSeoDescription(entity.canonicalName, entity.taxonomy, entity.city);
    actions.push({ field: "seoDescription", action: "filled", reason: "auto-generated" });
  }

  // Logo from first photo
  if (!entity.logoUrl && entity.photos.length > 0) {
    entity.logoUrl = entity.photos[0];
    actions.push({ field: "logoUrl", action: "filled", reason: "first photo used as logo" });
  }

  // Description from taxonomy
  if (!entity.description && entity.canonicalName && entity.taxonomy.category) {
    const cat = entity.taxonomy.category.replace(/_/g, " ");
    entity.description = `${entity.canonicalName} — ${cat}${entity.city ? ` in ${entity.city}` : ""}.`;
    actions.push({ field: "description", action: "filled", reason: "generated from taxonomy" });
  }

  // Update missing fields list
  const requiredFields = ["canonicalName", "address", "lat", "lng"] as const;
  entity.missingFields = requiredFields.filter(f => entity[f] == null || entity[f] === "").map(String);

  return actions;
}
