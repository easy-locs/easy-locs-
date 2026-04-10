/**
 * Batch Store — Zustand store for multi-media batch state.
 * Tracks all active batches with per-item status.
 */
import { create } from "zustand";
import type { MediaBatchRecord, BatchItemStatus, BatchStatus, BatchMediaItem } from "./batch-types";
import { issueBatchId } from "./batch-types";

interface BatchStoreState {
  batches: Map<string, MediaBatchRecord>;

  // ── Lifecycle ──
  createBatch: (conversationId: string, files: File[], caption: string) => string;
  cancelBatch: (batchId: string) => void;
  removeBatch: (batchId: string) => void;

  // ── Per-item updates ──
  updateItemStatus: (batchId: string, itemId: string, status: BatchItemStatus) => void;
  updateItemProgress: (batchId: string, itemId: string, progress: number) => void;
  setItemRemoteUrl: (batchId: string, itemId: string, url: string) => void;
  setItemOptimisticId: (batchId: string, itemId: string, messageId: string) => void;
  setItemError: (batchId: string, itemId: string, error: string) => void;

  // ── Batch-level status ──
  recomputeBatchStatus: (batchId: string) => void;

  // ── Queries ──
  getBatch: (batchId: string) => MediaBatchRecord | undefined;
  getActiveBatches: (conversationId: string) => MediaBatchRecord[];
}

function detectMediaKind(file: File): "image" | "video" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

function computeBatchStatus(items: BatchMediaItem[]): BatchStatus {
  if (items.every(i => i.status === "reconciled" || i.status === "uploaded")) return "completed";
  if (items.some(i => i.status === "failed") && items.some(i => i.status === "reconciled" || i.status === "uploaded")) return "partial_failed";
  if (items.some(i => i.status === "uploading")) return "uploading";
  if (items.every(i => i.status === "failed")) return "partial_failed";
  return "pending";
}

export const useBatchStore = create<BatchStoreState>((set, get) => ({
  batches: new Map(),

  createBatch: (conversationId, files, caption) => {
    const batchId = issueBatchId();
    const totalCount = files.length;

    const items: BatchMediaItem[] = files.map((file, index) => ({
      itemId: `${batchId}_item_${index}`,
      batchIndex: index,
      totalCount,
      file,
      localPreviewUrl: URL.createObjectURL(file),
      mediaKind: detectMediaKind(file),
      status: "pending" as const,
      progress: 0,
      remoteUrl: null,
      optimisticMessageId: null,
      error: null,
    }));

    const record: MediaBatchRecord = {
      batchId,
      conversationId,
      caption,
      captionPolicy: "first_item",
      items,
      status: "pending",
      createdAt: Date.now(),
      completedAt: null,
    };

    set(state => {
      const batches = new Map(state.batches);
      batches.set(batchId, record);
      return { batches };
    });

    return batchId;
  },

  cancelBatch: (batchId) => {
    set(state => {
      const batches = new Map(state.batches);
      const batch = batches.get(batchId);
      if (batch) {
        batches.set(batchId, { ...batch, status: "cancelled" });
      }
      return { batches };
    });
  },

  removeBatch: (batchId) => {
    set(state => {
      const batches = new Map(state.batches);
      const batch = batches.get(batchId);
      if (batch) {
        // Revoke blob URLs
        batch.items.forEach(item => {
          try { URL.revokeObjectURL(item.localPreviewUrl); } catch {}
        });
      }
      batches.delete(batchId);
      return { batches };
    });
  },

  updateItemStatus: (batchId, itemId, status) => {
    set(state => {
      const batches = new Map(state.batches);
      const batch = batches.get(batchId);
      if (!batch) return state;
      const items = batch.items.map(i => i.itemId === itemId ? { ...i, status } : i);
      batches.set(batchId, { ...batch, items, status: computeBatchStatus(items) });
      return { batches };
    });
  },

  updateItemProgress: (batchId, itemId, progress) => {
    set(state => {
      const batches = new Map(state.batches);
      const batch = batches.get(batchId);
      if (!batch) return state;
      const items = batch.items.map(i => i.itemId === itemId ? { ...i, progress } : i);
      batches.set(batchId, { ...batch, items });
      return { batches };
    });
  },

  setItemRemoteUrl: (batchId, itemId, url) => {
    set(state => {
      const batches = new Map(state.batches);
      const batch = batches.get(batchId);
      if (!batch) return state;
      const items = batch.items.map(i => i.itemId === itemId ? { ...i, remoteUrl: url, status: "uploaded" as const, progress: 100 } : i);
      const newStatus = computeBatchStatus(items);
      batches.set(batchId, {
        ...batch,
        items,
        status: newStatus,
        completedAt: newStatus === "completed" ? Date.now() : batch.completedAt,
      });
      return { batches };
    });
  },

  setItemOptimisticId: (batchId, itemId, messageId) => {
    set(state => {
      const batches = new Map(state.batches);
      const batch = batches.get(batchId);
      if (!batch) return state;
      const items = batch.items.map(i => i.itemId === itemId ? { ...i, optimisticMessageId: messageId } : i);
      batches.set(batchId, { ...batch, items });
      return { batches };
    });
  },

  setItemError: (batchId, itemId, error) => {
    set(state => {
      const batches = new Map(state.batches);
      const batch = batches.get(batchId);
      if (!batch) return state;
      const items = batch.items.map(i => i.itemId === itemId ? { ...i, error, status: "failed" as const } : i);
      batches.set(batchId, { ...batch, items, status: computeBatchStatus(items) });
      return { batches };
    });
  },

  recomputeBatchStatus: (batchId) => {
    set(state => {
      const batches = new Map(state.batches);
      const batch = batches.get(batchId);
      if (!batch) return state;
      const newStatus = computeBatchStatus(batch.items);
      batches.set(batchId, {
        ...batch,
        status: newStatus,
        completedAt: newStatus === "completed" ? Date.now() : batch.completedAt,
      });
      return { batches };
    });
  },

  getBatch: (batchId) => get().batches.get(batchId),

  getActiveBatches: (conversationId) => {
    const result: MediaBatchRecord[] = [];
    for (const batch of get().batches.values()) {
      if (batch.conversationId === conversationId && batch.status !== "completed" && batch.status !== "cancelled") {
        result.push(batch);
      }
    }
    return result;
  },
}));
