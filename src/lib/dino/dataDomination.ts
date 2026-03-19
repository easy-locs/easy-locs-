/**
 * DINO V11 — Data Domination Engine
 * Scrape → Normalize → Import → Activate → Dominate
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// =============================
// TYPES
// =============================

export interface ExternalListing {
  name: string;
  category: string;
  city: string;
  country: string;
  address?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  photos?: string[];
  source: "google" | "deliveroo" | "manual" | "import";
}

export interface NormalizedListing {
  id: string;
  name: string;
  category: string;
  city: string;
  country: string;
  qualityScore: number;
  completeness: number;
  photos: string[];
  source: string;
}

// =============================
// 1) NORMALIZATION ENGINE
// =============================

export function normalizeListings(data: ExternalListing[]): NormalizedListing[] {
  return data.map(item => {
    const completeness =
      (item.phone ? 0.2 : 0) +
      (item.photos?.length ? 0.2 : 0) +
      (item.rating ? 0.3 : 0) +
      (item.reviewCount ? 0.3 : 0);
    const qualityScore = Math.round((item.rating ?? 3) * 20 + completeness * 20);

    return {
      id: crypto.randomUUID(),
      name: item.name,
      category: item.category,
      city: item.city,
      country: item.country,
      qualityScore,
      completeness,
      photos: item.photos ?? [],
      source: item.source,
    };
  });
}

// =============================
// 2) DUPLICATE FILTER
// =============================

export function removeDuplicates(listings: NormalizedListing[]): NormalizedListing[] {
  const seen = new Set<string>();
  return listings.filter(l => {
    const key = `${l.name.toLowerCase()}-${l.city}-${l.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// =============================
// 3) IMPORT INTO SYSTEM
// =============================

export async function importListings(listings: NormalizedListing[]): Promise<number> {
  let imported = 0;
  for (const l of listings) {
    const { error } = await supabase.from("dino_draft_profiles").insert({
      name: l.name,
      category: l.category,
      city: l.city,
      country: l.country,
      source: l.source,
      status: "draft",
      completeness: l.completeness,
      profile_data: { qualityScore: l.qualityScore, photos: l.photos } as unknown as Json,
    });
    if (!error) imported++;
  }
  return imported;
}

// =============================
// 4) ACTIVATION MESSAGES
// =============================

export function generateActivationMessages(listings: NormalizedListing[]) {
  return listings.map(l => ({
    name: l.name,
    message: `Your business "${l.name}" is now visible on Easy Locs. Activate your profile to receive customers.`,
    priority: l.qualityScore > 80 ? ("high" as const) : ("medium" as const),
  }));
}

// =============================
// 5) AUTO BOOST
// =============================

export function autoBoostTopListings(listings: NormalizedListing[]) {
  return listings
    .filter(l => l.qualityScore > 75)
    .map(l => ({ listingId: l.id, boostLevel: "high" as const }));
}

// =============================
// 6) FULL PIPELINE
// =============================

export async function runV11Import(externalData: ExternalListing[]) {
  const normalized = normalizeListings(externalData);
  const clean = removeDuplicates(normalized);
  const importedCount = await importListings(clean);
  const messages = generateActivationMessages(clean);
  const boosts = autoBoostTopListings(clean);

  // Record learning
  await supabase.from("dino_learning_events").insert([{
    event_type: "v11_import_cycle",
    entity_id: "batch",
    entity_type: "import",
    metric: "imported_count",
    metadata_json: { total: externalData.length, clean: clean.length, boosted: boosts.length } as unknown as Json,
    new_value: importedCount,
    previous_value: 0,
  }]);

  return { imported: importedCount, messages, boosts };
}
