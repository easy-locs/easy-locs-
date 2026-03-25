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

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

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
    return {
      stage: stageName,
      engine: engineName,
      processed,
      errors: 0,
      duration: Date.now() - start,
      detail: JSON.stringify(result),
    };
  } catch (e: any) {
    console.error(`[pipeline:${stageName}] ${engineName} failed:`, e?.message);
    return {
      stage: stageName,
      engine: engineName,
      processed: 0,
      errors: 1,
      duration: Date.now() - start,
      detail: e?.message,
    };
  }
}

function extractProcessedCount(result: any): number {
  if (!result) return 0;
  return result.snapshotted ?? result.classified ?? result.changed ??
    result.rebuilt ?? result.normalized ?? result.remapped ??
    result.processed ?? result.published ?? result.flagged ??
    result.autoFixed ?? result.promoted ?? result.total ?? 0;
}

/**
 * Run the complete master pipeline — sequences all stages in order.
 * Each stage waits for the previous to finish to ensure data flows correctly.
 */
export async function runMasterPipeline(batchSize = 50): Promise<PipelineRunResult> {
  const runId = `pipeline_${Date.now()}`;
  const startedAt = new Date().toISOString();
  const stages: PipelineStageResult[] = [];

  console.log(`[master-pipeline] ▶ Starting run ${runId}`);

  // ═══ STAGE 1: SOURCE — Snapshot raw data ═══
  stages.push(await runStage("1_source", "source-intake", async () => {
    const { runSourceIntakeScan } = await import("@/lib/engines/source-intake-engine");
    return runSourceIntakeScan(batchSize);
  }));

  // ═══ STAGE 2: CLASSIFY — Vertical assignment ═══
  stages.push(await runStage("2_classify", "vertical-classifier", async () => {
    const { runVerticalClassifier } = await import("@/lib/engines/vertical-classifier-engine");
    return runVerticalClassifier(batchSize * 2);
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

  // ═══ STAGE 4: NORMALIZE — Per-vertical normalization ═══
  // Run all 4 normalizers in parallel since they target different verticals
  const [foodNorm, hotelNorm, serviceNorm, groceryNorm] = await Promise.all([
    runStage("4_normalize_food", "food-menu-normalizer", async () => {
      const { runFoodMenuNormalizer } = await import("@/lib/engines/food-menu-normalizer-engine");
      return runFoodMenuNormalizer(batchSize);
    }),
    runStage("4_normalize_hotel", "hotel-inventory-normalizer", async () => {
      const { runHotelInventoryNormalizer } = await import("@/lib/engines/hotel-inventory-normalizer-engine");
      return runHotelInventoryNormalizer(batchSize);
    }),
    runStage("4_normalize_service", "service-catalog-normalizer", async () => {
      const { runServiceCatalogNormalizer } = await import("@/lib/engines/service-catalog-normalizer-engine");
      return runServiceCatalogNormalizer(batchSize);
    }),
    runStage("4_normalize_grocery", "grocery-normalizer", async () => {
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
    const { data: shops } = await db
      .from("seed_merchants")
      .select("*")
      .is("visibility_score", null)
      .limit(batchSize * 2);
    let scored = 0;
    for (const shop of shops ?? []) {
      const result = runShopQualityCheck(shop);
      await db.from("seed_merchants")
        .update({ visibility_score: result.globalQualityScore, tier: result.qualityClass })
        .eq("id", shop.id);
      scored++;
    }
    return { processed: scored };
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
    runStage("8_validate_hotel", "publish-gate-hotel", async () => {
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
    return purgeAllPlaceholderImages(batchSize * 4);
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

  console.log(`[master-pipeline] ✅ Complete: ${totalProcessed} processed, ${totalErrors} errors, ${duration}ms`);

  // Persist run summary
  await db.from("platform_actions_log").insert({
    engine_source: "master-pipeline",
    action_type: "pipeline_run",
    severity: totalErrors > 0 ? "warning" : "info",
    description: `Pipeline run: ${totalProcessed} processed, ${totalErrors} errors`,
    decision: `Stages: ${stages.map(s => `${s.stage}(${s.processed})`).join(" → ")}`,
    auto_applied: true,
    result: JSON.stringify({ runId, duration, totalProcessed, totalErrors }),
  }).catch(() => {});

  return result;
}

/**
 * Purge all placeholder/stock images from seed_merchants and storefront_pages.
 */
const PLACEHOLDER_PATTERNS = ["unsplash.com", "placeholder", "dummyimage", "placehold.co", "via.placeholder", "picsum.photos", "lorempixel"];

async function purgeAllPlaceholderImages(limit: number) {
  let purged = 0;

  // Seed merchants
  const { data: seeds } = await db
    .from("seed_merchants")
    .select("id, cover_image, logo_image")
    .limit(limit);

  for (const s of seeds ?? []) {
    const updates: Record<string, any> = {};
    if (s.cover_image && PLACEHOLDER_PATTERNS.some(p => s.cover_image.toLowerCase().includes(p))) {
      updates.cover_image = null;
    }
    if (s.logo_image && PLACEHOLDER_PATTERNS.some(p => s.logo_image.toLowerCase().includes(p))) {
      updates.logo_image = null;
    }
    if (Object.keys(updates).length > 0) {
      await db.from("seed_merchants").update(updates).eq("id", s.id);
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
      await db.from("storefront_pages").update(updates).eq("id", s.id);
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
