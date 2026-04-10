/**
 * SEO Enricher — Auto-generates slug, SEO title, SEO description.
 */
import type { TaxonomyNode } from "../types";

export function generateSlug(name: string | null, city: string | null): string | null {
  if (!name) return null;
  const parts = [name, city].filter(Boolean).join(" ");
  return parts
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function generateSeoTitle(name: string | null, taxonomy: TaxonomyNode): string | null {
  if (!name) return null;
  const suffix = taxonomy.subcategory !== "general" ? ` - ${capitalize(taxonomy.subcategory)}` : "";
  return `${name}${suffix}`.slice(0, 60);
}

export function generateSeoDescription(
  name: string | null,
  taxonomy: TaxonomyNode,
  city: string | null,
): string | null {
  if (!name) return null;
  const cat = capitalize(taxonomy.category);
  const loc = city ? ` in ${city}` : "";
  return `Discover ${name}, ${cat}${loc}. View menu, photos, reviews and more.`.slice(0, 160);
}

function capitalize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
