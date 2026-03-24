/**
 * Ingestion Runtime — Client-side orchestrator to trigger the server pipeline.
 * Connects the edge function to the UI and existing engines.
 */
import { supabase } from "@/integrations/supabase/client";

export interface PipelineRunResult {
  summary: {
    total_processed: number;
    accepted: number;
    rejected: number;
    blocked_coherence: number;
    avg_coherence: number;
    avg_integrity: number;
    avg_freshness: number;
    with_menu: number;
    without_menu: number;
    sources: Array<{ source: string; count: number }>;
  };
  results: Array<{
    entity_id: string;
    entity_name: string;
    accepted: boolean;
    source_key: string;
    confidence: number;
    integrity_score: number;
    coherence_score: number;
    freshness_score: number;
    field_sources: Record<string, string>;
    warnings: string[];
    auto_fixes: string[];
    menu_item_count: number;
    rejection_reason: string | null;
  }>;
}

/**
 * Run the full ingestion pipeline on a batch of entities.
 */
export async function runIngestionPipeline(options?: {
  batchSize?: number;
  entityIds?: string[];
}): Promise<PipelineRunResult> {
  const { data, error } = await supabase.functions.invoke("run-ingestion-pipeline", {
    body: {
      batch_size: options?.batchSize ?? 100,
      entity_ids: options?.entityIds ?? null,
    },
  });

  if (error) throw new Error(`Pipeline failed: ${error.message}`);
  return data as PipelineRunResult;
}

/**
 * Run pipeline on ALL entities in batches.
 */
export async function runFullPipeline(batchSize = 50): Promise<{
  totalProcessed: number;
  totalAccepted: number;
  totalRejected: number;
  batches: number;
}> {
  let totalProcessed = 0;
  let totalAccepted = 0;
  let totalRejected = 0;
  let batches = 0;

  // Keep running until no more pending
  let hasMore = true;
  while (hasMore) {
    const result = await runIngestionPipeline({ batchSize });
    totalProcessed += result.summary.total_processed;
    totalAccepted += result.summary.accepted;
    totalRejected += result.summary.rejected;
    batches++;

    hasMore = result.summary.total_processed >= batchSize;
    
    // Safety: max 20 batches
    if (batches >= 20) break;
  }

  return { totalProcessed, totalAccepted, totalRejected, batches };
}
