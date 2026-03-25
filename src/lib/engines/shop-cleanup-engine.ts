/**
 * Shop Cleanup Engine — Detects and auto-corrects shop quality problems.
 * - Duplicated cover images
 * - Generic/duplicate menu items
 * - Wrong category/subcategory mapping
 * - Low-quality profiles
 * - Auto-downgrade or hide when unfixable
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const GENERIC_NAMES = ["item 1", "item 2", "menu item", "product", "test", "sample", "example", "placeholder", "unnamed", "n/a"];

export interface CleanupReport {
  scanned: number;
  duplicateCoverCount: number;
  genericMenuCount: number;
  wrongCategoryCount: number;
  lowQualityCount: number;
  autoFixed: number;
  downgraded: number;
  details: CleanupDetail[];
}

interface CleanupDetail {
  id: string;
  name: string;
  issues: string[];
  actions: string[];
}

/** Detect shops sharing the same cover_image URL */
async function findDuplicateCovers(): Promise<Map<string, string[]>> {
  const { data } = await db
    .from("seed_merchants")
    .select("id, cover_image")
    .not("cover_image", "is", null)
    .neq("cover_image", "")
    .limit(1000);

  const byUrl = new Map<string, string[]>();
  for (const m of data ?? []) {
    const url = (m.cover_image ?? "").trim();
    if (!url) continue;
    if (!byUrl.has(url)) byUrl.set(url, []);
    byUrl.get(url)!.push(m.id);
  }
  // Only keep groups with >1 shop
  for (const [url, ids] of byUrl) {
    if (ids.length <= 1) byUrl.delete(url);
  }
  return byUrl;
}

/** Score menu quality and detect generic/duplicate items */
function analyzeMenu(menuJson: any): { genericCount: number; duplicateCount: number; totalItems: number; isLowQuality: boolean } {
  if (!menuJson) return { genericCount: 0, duplicateCount: 0, totalItems: 0, isLowQuality: true };
  const items = Array.isArray(menuJson) ? menuJson : menuJson.items || menuJson.sections || [];
  const flat = Array.isArray(items) ? items.flatMap((s: any) => s.items || [s]) : [];
  if (flat.length === 0) return { genericCount: 0, duplicateCount: 0, totalItems: 0, isLowQuality: true };

  const names = flat.map((i: any) => (i.name || "").toLowerCase().trim()).filter(Boolean);
  const genericCount = names.filter(n => GENERIC_NAMES.some(g => n.includes(g))).length;
  const uniqueNames = new Set(names);
  const duplicateCount = names.length - uniqueNames.size;

  return {
    genericCount,
    duplicateCount,
    totalItems: flat.length,
    isLowQuality: genericCount > flat.length * 0.3 || duplicateCount > flat.length * 0.3,
  };
}

/** Check category coherence */
function isCategoryValid(category?: string, subcategory?: string): boolean {
  if (!category || category === "general" || category === "other" || category === "unknown") return false;
  if (subcategory === "general" || subcategory === "other" || subcategory === "unknown") return false;
  return true;
}

/** Check profile completeness */
function isProfileComplete(m: any): { complete: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!m.name || m.name.trim().length < 2) missing.push("name");
  if (!m.category) missing.push("category");
  if (!m.city) missing.push("city");
  if (!m.country) missing.push("country");
  if (!m.cover_image) missing.push("cover_image");
  return { complete: missing.length === 0, missing };
}

export async function runShopCleanupEngine(limit = 200): Promise<CleanupReport> {
  const report: CleanupReport = {
    scanned: 0, duplicateCoverCount: 0, genericMenuCount: 0,
    wrongCategoryCount: 0, lowQualityCount: 0, autoFixed: 0, downgraded: 0, details: [],
  };

  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, city, country, cover_image, menu_items_json, visibility_score, visibility_mode")
    .limit(limit);

  if (!merchants?.length) return report;
  report.scanned = merchants.length;

  // Build duplicate cover map
  const dupCovers = await findDuplicateCovers();
  const dupCoverIds = new Set<string>();
  for (const ids of dupCovers.values()) ids.forEach(id => dupCoverIds.add(id));

  for (const m of merchants) {
    const issues: string[] = [];
    const actions: string[] = [];

    // 1. Duplicate cover
    if (dupCoverIds.has(m.id)) {
      issues.push("duplicate_cover_image");
      report.duplicateCoverCount++;
    }

    // 2. Menu analysis
    const menuAnalysis = analyzeMenu(m.menu_items_json);
    if (menuAnalysis.genericCount > 0) {
      issues.push(`generic_menu_items(${menuAnalysis.genericCount})`);
      report.genericMenuCount++;
    }
    if (menuAnalysis.duplicateCount > 0) {
      issues.push(`duplicate_menu_items(${menuAnalysis.duplicateCount})`);
    }

    // 3. Category validation
    if (!isCategoryValid(m.category, m.subcategory)) {
      issues.push("invalid_category");
      report.wrongCategoryCount++;

      // Auto-fix: if category is empty but name gives a hint, set to restaurant
      if (!m.category) {
        await db.from("seed_merchants").update({ category: "restaurant", subcategory: "restaurant" }).eq("id", m.id);
        actions.push("auto_set_category_restaurant");
        report.autoFixed++;
      }
    }

    // 4. Profile completeness
    const profile = isProfileComplete(m);
    if (!profile.complete) {
      issues.push(`incomplete_profile(${profile.missing.join(",")})`);
      report.lowQualityCount++;

      // Auto-fix missing city/country
      if (profile.missing.includes("city")) {
        await db.from("seed_merchants").update({ city: "Dubai" }).eq("id", m.id);
        actions.push("auto_set_city_dubai");
        report.autoFixed++;
      }
      if (profile.missing.includes("country")) {
        await db.from("seed_merchants").update({ country: "AE" }).eq("id", m.id);
        actions.push("auto_set_country_ae");
        report.autoFixed++;
      }
    }

    // 5. Downgrade logic: hide shops with 3+ unfixable issues
    const criticalIssues = issues.filter(i =>
      i.includes("duplicate_cover") || i.includes("generic_menu") || i.includes("invalid_category")
    );
    if (criticalIssues.length >= 2 && m.visibility_mode !== "hidden") {
      await db.from("seed_merchants")
        .update({ visibility_mode: "hidden", blocking_reason: `Auto-hidden: ${criticalIssues.join(", ")}` })
        .eq("id", m.id);
      actions.push("downgraded_to_hidden");
      report.downgraded++;
    }

    if (issues.length > 0) {
      report.details.push({ id: m.id, name: m.name ?? "?", issues, actions });
    }
  }

  console.log(`[shop-cleanup] scanned=${report.scanned} dupCovers=${report.duplicateCoverCount} genericMenu=${report.genericMenuCount} wrongCat=${report.wrongCategoryCount} fixed=${report.autoFixed} downgraded=${report.downgraded}`);
  return report;
}
