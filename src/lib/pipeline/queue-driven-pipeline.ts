/**
 * QUEUE-DRIVEN PIPELINE — Real-time entity processing through pipeline stages.
 * 
 * Architecture:
 * - entity_pipeline_queue stores pending work items
 * - Worker fetches next pending, locks, processes, advances to next stage
 * - Self-healing: failed items retry with backoff
 * - Priority: urgent > high > medium > low
 * 
 * NO NEW ENGINES — uses existing engine imports.
 */

import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

// ═══════════════════════════════════════════════════
//  PIPELINE STAGE DEFINITIONS
// ═══════════════════════════════════════════════════

export const PIPELINE_STAGES = [
  "source", "classify", "clean", "normalize", "rebuild",
  "enrich", "deduplicate", "score", "validate", "publish",
  "distribute", "digital",
] as const;

export type PipelineStage = typeof PIPELINE_STAGES[number];

function getNextStage(current: PipelineStage): PipelineStage | null {
  const idx = PIPELINE_STAGES.indexOf(current);
  return idx >= 0 && idx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[idx + 1] : null;
}

// ═══════════════════════════════════════════════════
//  QUEUE OPERATIONS
// ═══════════════════════════════════════════════════

export async function enqueueEntity(
  entityId: string,
  entityType: string = "seed_merchant",
  sourceType?: string,
  priority: number = 5,
  startStage: PipelineStage = "source"
) {
  // Check if already queued and not done/failed
  const { data: existing } = await db
    .from("entity_pipeline_queue")
    .select("id, status, current_stage")
    .eq("entity_id", entityId)
    .in("status", ["pending", "processing"])
    .limit(1);

  if (existing?.length) return existing[0];

  const { data } = await db.from("entity_pipeline_queue").insert({
    entity_id: entityId,
    entity_type: entityType,
    source_type: sourceType,
    current_stage: startStage,
    next_stage: getNextStage(startStage),
    priority,
    status: "pending",
  }).select("id").single();

  return data;
}

export async function enqueueBatch(
  entityIds: string[],
  priority: number = 5,
  startStage: PipelineStage = "source"
) {
  const rows = entityIds.map(id => ({
    entity_id: id,
    entity_type: "seed_merchant",
    current_stage: startStage,
    next_stage: getNextStage(startStage),
    priority,
    status: "pending",
  }));

  if (rows.length === 0) return { enqueued: 0 };
  const { data } = await db.from("entity_pipeline_queue").insert(rows).select("id");
  return { enqueued: data?.length ?? 0 };
}

/**
 * Fetch and lock the next pending queue item using atomic RPC (SELECT FOR UPDATE SKIP LOCKED).
 */
async function fetchAndLock(_workerId: string): Promise<any | null> {
  const { data, error } = await db.rpc("fetch_and_lock_job");
  if (error || !data?.length) return null;
  return data[0];
}

/**
 * Execute a single pipeline stage for an entity.
 */
async function executeStage(stage: PipelineStage, entityId: string): Promise<{ processed: number; error?: string }> {
  try {
    switch (stage) {
      case "source": {
        const { runSourceIntakeScan } = await import("@/lib/engines/source-intake-engine");
        const r = await runSourceIntakeScan(1);
        return { processed: r.snapshotted };
      }
      case "classify": {
        const { runVerticalClassifier } = await import("@/lib/engines/vertical-classifier-engine");
        const r = await runVerticalClassifier(1);
        return { processed: r.classified ?? 0 };
      }
      case "clean": {
        const { runShopCleanupEngine } = await import("@/lib/engines/shop-cleanup-engine");
        const r = await runShopCleanupEngine(1);
        return { processed: r.autoFixed ?? 0 };
      }
      case "normalize": {
        // Detect vertical and run appropriate normalizer
        const { data: entity } = await db.from("seed_merchants").select("vertical").eq("id", entityId).single();
        const v = entity?.vertical ?? "food";
        if (v === "food") {
          const { runFoodMenuNormalizer } = await import("@/lib/engines/food-menu-normalizer-engine");
          const r = await runFoodMenuNormalizer(1);
          return { processed: r.normalized ?? 0 };
        } else if (v === "hotel") {
          // Hotel normalization handled by canonical engine chain
          return { processed: 0 };
        } else if (v === "services") {
          const { runServiceCatalogNormalizer } = await import("@/lib/engines/service-catalog-normalizer-engine");
          const r = await runServiceCatalogNormalizer(1);
          return { processed: r.normalized ?? 0 };
        } else if (v === "grocery") {
          const { runGroceryNormalizer } = await import("@/lib/engines/grocery-normalizer-engine");
          const r = await runGroceryNormalizer(1);
          return { processed: r.normalized ?? 0 };
        }
        return { processed: 0 };
      }
      case "rebuild": {
        const { runMenuRebuildEngine } = await import("@/lib/engines/menu-rebuild-engine");
        const r = await runMenuRebuildEngine(1);
        return { processed: r.rebuilt ?? 0 };
      }
      case "enrich": {
        const { runCategoryMappingSync } = await import("@/lib/engines/category-mapping-engine");
        const r = await runCategoryMappingSync(1);
        return { processed: r.remapped ?? 0 };
      }
      case "deduplicate": {
        const { runFranchiseDedup } = await import("@/lib/engines/franchise-dedup-engine");
        const r = await runFranchiseDedup(1);
        return { processed: r.flagged ?? 0 };
      }
      case "score": {
        const { runShopQualityCheck } = await import("@/lib/engines/shop-quality-engine");
        const { data: shop } = await db.from("seed_merchants").select("*").eq("id", entityId).single();
        if (shop) {
          const result = runShopQualityCheck(shop);
          await db.from("seed_merchants")
            .update({ visibility_score: result.globalQualityScore, tier: result.qualityClass })
            .eq("id", entityId);
          return { processed: 1 };
        }
        return { processed: 0 };
      }
      case "validate": {
        const { runStrictQualityGate } = await import("@/lib/engines/strict-quality-gate-engine");
        const r = await runStrictQualityGate(1);
        return { processed: (r.published ?? 0) + (r.blocked ?? 0) };
      }
      case "publish": {
        const { runAutoPublish } = await import("@/lib/engines/auto-publish-engine");
        const r = await runAutoPublish(1);
        const count = (r as any).promoted ?? (r as any).published ?? (r as any).processed ?? 0;
        return { processed: count };
      }
      case "distribute": {
        // Ranking happens in batch — mark as done for individual entity
        return { processed: 1 };
      }
      case "digital": {
        return { processed: 1 };
      }
      default:
        return { processed: 0 };
    }
  } catch (e: any) {
    return { processed: 0, error: e?.message ?? "unknown" };
  }
}

/**
 * Process one queue item: execute current stage, advance or complete.
 */
async function processQueueItem(item: any): Promise<{ success: boolean; stage: string; error?: string }> {
  const stage = item.current_stage as PipelineStage;
  const result = await executeStage(stage, item.entity_id);
  const now = new Date().toISOString();

  if (result.error) {
    const retries = (item.retries ?? 0) + 1;
    const status = retries >= (item.max_retries ?? 3) ? "failed" : "pending";
    
    await db.from("entity_pipeline_queue").update({
      status,
      retries,
      last_error: result.error,
      locked_by: null,
      locked_at: null,
      updated_at: now,
      stage_results_json: {
        ...(item.stage_results_json ?? {}),
        [stage]: { error: result.error, at: now },
      },
    }).eq("id", item.id);

    return { success: false, stage, error: result.error };
  }

  const nextStage = getNextStage(stage);
  
  if (nextStage) {
    // Advance to next stage
    await db.from("entity_pipeline_queue").update({
      current_stage: nextStage,
      next_stage: getNextStage(nextStage),
      status: "pending",
      locked_by: null,
      locked_at: null,
      updated_at: now,
      stage_results_json: {
        ...(item.stage_results_json ?? {}),
        [stage]: { processed: result.processed, at: now },
      },
    }).eq("id", item.id);
  } else {
    // Pipeline complete
    await db.from("entity_pipeline_queue").update({
      status: "done",
      locked_by: null,
      locked_at: null,
      updated_at: now,
      stage_results_json: {
        ...(item.stage_results_json ?? {}),
        [stage]: { processed: result.processed, at: now },
      },
    }).eq("id", item.id);
  }

  return { success: true, stage };
}

// ═══════════════════════════════════════════════════
//  WORKER LOOP (client-side, bounded)
// ═══════════════════════════════════════════════════

/**
 * Process up to `maxItems` from the queue.
 * Suitable for client-side batch runs or edge function invocations.
 */
export async function processQueue(maxItems: number = 10): Promise<{
  processed: number;
  failed: number;
  stages: Record<string, number>;
}> {
  const workerId = `worker_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  let processed = 0;
  let failed = 0;
  const stages: Record<string, number> = {};

  for (let i = 0; i < maxItems; i++) {
    const item = await fetchAndLock(workerId);
    if (!item) break; // Queue empty

    const result = await processQueueItem(item);
    stages[result.stage] = (stages[result.stage] ?? 0) + 1;

    if (result.success) {
      processed++;
    } else {
      failed++;
    }
  }

  if (processed + failed > 0) {
    console.log(`[queue-worker] Processed ${processed}, failed ${failed}`, stages);
  }

  return { processed, failed, stages };
}

// ═══════════════════════════════════════════════════
//  QUEUE STATS
// ═══════════════════════════════════════════════════

export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  done: number;
  failed: number;
  byStage: Record<string, number>;
}> {
  const { data: all } = await db
    .from("entity_pipeline_queue")
    .select("status, current_stage");

  const stats = { pending: 0, processing: 0, done: 0, failed: 0, byStage: {} as Record<string, number> };
  
  for (const item of all ?? []) {
    if (item.status === "pending") stats.pending++;
    else if (item.status === "processing") stats.processing++;
    else if (item.status === "done") stats.done++;
    else if (item.status === "failed") stats.failed++;
    
    stats.byStage[item.current_stage] = (stats.byStage[item.current_stage] ?? 0) + 1;
  }

  return stats;
}

/**
 * Auto-enqueue all unprocessed seed_merchants into the pipeline.
 */
export async function enqueueUnprocessedEntities(limit: number = 50): Promise<{ enqueued: number }> {
  const { data: unprocessed } = await db
    .from("seed_merchants")
    .select("id")
    .or("pipeline_stage.is.null,pipeline_stage.eq.source_raw")
    .eq("is_active", true)
    .limit(limit);

  if (!unprocessed?.length) return { enqueued: 0 };

  const ids = unprocessed.map((e: any) => e.id);
  return enqueueBatch(ids, 5, "source");
}

/**
 * Recover stale locked items (dead worker cleanup).
 */
export async function recoverStaleItems(staleMinutes: number = 10): Promise<{ recovered: number }> {
  const cutoff = new Date(Date.now() - staleMinutes * 60_000).toISOString();
  
  const { data } = await db
    .from("entity_pipeline_queue")
    .update({
      status: "pending",
      locked_by: null,
      locked_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .lt("locked_at", cutoff)
    .select("id");

  return { recovered: data?.length ?? 0 };
}
