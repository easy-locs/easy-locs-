/**
 * Batch Types — Canonical types for multi-media batch pipeline.
 * Defines batch IDs, item states, and view models.
 */

// ── Batch ID ──

export function issueBatchId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `batch_${crypto.randomUUID()}`;
  }
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ── Item Status ──

export type BatchItemStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "failed"
  | "reconciled";

export type BatchStatus =
  | "pending"
  | "uploading"
  | "partial_failed"
  | "completed"
  | "cancelled";

// ── Batch Item ──

export interface BatchMediaItem {
  itemId: string;
  batchIndex: number;
  totalCount: number;
  file: File;
  localPreviewUrl: string;
  mediaKind: "image" | "video" | "file";
  status: BatchItemStatus;
  progress: number;
  remoteUrl: string | null;
  optimisticMessageId: string | null;
  error: string | null;
}

// ── Batch Record ──

export interface MediaBatchRecord {
  batchId: string;
  conversationId: string;
  caption: string;
  captionPolicy: "first_item";
  items: BatchMediaItem[];
  status: BatchStatus;
  createdAt: number;
  completedAt: number | null;
}

// ── View Models ──

export interface MultiMediaBatchViewModel {
  batchId: string;
  status: BatchStatus;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  caption: string;
  items: MultiMediaBatchItemViewModel[];
  overallProgress: number;
}

export interface MultiMediaBatchItemViewModel {
  itemId: string;
  batchIndex: number;
  status: BatchItemStatus;
  progress: number;
  previewUrl: string;
  remoteUrl: string | null;
  mediaKind: string;
  fileName: string;
  hasCaption: boolean;
}

export interface MultiMediaPreviewViewModel {
  items: Array<{
    id: string;
    previewUrl: string;
    fileName: string;
    mediaKind: string;
    order: number;
    sizeBytes: number;
  }>;
  caption: string;
  totalCount: number;
  canSend: boolean;
}

export interface MultiMediaStatusViewModel {
  batchId: string;
  label: string;
  isComplete: boolean;
  hasFailed: boolean;
  failedItems: string[];
  retryAvailable: boolean;
}

// ── View Model Builders ──

export function buildBatchViewModel(batch: MediaBatchRecord): MultiMediaBatchViewModel {
  const completedCount = batch.items.filter(i => i.status === "reconciled" || i.status === "uploaded").length;
  const failedCount = batch.items.filter(i => i.status === "failed").length;
  const overallProgress = batch.items.length > 0
    ? batch.items.reduce((sum, i) => sum + i.progress, 0) / batch.items.length
    : 0;

  return {
    batchId: batch.batchId,
    status: batch.status,
    totalCount: batch.items.length,
    completedCount,
    failedCount,
    caption: batch.caption,
    overallProgress,
    items: batch.items.map(item => ({
      itemId: item.itemId,
      batchIndex: item.batchIndex,
      status: item.status,
      progress: item.progress,
      previewUrl: item.localPreviewUrl,
      remoteUrl: item.remoteUrl,
      mediaKind: item.mediaKind,
      fileName: item.file.name,
      hasCaption: item.batchIndex === 0 && !!batch.caption,
    })),
  };
}

export function buildBatchStatusViewModel(batch: MediaBatchRecord): MultiMediaStatusViewModel {
  const failedItems = batch.items.filter(i => i.status === "failed").map(i => i.itemId);
  return {
    batchId: batch.batchId,
    label: batch.status === "completed"
      ? `${batch.items.length} items sent`
      : batch.status === "partial_failed"
      ? `${failedItems.length}/${batch.items.length} failed`
      : batch.status === "uploading"
      ? `Sending ${batch.items.length} items...`
      : `${batch.items.length} items pending`,
    isComplete: batch.status === "completed",
    hasFailed: failedItems.length > 0,
    failedItems,
    retryAvailable: failedItems.length > 0,
  };
}
