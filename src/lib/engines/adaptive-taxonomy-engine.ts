/**
 * ADAPTIVE TAXONOMY & CANONICAL EXPANSION ENGINE
 * Detects taxonomy gaps, maps entities to canonical categories, expands taxonomy intelligently.
 * Layers: Canonical Matching → Gap Detection → Candidate Generation → Expansion Rules → Alias Merge.
 */

import { supabase } from "@/integrations/supabase/client";
import { normalizeVertical, normalizeSubcategory, getCanonicalVertical } from "@/lib/taxonomy/world-class-taxonomy";

export interface TaxonomyGapCandidate {
  proposedName: string;
  proposedSlug: string;
  sourceVertical: string;
  sourceKeywords: string[];
  entityCount: number;
  confidenceScore: number;
  status: "pending" | "approved" | "rejected" | "merged";
}

export interface TaxonomyEngineOutput {
  entitiesAnalyzed: number;
  alreadyMapped: number;
  newlyMapped: number;
  gapCandidates: TaxonomyGapCandidate[];
  unmappable: number;
  computedAt: string;
}

// Keyword → subcategory mapping for fuzzy matching
const KEYWORD_MAP: Record<string, string> = {
  maki: "sushi", nigiri: "sushi", sashimi: "sushi", roll: "sushi",
  pepperoni: "pizza", margherita: "pizza", calzone: "pizza",
  patty: "burger", cheeseburger: "burger", bun: "burger",
  wrap: "shawarma", falafel: "lebanese", hummus: "lebanese", tabbouleh: "lebanese",
  croissant: "bakery", bread: "bakery", pastry: "bakery", cake: "bakery",
  espresso: "cafe", latte: "cafe", cappuccino: "cafe", americano: "cafe",
  biryani: "indian", tikka: "indian", naan: "indian", curry: "indian",
  pad_thai: "thai", tom_yum: "thai", dim_sum: "chinese", wonton: "chinese",
  smoothie: "healthy", acai: "healthy", salad: "healthy", bowl: "healthy",
  gelato: "desserts", ice_cream: "desserts", tiramisu: "desserts", cheesecake: "desserts",
  steak: "steakhouse", ribeye: "steakhouse", filet: "steakhouse",
  lobster: "seafood", shrimp: "seafood", salmon: "seafood", fish: "seafood",
};

function detectSubcategoryFromContent(name: string, menuItems: string[]): { sub: string | null; confidence: number; keywords: string[] } {
  const allText = [name, ...menuItems].join(" ").toLowerCase();
  const matchCounts: Record<string, number> = {};
  const matchedKeywords: string[] = [];

  for (const [keyword, sub] of Object.entries(KEYWORD_MAP)) {
    if (allText.includes(keyword)) {
      matchCounts[sub] = (matchCounts[sub] || 0) + 1;
      matchedKeywords.push(keyword);
    }
  }

  if (Object.keys(matchCounts).length === 0) return { sub: null, confidence: 0, keywords: [] };

  const sorted = Object.entries(matchCounts).sort(([, a], [, b]) => b - a);
  const topSub = sorted[0][0];
  const topCount = sorted[0][1];
  const confidence = Math.min(100, topCount * 20);

  return { sub: topSub, confidence, keywords: matchedKeywords };
}

export async function runAdaptiveTaxonomyEngine(limit = 50): Promise<TaxonomyEngineOutput> {
  const gapCandidates: TaxonomyGapCandidate[] = [];
  let alreadyMapped = 0, newlyMapped = 0, unmappable = 0;

  try {
    // Get entities with weak or missing taxonomy
    const { data: merchants } = await (supabase as any)
      .from("seed_merchants")
      .select("id, name, vertical, subcategory, menu_items_json, tags")
      .or("subcategory.is.null,subcategory.eq.general,subcategory.eq.")
      .limit(limit);

    if (!merchants?.length) {
      return { entitiesAnalyzed: 0, alreadyMapped: 0, newlyMapped: 0, gapCandidates: [], unmappable: 0, computedAt: new Date().toISOString() };
    }

    for (const m of merchants) {
      // Skip if already well-mapped
      if (m.subcategory && m.subcategory !== "general" && m.subcategory !== "") {
        alreadyMapped++;
        continue;
      }

      const vertical = normalizeVertical(m.vertical);
      const menuItems = Array.isArray(m.menu_items_json)
        ? m.menu_items_json.map((i: any) => i?.name || "").filter(Boolean)
        : [];

      // Layer 1: Canonical matching
      const detection = detectSubcategoryFromContent(m.name || "", menuItems);

      if (detection.sub && detection.confidence >= 40) {
        // Verify subcategory exists in canonical taxonomy
        const normalized = normalizeSubcategory(detection.sub);
        if (normalized) {
          // Update entity with detected subcategory
          await (supabase as any)
            .from("seed_merchants")
            .update({ subcategory: normalized })
            .eq("id", m.id);
          newlyMapped++;
          continue;
        }
      }

      // Layer 2: Gap detection — track unmapped patterns
      if (detection.keywords.length > 0 && !detection.sub) {
        gapCandidates.push({
          proposedName: detection.keywords[0],
          proposedSlug: detection.keywords[0].replace(/\s+/g, "_"),
          sourceVertical: vertical,
          sourceKeywords: detection.keywords,
          entityCount: 1,
          confidenceScore: detection.confidence,
          status: "pending",
        });
      } else {
        unmappable++;
      }
    }

    // Merge duplicate gap candidates
    const merged: Record<string, TaxonomyGapCandidate> = {};
    for (const gap of gapCandidates) {
      if (merged[gap.proposedSlug]) {
        merged[gap.proposedSlug].entityCount++;
        merged[gap.proposedSlug].confidenceScore = Math.max(merged[gap.proposedSlug].confidenceScore, gap.confidenceScore);
      } else {
        merged[gap.proposedSlug] = { ...gap };
      }
    }

    return {
      entitiesAnalyzed: merchants.length,
      alreadyMapped,
      newlyMapped,
      gapCandidates: Object.values(merged).filter(g => g.entityCount >= 2), // Volume threshold
      unmappable,
      computedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("[adaptive-taxonomy] Error:", err);
    return { entitiesAnalyzed: 0, alreadyMapped: 0, newlyMapped: 0, gapCandidates: [], unmappable: 0, computedAt: new Date().toISOString() };
  }
}
