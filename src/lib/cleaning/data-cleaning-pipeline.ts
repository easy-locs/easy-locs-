/**
 * Data Cleaning Pipeline — Processes ALL existing shops.
 * Modular steps: dedup → taxonomy → images → catalog → source → audit → visibility → routing.
 * SAFETY: Never deletes — only hides or merges.
 */
import { supabase } from "@/integrations/supabase/client";
import { canonicalTaxonomyPayload } from "@/lib/taxonomy/taxonomy-guard";
import { auditShop } from "@/lib/audit/shop-audit";
import { getTaxonomyFallbackCover } from "@/lib/image/dual-layer-image";
import { batchSafeAutoWrite } from "@/lib/engines/override-write-gate";

export interface CleaningResult {
  totalProcessed: number;
  duplicatesFound: number;
  duplicatesHidden: number;
  taxonomyFixed: number;
  coversFixed: number;
  catalogFixed: number;
  sourceFixed: number;
  auditRecalculated: number;
  visibilityFixed: number;
  routesFixed: number;
  displayIssuesFixed: number;
  errors: string[];
}

type ProgressFn = (step: string, done: number, total: number) => void;

// ══════════════════════════════════════════
//  STEP A: Dedupe Shops
// ══════════════════════════════════════════
interface DuplicateGroup {
  key: string; bestId: string; duplicateIds: string[];
}

function findDuplicates(shops: any[]): DuplicateGroup[] {
  const groups: Record<string, any[]> = {};
  for (const shop of shops) {
    if (shop.name && shop.city) {
      const key = `name:${shop.name.toLowerCase().trim()}|city:${shop.city.toLowerCase().trim()}`;
      (groups[key] ??= []).push(shop);
    }
    if (shop.phone || shop.contact_phone) {
      const phone = (shop.phone || shop.contact_phone).replace(/\D/g, "");
      if (phone.length >= 7) { (groups[`phone:${phone}`] ??= []).push(shop); }
    }
    if (shop.source_external_id) {
      (groups[`ext:${shop.source_external_id}`] ??= []).push(shop);
    }
  }

  const result: DuplicateGroup[] = [];
  const seen = new Set<string>();
  for (const [key, group] of Object.entries(groups)) {
    if (group.length < 2) continue;
    const uniqueIds = [...new Set(group.map((s: any) => s.id))];
    if (uniqueIds.length < 2) continue;
    const gk = uniqueIds.sort().join(",");
    if (seen.has(gk)) continue;
    seen.add(gk);

    const sorted = [...group].sort((a, b) => {
      if (a.is_claimed && !b.is_claimed) return -1;
      if (!a.is_claimed && b.is_claimed) return 1;
      if ((b.audit_score ?? 0) !== (a.audit_score ?? 0)) return (b.audit_score ?? 0) - (a.audit_score ?? 0);
      return (b.products_count ?? 0) - (a.products_count ?? 0);
    });
    result.push({ key, bestId: sorted[0].id, duplicateIds: sorted.slice(1).map((s: any) => s.id) });
  }
  return result;
}

export async function dedupeShops(shops: any[], result: CleaningResult, onProgress?: ProgressFn) {
  onProgress?.("Detecting duplicates...", 0, shops.length);
  const groups = findDuplicates(shops);
  result.duplicatesFound = groups.reduce((n, g) => n + g.duplicateIds.length, 0);

  for (const group of groups) {
    for (const dupId of group.duplicateIds) {
      try {
        await batchSafeAutoWrite(dupId, {
          readiness_status: "draft",
          visibility_mode: "hidden",
          blocking_reason: "duplicate",
        }, "dedup_engine");
        result.duplicatesHidden++;
      } catch (e: any) { result.errors.push(`Dedup error ${dupId}: ${e.message}`); }
    }
  }
}

// ══════════════════════════════════════════
//  STEP B: Normalize Taxonomy
// ══════════════════════════════════════════
export function normalizeTaxonomy(shop: any): Record<string, any> | null {
  if (!shop.vertical && !shop.cluster && !shop.subcategory) return null;
  const tax = canonicalTaxonomyPayload(shop.vertical, shop.cluster, shop.subcategory);
  const updates: Record<string, any> = {};
  if (tax.vertical !== shop.vertical) updates.vertical = tax.vertical;
  if (tax.cluster && tax.cluster !== shop.cluster) updates.cluster = tax.cluster;
  if (tax.subcategory !== shop.subcategory) updates.subcategory = tax.subcategory || null;
  return Object.keys(updates).length > 0 ? updates : null;
}

// ══════════════════════════════════════════
//  STEP C: Fix Images (duplicates + missing)
// ══════════════════════════════════════════
export function fixImages(shops: any[]): Map<string, string> {
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
    for (let i = 1; i < ids.length; i++) {
      const dupShop = shops.find((s: any) => s.id === ids[i]);
      if (dupShop) {
        const newCover = getTaxonomyFallbackCover(dupShop);
        if (newCover !== url) fixes.set(ids[i], newCover);
      }
    }
  }
  return fixes;
}

// ══════════════════════════════════════════
//  STEP D: Fix Missing Data
// ══════════════════════════════════════════
export function fixMissingData(shop: any): Record<string, any> | null {
  const updates: Record<string, any> = {};
  if (!shop.slug && shop.name) {
    const base = shop.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
    updates.slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  if (!shop.cover_owner_url && !shop.cover_auto_url && !shop.cover_url && !shop.banner_url && !shop.cover_image) {
    updates.cover_auto_url = getTaxonomyFallbackCover(shop);
    updates.cover_source = "system";
  }
  if (!shop.source_type) updates.source_type = shop.is_auto_generated ? "import_ai" : "manual";
  if (shop.source_confidence == null) {
    updates.source_confidence = shop.source_type === "onboarding" ? 100 : shop.source_type === "google" ? 40 : 60;
  }
  return Object.keys(updates).length > 0 ? updates : null;
}

// ══════════════════════════════════════════
//  STEP E: Visibility Mode
// ══════════════════════════════════════════
export type VisibilityMode = "hidden" | "map_only" | "search_only" | "coming_soon" | "ready" | "live";

export function computeVisibilityMode(shop: any, auditResult: any): VisibilityMode {
  const blockers = auditResult.blockers || [];
  const score = auditResult.score ?? 0;
  if (shop.visibility_mode === "hidden" || shop.readiness_status === "blocked") return "hidden";
  if (shop.is_claimed && blockers.length === 0 && score >= 70 && auditResult.isPublishable) return "live";
  if (blockers.length === 0 && score >= 50 && auditResult.isPublishable) return "ready";
  if (shop.name && shop.city && score >= 30) return "coming_soon";
  if (shop.name && score >= 15) return "search_only";
  if (shop.latitude || shop.longitude) return "map_only";
  return "hidden";
}

// ══════════════════════════════════════════
//  STEP F: Display Priority (Ranking)
// ══════════════════════════════════════════
export function computeDisplayPriority(shop: any, auditResult: any): number {
  let p = 0;
  if (shop.is_claimed) p += 25;
  p += Math.min((auditResult.score ?? 0) * 0.4, 40);
  if (shop.cover_owner_url) p += 10; else if (shop.cover_auto_url || shop.cover_url) p += 3;
  if (shop.has_menu || (shop.products_count ?? 0) > 0) p += 10;
  if (shop.rating && shop.rating > 0) p += 5;
  if (shop.source_confidence >= 80) p += 5;
  if (shop.source_type === "onboarding") p += 5;
  return Math.min(Math.round(p), 100);
}

// ══════════════════════════════════════════
//  STEP G: Route Validation
// ══════════════════════════════════════════
export function validateRoute(shop: any): "valid" | "broken" | "warning" {
  if (!shop.name) return "broken";
  if (!shop.slug && !shop.id) return "broken";
  if (!shop.city) return "warning";
  return "valid";
}

// ══════════════════════════════════════════
//  STEP H: Blocking Reason
// ══════════════════════════════════════════
export function computeBlockingReason(auditResult: any): string | null {
  if (!auditResult.blockers || auditResult.blockers.length === 0) return null;
  return auditResult.blockers.slice(0, 3).join("; ");
}

// ══════════════════════════════════════════
//  MAIN PIPELINE — runs all steps
// ══════════════════════════════════════════
export async function runFullCleaningPipeline(
  onProgress?: ProgressFn
): Promise<CleaningResult> {
  const result: CleaningResult = {
    totalProcessed: 0, duplicatesFound: 0, duplicatesHidden: 0,
    taxonomyFixed: 0, coversFixed: 0, catalogFixed: 0, sourceFixed: 0,
    auditRecalculated: 0, visibilityFixed: 0, routesFixed: 0,
    displayIssuesFixed: 0, errors: [],
  };

  try {
    onProgress?.("Fetching all shops...", 0, 1);
    const { data: shops, error } = await (supabase as any)
      .from("storefront_pages").select("*")
      .order("created_at", { ascending: false }).limit(1000);

    if (error || !shops) {
      result.errors.push(`Fetch error: ${error?.message || "No data"}`);
      return result;
    }
    result.totalProcessed = shops.length;

    // A: Dedupe
    await dedupeShops(shops, result, onProgress);

    // B-G: Per-shop processing
    const coverFixes = fixImages(shops);

    for (let i = 0; i < shops.length; i++) {
      const shop = shops[i];
      onProgress?.("Processing shops...", i + 1, shops.length);
      const allUpdates: Record<string, any> = {};

      // B: Taxonomy
      const taxFix = normalizeTaxonomy(shop);
      if (taxFix) { Object.assign(allUpdates, taxFix); result.taxonomyFixed++; }

      // C: Cover fixes
      if (coverFixes.has(shop.id)) {
        allUpdates.cover_auto_url = coverFixes.get(shop.id)!;
        allUpdates.cover_source = "system";
        result.coversFixed++;
      }

      // D: Missing data
      const missingFix = fixMissingData(shop);
      if (missingFix) { Object.assign(allUpdates, missingFix); result.sourceFixed++; }

      // Audit recalc
      const mergedShop = { ...shop, ...allUpdates };
      const audit = auditShop(mergedShop);
      allUpdates.audit_score = audit.score;
      allUpdates.readiness_status = audit.status;
      allUpdates.data_freshness_at = new Date().toISOString();
      result.auditRecalculated++;

      // E: Visibility mode
      const vis = computeVisibilityMode(mergedShop, audit);
      if (vis !== shop.visibility_mode) { allUpdates.visibility_mode = vis; result.visibilityFixed++; }

      // F: Display priority
      allUpdates.display_priority = computeDisplayPriority(mergedShop, audit);

      // G: Route
      const rs = validateRoute(mergedShop);
      if (rs !== shop.route_status) { allUpdates.route_status = rs; result.routesFixed++; }

      // H: Blocking reason
      allUpdates.blocking_reason = computeBlockingReason(audit);

      if (Object.keys(allUpdates).length > 0) {
        try {
          await batchSafeAutoWrite(shop.id, allUpdates, "cleaning_pipeline");
        } catch (e: any) { result.errors.push(`Update error ${shop.id}: ${e.message}`); }
      }
    }

    onProgress?.("Done", shops.length, shops.length);
  } catch (e: any) { result.errors.push(`Pipeline error: ${e.message}`); }

  return result;
}
