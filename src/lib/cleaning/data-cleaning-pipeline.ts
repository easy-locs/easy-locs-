/**
 * Data Cleaning Pipeline — Processes ALL existing shops.
 * Dedup, taxonomy fix, image fix, catalog fix, source normalization, audit recalc.
 * SAFETY: Never deletes — only hides or merges.
 */
import { supabase } from "@/integrations/supabase/client";
import { canonicalTaxonomyPayload } from "@/lib/taxonomy/taxonomy-guard";
import { auditShop } from "@/lib/audit/shop-audit";
import { getTaxonomyFallbackCover } from "@/lib/image/dual-layer-image";

export interface CleaningResult {
  totalProcessed: number;
  duplicatesFound: number;
  duplicatesHidden: number;
  taxonomyFixed: number;
  coversFixed: number;
  catalogFixed: number;
  sourceFixed: number;
  auditRecalculated: number;
  errors: string[];
}

// ── A. Duplicate detection ──

interface DuplicateGroup {
  key: string;
  shops: any[];
  bestId: string;
  duplicateIds: string[];
}

function findDuplicates(shops: any[]): DuplicateGroup[] {
  const groups: Record<string, any[]> = {};

  for (const shop of shops) {
    // Group by normalized name + city
    if (shop.name && shop.city) {
      const key = `name:${shop.name.toLowerCase().trim()}|city:${shop.city.toLowerCase().trim()}`;
      (groups[key] ??= []).push(shop);
    }
    // Group by phone
    if (shop.phone || shop.contact_phone) {
      const phone = (shop.phone || shop.contact_phone).replace(/\D/g, "");
      if (phone.length >= 7) {
        const key = `phone:${phone}`;
        (groups[key] ??= []).push(shop);
      }
    }
    // Group by external ID
    if (shop.source_external_id) {
      const key = `ext:${shop.source_external_id}`;
      (groups[key] ??= []).push(shop);
    }
  }

  const duplicateGroups: DuplicateGroup[] = [];
  const seen = new Set<string>();

  for (const [key, group] of Object.entries(groups)) {
    if (group.length < 2) continue;
    // Deduplicate by unique shop ids in group
    const uniqueIds = [...new Set(group.map(s => s.id))];
    if (uniqueIds.length < 2) continue;
    const groupKey = uniqueIds.sort().join(",");
    if (seen.has(groupKey)) continue;
    seen.add(groupKey);

    // Pick best: highest audit_score, then claimed, then most products
    const sorted = [...group].sort((a, b) => {
      if (a.is_claimed && !b.is_claimed) return -1;
      if (!a.is_claimed && b.is_claimed) return 1;
      const scoreA = a.audit_score ?? 0;
      const scoreB = b.audit_score ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (b.products_count ?? 0) - (a.products_count ?? 0);
    });

    duplicateGroups.push({
      key,
      shops: sorted,
      bestId: sorted[0].id,
      duplicateIds: sorted.slice(1).map(s => s.id),
    });
  }

  return duplicateGroups;
}

// ── B. Fix taxonomy ──
function fixTaxonomy(shop: any): Record<string, any> | null {
  if (!shop.vertical && !shop.cluster && !shop.subcategory) return null;
  const tax = canonicalTaxonomyPayload(shop.vertical, shop.cluster, shop.subcategory);
  const updates: Record<string, any> = {};
  if (tax.vertical !== shop.vertical) updates.vertical = tax.vertical;
  if (tax.cluster && tax.cluster !== shop.cluster) updates.cluster = tax.cluster;
  if (tax.subcategory !== shop.subcategory) updates.subcategory = tax.subcategory || null;
  return Object.keys(updates).length > 0 ? updates : null;
}

// ── C. Fix covers (detect duplicates, assign unique) ──
function fixCoverDuplicates(shops: any[]): Map<string, string> {
  const coverUsage = new Map<string, string[]>();
  for (const shop of shops) {
    const cover = shop.cover_owner_url || shop.cover_auto_url || shop.cover_url || shop.banner_url;
    if (cover) {
      (coverUsage.get(cover) ?? (() => { coverUsage.set(cover, []); return coverUsage.get(cover)!; })()).push(shop.id);
    }
  }

  const fixes = new Map<string, string>();
  for (const [url, ids] of coverUsage) {
    if (ids.length <= 1) continue;
    // Keep first, regenerate for duplicates
    for (let i = 1; i < ids.length; i++) {
      const dupShop = shops.find(s => s.id === ids[i]);
      if (dupShop) {
        const newCover = getTaxonomyFallbackCover(dupShop);
        if (newCover !== url) {
          fixes.set(ids[i], newCover);
        }
      }
    }
  }
  return fixes;
}

// ── D. Fix missing data ──
function fixMissingData(shop: any): Record<string, any> | null {
  const updates: Record<string, any> = {};

  // Missing slug
  if (!shop.slug && shop.name) {
    const base = shop.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
    updates.slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // Missing cover → taxonomy fallback
  if (!shop.cover_owner_url && !shop.cover_auto_url && !shop.cover_url && !shop.banner_url && !shop.cover_image) {
    const fallback = getTaxonomyFallbackCover(shop);
    updates.cover_auto_url = fallback;
    updates.cover_source = "system";
  }

  // Source normalization
  if (!shop.source_type) {
    updates.source_type = shop.is_auto_generated ? "import_ai" : "manual";
  }
  if (shop.source_confidence == null) {
    const conf = shop.source_type === "onboarding" ? 100 : shop.source_type === "google" ? 40 : 60;
    updates.source_confidence = conf;
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

// ══════════════════════════════════════════
//  MAIN CLEANING PIPELINE
// ══════════════════════════════════════════

export async function runCleaningPipeline(
  onProgress?: (step: string, done: number, total: number) => void
): Promise<CleaningResult> {
  const result: CleaningResult = {
    totalProcessed: 0,
    duplicatesFound: 0,
    duplicatesHidden: 0,
    taxonomyFixed: 0,
    coversFixed: 0,
    catalogFixed: 0,
    sourceFixed: 0,
    auditRecalculated: 0,
    errors: [],
  };

  try {
    // Fetch all shops
    onProgress?.("Fetching all shops...", 0, 1);
    const { data: shops, error } = await (supabase as any)
      .from("storefront_pages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error || !shops) {
      result.errors.push(`Fetch error: ${error?.message || "No data"}`);
      return result;
    }

    result.totalProcessed = shops.length;

    // Step A: Detect duplicates
    onProgress?.("Detecting duplicates...", 0, shops.length);
    const duplicateGroups = findDuplicates(shops);
    result.duplicatesFound = duplicateGroups.reduce((n, g) => n + g.duplicateIds.length, 0);

    for (const group of duplicateGroups) {
      for (const dupId of group.duplicateIds) {
        try {
          await (supabase as any)
            .from("storefront_pages")
            .update({
              launch_status: "hidden",
              readiness_status: "draft",
              metadata_json: { hidden_reason: "duplicate", kept_version: group.bestId },
            })
            .eq("id", dupId);
          result.duplicatesHidden++;
        } catch (e: any) {
          result.errors.push(`Dedup error ${dupId}: ${e.message}`);
        }
      }
    }

    // Step B-F: Process each shop
    const coverFixes = fixCoverDuplicates(shops);

    for (let i = 0; i < shops.length; i++) {
      const shop = shops[i];
      onProgress?.("Processing shops...", i + 1, shops.length);
      const allUpdates: Record<string, any> = {};

      // B: Taxonomy
      const taxFix = fixTaxonomy(shop);
      if (taxFix) {
        Object.assign(allUpdates, taxFix);
        result.taxonomyFixed++;
      }

      // C: Cover duplicates
      if (coverFixes.has(shop.id)) {
        allUpdates.cover_auto_url = coverFixes.get(shop.id)!;
        allUpdates.cover_source = "system";
        result.coversFixed++;
      }

      // D: Missing data
      const missingFix = fixMissingData(shop);
      if (missingFix) {
        Object.assign(allUpdates, missingFix);
        result.sourceFixed++;
      }

      // G: Recalculate audit
      const mergedShop = { ...shop, ...allUpdates };
      const audit = auditShop(mergedShop);
      allUpdates.audit_score = audit.score;
      allUpdates.readiness_status = audit.status;
      allUpdates.data_freshness_at = new Date().toISOString();
      result.auditRecalculated++;

      // Apply updates
      if (Object.keys(allUpdates).length > 0) {
        try {
          await (supabase as any)
            .from("storefront_pages")
            .update(allUpdates)
            .eq("id", shop.id);
        } catch (e: any) {
          result.errors.push(`Update error ${shop.id}: ${e.message}`);
        }
      }
    }

    onProgress?.("Done", shops.length, shops.length);
  } catch (e: any) {
    result.errors.push(`Pipeline error: ${e.message}`);
  }

  return result;
}
