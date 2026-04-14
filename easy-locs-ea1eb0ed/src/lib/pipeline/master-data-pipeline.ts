/**
 * MASTER DATA PIPELINE — Single unified flow orchestrating ALL existing engines.
 * 
 * Pipeline stages:
 * 1. SOURCE    — Intake raw data snapshots (source-intake-engine)
 * 2. CLASSIFY  — Assign vertical + subcategory (vertical-classifier-engine)
 * 3. CLEAN     — Remove junk, dedup (shop-cleanup, franchise-dedup)
 * 4. NORMALIZE — Per-vertical normalization (food-menu, hotel-inventory, service-catalog, grocery)
 * 5. REBUILD   — Reconstruct menus/catalogs (menu-rebuild-engine)
 * 6. ENRICH    — Category mapping, taxonomy, data completeness
 * 7. SCORE     — Quality scoring (shop-quality, data-trust, coherence)
 * 8. VALIDATE  — Strict quality gate + vertical publish gates
 * 9. PUBLISH   — Auto-publish / auto-unpublish / visibility optimizer
 * 10. DISTRIBUTE — Ranking, SEO, digital content sync
 *
 * NO NEW ENGINES. This orchestrator sequences existing ones.
 */

import { db } from "@/services/db";
import { getAllCountryEntries } from "@/lib/global-country-registry";
import { recordStageRun } from "./pipeline-metrics";

function inferVerticalFromText(name: string, description: string, category: string): string | null {
  const text = `${name} ${description || ""} ${category || ""}`.toLowerCase();
  if (/restaurant|food|pizza|sushi|burger|cuisine|kitchen/i.test(text)) return "food";
  if (/grocery|supermarket|market|organic/i.test(text)) return "grocery";
  if (/hotel|stay|resort|hostel|airbnb|lodge/i.test(text)) return "stay";
  if (/plumber|cleaning|repair|service|electrician/i.test(text)) return "services";
  if (/property|real.?estate|apartment|villa|house/i.test(text)) return "property";
  if (/shop|store|boutique|retail|fashion/i.test(text)) return "shops";
  if (/taxi|ride|delivery|logistics|transport/i.test(text)) return "mobility";
  if (/health|clinic|doctor|pharmacy|medical/i.test(text)) return "healthcare";
  if (/event|concert|tour|experience|activity/i.test(text)) return "experiences";
  return null;
}

function normalizeServiceCatalog(merchants: any[]): { results: any[]; normalized: number } {
  const results: { shopId: string; shopName: string; issue: string; suggestedFix: string }[] = [];
  let normalized = 0;
  for (const m of merchants) {
    const services = Array.isArray(m.service_catalog_json) ? m.service_catalog_json : [];
    if (services.length === 0) {
      results.push({ shopId: m.id, shopName: m.name ?? "", issue: "empty_catalog", suggestedFix: "Add at least one service" });
      normalized++;
      continue;
    }
    for (const svc of services) {
      const svcName = svc?.name != null ? String(svc.name) : "";
      if (!svcName || svcName.trim().length < 2) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "service_no_name", suggestedFix: "Add a service name" });
        normalized++;
      } else if (svcName !== svcName.trim() || /\s{2,}/.test(svcName)) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "service_whitespace", suggestedFix: svcName.trim().replace(/\s{2,}/g, " ") });
        normalized++;
      }
      if (svc?.price == null && svc?.price_range == null) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "service_no_price", suggestedFix: "Set a price or price range" });
        normalized++;
      }
    }
  }
  return { results, normalized };
}

function normalizeGroceryCatalog(merchants: any[]): { results: any[]; normalized: number } {
  const results: { shopId: string; shopName: string; issue: string; suggestedFix: string }[] = [];
  let normalized = 0;
  for (const m of merchants) {
    const items = Array.isArray(m.menu_items_json) ? m.menu_items_json : [];
    if (items.length === 0) {
      results.push({ shopId: m.id, shopName: m.name ?? "", issue: "empty_catalog", suggestedFix: "Add grocery items" });
      normalized++;
      continue;
    }
    for (const item of items) {
      const itemName = item?.name != null ? String(item.name) : "";
      if (!itemName || itemName.trim().length < 2) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "item_no_name", suggestedFix: "Add a product name" });
        normalized++;
      } else if (itemName !== itemName.trim() || /\s{2,}/.test(itemName)) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "item_whitespace", suggestedFix: itemName.trim().replace(/\s{2,}/g, " ") });
        normalized++;
      }
      if (item?.price == null || Number(item.price) <= 0) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "item_invalid_price", suggestedFix: "Set a valid price > 0" });
        normalized++;
      }
    }
  }
  return { results, normalized };
}

export type PipelineRegion = "europe" | "middle_east" | "africa" | "asia_pacific" | "americas" | "all";

export interface RegionContext {
  region: PipelineRegion;
  countryCodes: string[];
  currencies: string[];
  languages: string[];
}

function buildRegionContext(region: PipelineRegion): RegionContext {
  const allEntries = getAllCountryEntries();

  if (region === "all") {
    return {
      region,
      countryCodes: allEntries.map(e => e.code),
      currencies: [...new Set(allEntries.map(e => e.currency))],
      languages: [...new Set(allEntries.flatMap(e => e.supportedLanguages))],
    };
  }

  const filtered = allEntries.filter(e => e.region === region);
  return {
    region,
    countryCodes: filtered.map(e => e.code),
    currencies: [...new Set(filtered.map(e => e.currency))],
    languages: [...new Set(filtered.flatMap(e => e.supportedLanguages))],
  };
}

let _activeRegionCtx: RegionContext | null = null;
export function getActiveRegionContext(): RegionContext | null {
  return _activeRegionCtx;
}

export interface PipelineStageResult {
  stage: string;
  engine: string;
  processed: number;
  errors: number;
  duration: number;
  detail?: string;
}

export interface PipelineRunResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  stages: PipelineStageResult[];
  totalProcessed: number;
  totalErrors: number;
  duration: number;
}

async function runStage(
  stageName: string,
  engineName: string,
  fn: () => Promise<any>
): Promise<PipelineStageResult> {
  const start = Date.now();
  try {
    const result = await fn();
    const processed = extractProcessedCount(result);
    const duration = Date.now() - start;
    recordStageRun(stageName, processed, 0, duration);
    return {
      stage: stageName,
      engine: engineName,
      processed,
      errors: 0,
      duration,
      detail: JSON.stringify(result),
    };
  } catch (e: any) {
    console.error(`[pipeline:${stageName}] ${engineName} failed:`, e?.message);
    const duration = Date.now() - start;
    recordStageRun(stageName, 0, 1, duration);
    return {
      stage: stageName,
      engine: engineName,
      processed: 0,
      errors: 1,
      duration,
      detail: e?.message,
    };
  }
}

function extractProcessedCount(result: any): number {
  if (!result) return 0;
  // Hotel gate and vertical gates return passed + blocked + autoUnpublished counts
  // (no single "processed" field). Sum all three for accurate stage throughput.
  if (typeof result.passed === "number" || typeof result.blocked === "number") {
    return (result.passed ?? 0) + (result.blocked ?? 0) + (result.autoUnpublished ?? 0);
  }
  return result.snapshotted ?? result.classified ?? result.changed ??
    result.rebuilt ?? result.normalized ?? result.remapped ??
    result.processed ?? result.published ?? result.flagged ??
    result.autoFixed ?? result.total ?? 0;
}

/**
 * Run the complete master pipeline — sequences all stages in order.
 * Each stage waits for the previous to finish to ensure data flows correctly.
 */
export async function runMasterPipeline(batchSize = 50, region: PipelineRegion = "all"): Promise<PipelineRunResult> {
  const runId = `pipeline_${Date.now()}`;
  const startedAt = new Date().toISOString();
  const stages: PipelineStageResult[] = [];
  const regionCtx = buildRegionContext(region);

  _activeRegionCtx = regionCtx;

  console.log(`[master-pipeline] ▶ Starting run ${runId} | region=${region} | countries=${regionCtx.countryCodes.length} | currencies=${regionCtx.currencies.length} | languages=${regionCtx.languages.length}`);

  // ═══ STAGE 1: SOURCE — Snapshot raw data ═══
  stages.push(await runStage("1_source", "source-intake", async () => {
    const { runSourceIntakeScan } = await import("@/lib/engines/source-intake-engine");
    return runSourceIntakeScan(batchSize);
  }));

  // ═══ STAGE 2: CLASSIFY — Vertical assignment (region-scoped via pre-filter) ═══
  stages.push(await runStage("2_classify", "vertical-classifier", async () => {
    if (region !== "all" && regionCtx.countryCodes.length > 0) {
      const { data: shops } = await db
        .from("storefront_pages")
        .select("id, name, vertical, category, subcategory, description")
        .in("country", regionCtx.countryCodes)
        .limit(batchSize * 2);
      if (!shops || shops.length === 0) return { classified: 0, region };
      const { CANONICAL_VERTICALS } = await import("@/lib/taxonomy/world-class-taxonomy");
      const validVerticals = CANONICAL_VERTICALS.map((v: any) => v.value);
      let classified = 0;
      const results: { shopId: string; name: string; currentVertical: string; suggestedVertical: string; confidence: number }[] = [];
      for (const shop of shops) {
        if (!shop.vertical || !validVerticals.includes(shop.vertical)) {
          const suggested = inferVerticalFromText(shop.name, shop.description, shop.category);
          if (suggested) {
            results.push({
              shopId: shop.id,
              name: shop.name,
              currentVertical: shop.vertical || "none",
              suggestedVertical: suggested,
              confidence: shop.category ? 0.8 : 0.5,
            });
            classified++;
          }
        }
      }
      return { status: "completed", results, classified, region, countryCodes: regionCtx.countryCodes };
    }
    const { runVerticalClassifier } = await import("@/lib/engines/vertical-classifier-engine");
    return runVerticalClassifier();
  }));

  // ═══ STAGE 3: CLEAN — Cleanup + dedup ═══
  stages.push(await runStage("3_clean_cleanup", "shop-cleanup", async () => {
    const { runShopCleanupEngine } = await import("@/lib/engines/shop-cleanup-engine");
    return runShopCleanupEngine(batchSize * 4);
  }));
  stages.push(await runStage("3_clean_dedup", "franchise-dedup", async () => {
    const { runFranchiseDedup } = await import("@/lib/engines/franchise-dedup-engine");
    return runFranchiseDedup(batchSize * 4);
  }));

  // ═══ STAGE 4: NORMALIZE — Per-vertical normalization (region-scoped via pre-filter) ═══
  const [foodNorm, hotelNorm, serviceNorm, groceryNorm] = await Promise.all([
    runStage("4_normalize_food", "food-menu-normalizer", async () => {
      if (region !== "all" && regionCtx.countryCodes.length > 0) {
        const { data: regionShops } = await db
          .from("storefront_pages")
          .select("id")
          .in("country", regionCtx.countryCodes)
          .eq("vertical", "food")
          .limit(batchSize);
        if (!regionShops || regionShops.length === 0) return { normalized: 0, region };
        const { runFoodMenuNormalizer } = await import("@/lib/engines/food-menu-normalizer-engine");
        let normalized = 0;
        for (const shop of regionShops) {
          const r = await runFoodMenuNormalizer(shop.id);
          normalized += extractProcessedCount(r);
        }
        return { normalized, region };
      }
      const { runFoodMenuNormalizer } = await import("@/lib/engines/food-menu-normalizer-engine");
      return runFoodMenuNormalizer();
    }),
    runStage("4_normalize_hotel", "hotel-room-normalizer", async () => {
      const { runHotelRoomNormalizer } = await import("@/lib/engines/hotel-room-normalizer-engine");
      const countryCodes = region !== "all" && regionCtx.countryCodes.length > 0
        ? regionCtx.countryCodes
        : undefined;
      return runHotelRoomNormalizer(batchSize, countryCodes);
    }),
    runStage("4_normalize_service", "service-catalog-normalizer", async () => {
      if (region !== "all" && regionCtx.countryCodes.length > 0) {
        const { data: regionMerchants } = await db
          .from("seed_merchants")
          .select("id, name, service_catalog_json, vertical, pipeline_stage")
          .eq("vertical", "services")
          .in("country", regionCtx.countryCodes)
          .limit(batchSize);
        if (!regionMerchants || regionMerchants.length === 0) return { status: "completed", results: [], normalized: 0, region };
        const { results, normalized } = normalizeServiceCatalog(regionMerchants);
        return { status: "completed", results, normalized, region };
      }
      const { runServiceCatalogNormalizer } = await import("@/lib/engines/service-catalog-normalizer-engine");
      return runServiceCatalogNormalizer(batchSize);
    }),
    runStage("4_normalize_grocery", "grocery-normalizer", async () => {
      if (region !== "all" && regionCtx.countryCodes.length > 0) {
        const { data: regionMerchants } = await db
          .from("seed_merchants")
          .select("id, name, menu_items_json, vertical, pipeline_stage")
          .eq("vertical", "grocery")
          .in("country", regionCtx.countryCodes)
          .limit(batchSize);
        if (!regionMerchants || regionMerchants.length === 0) return { status: "completed", results: [], normalized: 0, region };
        const { results, normalized } = normalizeGroceryCatalog(regionMerchants);
        return { status: "completed", results, normalized, region };
      }
      const { runGroceryNormalizer } = await import("@/lib/engines/grocery-normalizer-engine");
      return runGroceryNormalizer(batchSize);
    }),
  ]);
  stages.push(foodNorm, hotelNorm, serviceNorm, groceryNorm);

  // ═══ STAGE 5: REBUILD — Menu reconstruction (food only) ═══
  stages.push(await runStage("5_rebuild_menu", "menu-rebuild", async () => {
    const { runMenuRebuildEngine } = await import("@/lib/engines/menu-rebuild-engine");
    return runMenuRebuildEngine(batchSize * 2);
  }));

  // ═══ STAGE 6: ENRICH — Taxonomy + category mapping + completeness ═══
  const [catMap, taxonomy, completeness] = await Promise.all([
    runStage("6_enrich_category", "category-mapping", async () => {
      const { runCategoryMappingSync } = await import("@/lib/engines/category-mapping-engine");
      return runCategoryMappingSync(batchSize * 2);
    }),
    runStage("6_enrich_taxonomy", "adaptive-taxonomy", async () => {
      const { runAdaptiveTaxonomyEngine } = await import("@/lib/engines/adaptive-taxonomy-engine");
      return runAdaptiveTaxonomyEngine();
    }),
    runStage("6_enrich_completeness", "data-completeness", async () => {
      const { runDataCompletenessEngine } = await import("@/lib/engines/data-completeness-engine");
      return runDataCompletenessEngine();
    }),
  ]);
  stages.push(catMap, taxonomy, completeness);

  // ═══ STAGE 7: SCORE — Quality scoring ═══
  stages.push(await runStage("7_score_quality", "shop-quality", async () => {
    const { runShopQualityCheck } = await import("@/lib/engines/shop-quality-engine");
    let query = db
      .from("seed_merchants")
      .select("*")
      .is("visibility_score", null)
      .limit(batchSize * 2);
    if (region !== "all" && regionCtx.countryCodes.length > 0) {
      query = query.in("country", regionCtx.countryCodes);
    }
    const { data: shops } = await query;
    let scored = 0;
    for (const shop of shops ?? []) {
      const result = runShopQualityCheck(shop);
      await db("seed_merchants")
        .update({ visibility_score: result.globalQualityScore, tier: result.qualityClass })
        .eq("id", shop.id);
      scored++;
    }
    return { processed: scored, region, countryCodes: regionCtx.countryCodes };
  }));
  stages.push(await runStage("7_score_trust", "data-trust", async () => {
    const { runDataTrustScan } = await import("@/lib/engines/data-trust-engine");
    return runDataTrustScan(batchSize * 2);
  }));

  // ═══ STAGE 8: VALIDATE — Strict quality gate + vertical gates ═══
  stages.push(await runStage("8_validate_strict", "strict-quality-gate", async () => {
    const { runStrictQualityGate } = await import("@/lib/engines/strict-quality-gate-engine");
    return runStrictQualityGate(batchSize * 4);
  }));

  // Vertical publish gates in parallel
  const [foodGate, hotelGate, serviceGate, groceryGate] = await Promise.all([
    runStage("8_validate_food", "publish-gate-food", async () => {
      const { runFoodPublishGate } = await import("@/lib/engines/publish-gate-food-engine");
      return runFoodPublishGate(batchSize * 2);
    }),
    runStage("8_validate_hotel", "hotel-quality-gate", async () => {
      const { runHotelPublishGate } = await import("@/lib/engines/publish-gate-hotel-engine");
      return runHotelPublishGate(batchSize);
    }),
    runStage("8_validate_service", "publish-gate-service", async () => {
      const { runServicePublishGate } = await import("@/lib/engines/publish-gate-service-engine");
      return runServicePublishGate(batchSize);
    }),
    runStage("8_validate_grocery", "publish-gate-grocery", async () => {
      const { runGroceryPublishGate } = await import("@/lib/engines/publish-gate-grocery-engine");
      return runGroceryPublishGate(batchSize);
    }),
  ]);
  stages.push(foodGate, hotelGate, serviceGate, groceryGate);

  // ═══ STAGE 8.5: MODERATION — Text + image safety check before Publish ═══
  stages.push(await runStage("8_moderation", "content-moderation", async () => {
    const { runContentModeration } = await import("@/lib/engines/content-moderation-engine");
    return runContentModeration(batchSize * 2);
  }));

  // ═══ STAGE 9: PUBLISH — Auto-publish + visibility management ═══
  stages.push(await runStage("9_publish", "auto-publish", async () => {
    const { runAutoPublish } = await import("@/lib/engines/auto-publish-engine");
    return runAutoPublish(batchSize * 2);
  }));
  stages.push(await runStage("9_visibility", "visibility-optimizer", async () => {
    const { runVisibilityOptimizer } = await import("@/lib/engines/visibility-optimizer-engine");
    return runVisibilityOptimizer(batchSize * 2);
  }));
  stages.push(await runStage("9_unpublish", "auto-unpublish", async () => {
    const { runAutoUnpublish } = await import("@/lib/engines/auto-unpublish-engine");
    return runAutoUnpublish(batchSize * 2);
  }));

  // ═══ STAGE 10: DISTRIBUTE — Ranking + SEO ═══
  stages.push(await runStage("10_rank", "central-ranking", async () => {
    const { rerankAll } = await import("@/lib/ranking/ranking-batch-runner");
    return rerankAll();
  }));
  stages.push(await runStage("10_seo", "seo-engine", async () => {
    const { runSeoCheck } = await import("@/lib/engines/seo-engine");
    return runSeoCheck(batchSize * 2);
  }));

  // ═══ STAGE 11: PLACEHOLDER PURGE — Remove all unsplash/placeholder images ═══
  stages.push(await runStage("11_purge_placeholders", "placeholder-purge", async () => {
    return purgeAllPlaceholderImages(batchSize * 4, region !== "all" ? regionCtx.countryCodes : undefined);
  }));

  const completedAt = new Date().toISOString();
  const totalProcessed = stages.reduce((sum, s) => sum + s.processed, 0);
  const totalErrors = stages.reduce((sum, s) => sum + s.errors, 0);
  const duration = Date.now() - new Date(startedAt).getTime();

  const result: PipelineRunResult = {
    runId,
    startedAt,
    completedAt,
    stages,
    totalProcessed,
    totalErrors,
    duration,
  };

  _activeRegionCtx = null;

  console.log(`[master-pipeline] ✅ Complete: ${totalProcessed} processed, ${totalErrors} errors, ${duration}ms | region=${region}`);

  await db("platform_actions_log").insert({
    engine_source: "master-pipeline",
    action_type: "pipeline_run",
    severity: totalErrors > 0 ? "warning" : "info",
    description: `Pipeline run (${region}): ${totalProcessed} processed, ${totalErrors} errors`,
    decision: `Region: ${region} (${regionCtx.countryCodes.length} countries, ${regionCtx.currencies.length} currencies) | Stages: ${stages.map(s => `${s.stage}(${s.processed})`).join(" → ")}`,
    auto_applied: true,
    result: JSON.stringify({ runId, duration, totalProcessed, totalErrors, region, countryCodes: regionCtx.countryCodes }),
  }).catch(() => {});

  return result;
}

/**
 * Purge all placeholder/stock images from seed_merchants and storefront_pages.
 */
const PLACEHOLDER_PATTERNS = ["unsplash.com", "placeholder", "dummyimage", "placehold.co", "via.placeholder", "picsum.photos", "lorempixel"];

async function purgeAllPlaceholderImages(limit: number, countryCodes?: string[]) {
  let purged = 0;

  let seedQuery = db
    .from("seed_merchants")
    .select("id, cover_image, logo_image")
    .limit(limit);
  if (countryCodes && countryCodes.length > 0) {
    seedQuery = seedQuery.in("country", countryCodes);
  }
  const { data: seeds } = await seedQuery;

  for (const s of seeds ?? []) {
    const updates: Record<string, any> = {};
    if (s.cover_image && PLACEHOLDER_PATTERNS.some(p => s.cover_image.toLowerCase().includes(p))) {
      updates.cover_image = null;
    }
    if (s.logo_image && PLACEHOLDER_PATTERNS.some(p => s.logo_image.toLowerCase().includes(p))) {
      updates.logo_image = null;
    }
    if (Object.keys(updates).length > 0) {
      await db("seed_merchants").update(updates).eq("id", s.id);
      purged++;
    }
  }

  // Storefront pages
  const { data: stores } = await db
    .from("storefront_pages")
    .select("id, banner_url, logo_url")
    .limit(limit);

  for (const s of stores ?? []) {
    const updates: Record<string, any> = {};
    if (s.banner_url && PLACEHOLDER_PATTERNS.some(p => s.banner_url.toLowerCase().includes(p))) {
      updates.banner_url = null;
    }
    if (s.logo_url && PLACEHOLDER_PATTERNS.some(p => s.logo_url.toLowerCase().includes(p))) {
      updates.logo_url = null;
    }
    if (Object.keys(updates).length > 0) {
      await db("storefront_pages").update(updates).eq("id", s.id);
      purged++;
    }
  }

  console.log(`[placeholder-purge] Purged ${purged} entities with placeholder images`);
  return { purged };
}

/**
 * Quick pipeline run — only essential stages for rapid iteration.
 */
export async function runQuickPipeline(batchSize = 20): Promise<PipelineStageResult[]> {
  const stages: PipelineStageResult[] = [];

  // Classify → Rebuild → Score → Gate → Publish
  stages.push(await runStage("classify", "vertical-classifier", async () => {
    const { runVerticalClassifier } = await import("@/lib/engines/vertical-classifier-engine");
    return runVerticalClassifier(batchSize);
  }));
  stages.push(await runStage("rebuild", "menu-rebuild", async () => {
    const { runMenuRebuildEngine } = await import("@/lib/engines/menu-rebuild-engine");
    return runMenuRebuildEngine(batchSize);
  }));
  stages.push(await runStage("gate", "strict-quality-gate", async () => {
    const { runStrictQualityGate } = await import("@/lib/engines/strict-quality-gate-engine");
    return runStrictQualityGate(batchSize * 2);
  }));
  stages.push(await runStage("publish", "auto-publish", async () => {
    const { runAutoPublish } = await import("@/lib/engines/auto-publish-engine");
    return runAutoPublish(batchSize);
  }));

  return stages;
}
