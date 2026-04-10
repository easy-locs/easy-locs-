/**
 * import.execution — Canonical import execution pipeline.
 * Handles: batch create/update, progress tracking, partial failure, retry, summary.
 */
import { ImportNotifications } from "./import-notifications";
import type { ParsedRow } from "./import-parse";
import type { DedupResult } from "./import-dedup";

export type ExecutionItemStatus = "pending" | "success" | "failed" | "skipped";

export interface ExecutionItem {
  row: ParsedRow;
  status: ExecutionItemStatus;
  error?: string;
  entityId?: string;
}

export interface ExecutionProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}

export interface ExecutionSummary {
  sourceType: string;
  total: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  duplicateCount: number;
  items: ExecutionItem[];
  durationMs: number;
}

export type ExecutionCallback = (item: ParsedRow) => Promise<{ id: string }>;
export type ProgressCallback = (progress: ExecutionProgress) => void;

export const ImportExecution = {
  /**
   * Execute the import pipeline on validated, deduped rows.
   * Calls `insertFn` for each row, tracks progress, handles partial failures.
   */
  async execute(
    sourceType: string,
    rows: ParsedRow[],
    dedupResult: DedupResult,
    insertFn: ExecutionCallback,
    onProgress?: ProgressCallback,
  ): Promise<ExecutionSummary> {
    const start = Date.now();
    const items: ExecutionItem[] = [];

    const progress: ExecutionProgress = {
      total: rows.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    };

    ImportNotifications.notifyStarted(sourceType, rows.length);

    for (const row of rows) {
      if (!row.valid) {
        items.push({ row, status: "skipped", error: row.errors?.join("; ") });
        progress.skipped++;
        progress.processed++;
        onProgress?.(progress);
        continue;
      }

      if (dedupResult.duplicateIndices.has(row.index)) {
        items.push({ row, status: "skipped", error: "Duplicate" });
        progress.skipped++;
        progress.processed++;
        onProgress?.(progress);
        continue;
      }

      try {
        const result = await insertFn(row);
        items.push({ row, status: "success", entityId: result.id });
        progress.succeeded++;
      } catch (err: any) {
        items.push({ row, status: "failed", error: err?.message || "Unknown error" });
        progress.failed++;
      }

      progress.processed++;
      onProgress?.(progress);
    }

    const summary: ExecutionSummary = {
      sourceType,
      total: rows.length,
      successCount: progress.succeeded,
      failedCount: progress.failed,
      skippedCount: progress.skipped,
      duplicateCount: dedupResult.duplicateIndices.size,
      items,
      durationMs: Date.now() - start,
    };

    ImportNotifications.notifyCompleted({
      sourceType,
      totalRows: summary.total,
      successCount: summary.successCount,
      failedCount: summary.failedCount,
      duplicateCount: summary.duplicateCount,
    });

    return summary;
  },

  /** Retry only failed items from a previous execution */
  async retryFailed(
    summary: ExecutionSummary,
    insertFn: ExecutionCallback,
    onProgress?: ProgressCallback,
  ): Promise<ExecutionSummary> {
    const failedRows = summary.items
      .filter((i) => i.status === "failed")
      .map((i) => i.row);

    if (failedRows.length === 0) return summary;

    const emptyDedup: DedupResult = { duplicateIndices: new Set(), duplicateMapping: new Map(), uniqueCount: failedRows.length };
    return ImportExecution.execute(
      summary.sourceType,
      failedRows,
      emptyDedup,
      insertFn,
      onProgress,
    );
  },

  /** Build human-readable execution summary */
  buildSummaryText(summary: ExecutionSummary): string {
    const parts = [`${summary.successCount}/${summary.total} imported`];
    if (summary.duplicateCount > 0) parts.push(`${summary.duplicateCount} duplicates`);
    if (summary.failedCount > 0) parts.push(`${summary.failedCount} failed`);
    if (summary.skippedCount > 0) parts.push(`${summary.skippedCount} skipped`);
    parts.push(`(${summary.durationMs}ms)`);
    return parts.join(" · ");
  },
};
