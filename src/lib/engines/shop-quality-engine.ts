/**
 * Shop Quality Engine — Unified quality orchestrator.
 * Runs coherence + menu + visual checks for any entity.
 * Extends existing engines — no duplication.
 */
import { validateEntityMenuCoherence, type CoherenceInput, type CoherenceResult } from "./coherence-engine";
import { processMenuIntelligence, type RawMenuItem, type SmartMenuResult } from "./menu-intelligence-engine";

// ── Shop Quality Result ──

export interface ShopQualityResult {
  entityId: string;
  coherence: CoherenceResult;
  menuQuality: SmartMenuResult | null;
  contentScore: number;
  visualScore: number;
  taxonomyScore: number;
  globalQualityScore: number;
  qualityClass: "premium" | "good" | "acceptable" | "poor" | "blocked";
  issues: string[];
  autoFixes: string[];
}

// ── Content scoring ──

function scoreContent(entity: Record<string, any>): { score: number; issues: string[] } {
  let score = 0;
  const issues: string[] = [];

  if (entity.name && entity.name.length > 2) score += 15; else issues.push("missing_name");
  if (entity.description && entity.description.length > 10) score += 15; else issues.push("missing_description");
  if (entity.support_phone || entity.phone) score += 10; else issues.push("missing_phone");
  if (entity.support_email || entity.email) score += 10; else issues.push("missing_email");
  if (entity.opening_hours) score += 10; else issues.push("missing_hours");
  if (entity.address || entity.area) score += 10;
  if (entity.city) score += 10;
  if (entity.rating && entity.rating > 0) score += 10;
  if (entity.review_count && entity.review_count > 0) score += 10;

  return { score: Math.min(100, score), issues };
}

// ── Visual scoring ──

function scoreVisual(entity: Record<string, any>): { score: number; issues: string[] } {
  let score = 0;
  const issues: string[] = [];

  const hasLogo = !!(entity.logo_url || entity.logo_image);
  const hasCover = !!(entity.cover_url || entity.cover_image || entity.banner_url);
  const hasGallery = Array.isArray(entity.gallery_urls) && entity.gallery_urls.length > 0;

  if (hasLogo) score += 30; else issues.push("missing_logo");
  if (hasCover) score += 35; else issues.push("missing_cover");
  if (hasGallery) score += 20;
  // Bonus for valid URLs (not placeholder)
  if (hasCover && !String(entity.cover_url || entity.cover_image || "").includes("placeholder")) score += 15;

  return { score: Math.min(100, score), issues };
}

// ── Taxonomy scoring ──

function scoreTaxonomy(entity: Record<string, any>): { score: number; issues: string[] } {
  let score = 0;
  const issues: string[] = [];

  if (entity.category) score += 30; else issues.push("missing_vertical");
  if (entity.subcategory) score += 40; else issues.push("missing_subcategory");
  if (entity.tags && Array.isArray(entity.tags) && entity.tags.length > 0) score += 15;
  if (entity.vertical) score += 15;

  return { score: Math.min(100, score), issues };
}

// ── Main Engine ──

export function runShopQualityCheck(
  entity: Record<string, any>,
  menuItems?: RawMenuItem[]
): ShopQualityResult {
  const issues: string[] = [];
  const autoFixes: string[] = [];

  // 1. Content score
  const content = scoreContent(entity);
  issues.push(...content.issues);

  // 2. Visual score
  const visual = scoreVisual(entity);
  issues.push(...visual.issues);

  // 3. Taxonomy score
  const taxonomy = scoreTaxonomy(entity);
  issues.push(...taxonomy.issues);

  // 4. Coherence check (only if menu items available)
  let coherence: CoherenceResult;
  if (menuItems && menuItems.length > 0) {
    const coherenceInput: CoherenceInput = {
      entity_name: entity.name ?? "",
      entity_vertical: entity.category ?? entity.vertical ?? "food",
      entity_subcategory: entity.subcategory ?? null,
      entity_tags: entity.tags ?? [],
      menu_items: menuItems,
    };
    coherence = validateEntityMenuCoherence(coherenceInput);
    if (coherence.conflicts.length > 0) issues.push(...coherence.conflicts);
  } else {
    // No menu = not a coherence problem, just incomplete
    coherence = {
      entity_menu_match_score: 50, // neutral — no menu to conflict
      vertical_match_score: 50,
      subcategory_match_score: 50,
      keyword_match_score: 50,
      taxonomy_match_score: 50,
      title_match_score: 50,
      status: "review_required",
      conflicts: [],
      quarantine_reason: null,
      validation_summary: { noMenu: true },
    };
  }

  // 5. Menu intelligence (if items available)
  let menuQuality: SmartMenuResult | null = null;
  if (menuItems && menuItems.length > 0) {
    menuQuality = processMenuIntelligence(menuItems, { subcategory: entity.subcategory });
  }

  // 6. Global quality score
  const menuScore = menuQuality?.menuQualityScore ?? 0;
  const coherenceWeight = menuItems?.length ? 0.20 : 0.05;
  const menuWeight = menuItems?.length ? 0.20 : 0.05;

  const globalQualityScore = Math.round(
    content.score * 0.25 +
    visual.score * 0.20 +
    taxonomy.score * 0.15 +
    coherence.entity_menu_match_score * coherenceWeight +
    menuScore * menuWeight +
    (1 - coherenceWeight - menuWeight - 0.60) * 50 // fill remainder with baseline
  );

  // 7. Quality class
  let qualityClass: ShopQualityResult["qualityClass"];
  if (coherence.status === "blocked") qualityClass = "blocked";
  else if (globalQualityScore >= 80) qualityClass = "premium";
  else if (globalQualityScore >= 60) qualityClass = "good";
  else if (globalQualityScore >= 40) qualityClass = "acceptable";
  else qualityClass = "poor";

  return {
    entityId: entity.id,
    coherence,
    menuQuality,
    contentScore: content.score,
    visualScore: visual.score,
    taxonomyScore: taxonomy.score,
    globalQualityScore,
    qualityClass,
    issues,
    autoFixes,
  };
}
