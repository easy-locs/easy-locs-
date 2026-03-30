import { describe, it, expect, beforeEach, vi } from "vitest";
import { useBatchStore } from "./batch-store";
import { buildBatchViewModel, buildBatchStatusViewModel, issueBatchId } from "./batch-types";

// Mock browser APIs not available in jsdom
globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
globalThis.URL.revokeObjectURL = vi.fn();

function createMockFile(name: string, size: number = 1024, type: string = "image/jpeg"): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

// Reset store before each test
beforeEach(() => {
  const state = useBatchStore.getState();
  for (const batchId of state.batches.keys()) {
    state.removeBatch(batchId);
  }
});

describe("issueBatchId", () => {
  it("generates unique batch IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => issueBatchId()));
    expect(ids.size).toBe(50);
  });

  it("prefixes with batch_", () => {
    expect(issueBatchId()).toMatch(/^batch_/);
  });
});

describe("useBatchStore", () => {
  it("creates a batch with correct item count and order", () => {
    const store = useBatchStore.getState();
    const files = [createMockFile("a.jpg"), createMockFile("b.jpg"), createMockFile("c.jpg")];
    const batchId = store.createBatch("conv_1", files, "My caption");

    const batch = store.getBatch(batchId);
    expect(batch).toBeDefined();
    expect(batch!.items.length).toBe(3);
    expect(batch!.items[0].batchIndex).toBe(0);
    expect(batch!.items[1].batchIndex).toBe(1);
    expect(batch!.items[2].batchIndex).toBe(2);
    expect(batch!.items[0].totalCount).toBe(3);
    expect(batch!.caption).toBe("My caption");
    expect(batch!.captionPolicy).toBe("first_item");
    expect(batch!.status).toBe("pending");
  });

  it("tracks per-item status independently", () => {
    const store = useBatchStore.getState();
    const files = [createMockFile("a.jpg"), createMockFile("b.jpg"), createMockFile("c.jpg")];
    const batchId = store.createBatch("conv_1", files, "");

    const batch = store.getBatch(batchId)!;
    const item0 = batch.items[0].itemId;
    const item1 = batch.items[1].itemId;
    const item2 = batch.items[2].itemId;

    store.updateItemStatus(batchId, item0, "uploading");
    store.setItemRemoteUrl(batchId, item1, "https://cdn/b.jpg");
    store.setItemError(batchId, item2, "Network error");

    const updated = store.getBatch(batchId)!;
    expect(updated.items[0].status).toBe("uploading");
    expect(updated.items[1].status).toBe("uploaded");
    expect(updated.items[1].remoteUrl).toBe("https://cdn/b.jpg");
    expect(updated.items[2].status).toBe("failed");
    expect(updated.items[2].error).toBe("Network error");
  });

  it("computes batch status as partial_failed when some items fail", () => {
    const store = useBatchStore.getState();
    const files = [createMockFile("a.jpg"), createMockFile("b.jpg")];
    const batchId = store.createBatch("conv_1", files, "");
    const batch = store.getBatch(batchId)!;

    store.setItemRemoteUrl(batchId, batch.items[0].itemId, "https://cdn/a.jpg");
    store.setItemError(batchId, batch.items[1].itemId, "fail");

    expect(store.getBatch(batchId)!.status).toBe("partial_failed");
  });

  it("computes batch status as completed when all items uploaded", () => {
    const store = useBatchStore.getState();
    const files = [createMockFile("a.jpg"), createMockFile("b.jpg")];
    const batchId = store.createBatch("conv_1", files, "");
    const batch = store.getBatch(batchId)!;

    store.setItemRemoteUrl(batchId, batch.items[0].itemId, "https://cdn/a.jpg");
    store.setItemRemoteUrl(batchId, batch.items[1].itemId, "https://cdn/b.jpg");

    const final = store.getBatch(batchId)!;
    expect(final.status).toBe("completed");
    expect(final.completedAt).toBeGreaterThan(0);
  });

  it("tracks progress per item", () => {
    const store = useBatchStore.getState();
    const batchId = store.createBatch("conv_1", [createMockFile("a.jpg")], "");
    const itemId = store.getBatch(batchId)!.items[0].itemId;

    store.updateItemProgress(batchId, itemId, 50);
    expect(store.getBatch(batchId)!.items[0].progress).toBe(50);

    store.updateItemProgress(batchId, itemId, 100);
    expect(store.getBatch(batchId)!.items[0].progress).toBe(100);
  });

  it("cancels batch", () => {
    const store = useBatchStore.getState();
    const batchId = store.createBatch("conv_1", [createMockFile("a.jpg")], "");
    store.cancelBatch(batchId);
    expect(store.getBatch(batchId)!.status).toBe("cancelled");
  });

  it("getActiveBatches filters by conversationId and excludes completed/cancelled", () => {
    const store = useBatchStore.getState();
    const id1 = store.createBatch("conv_1", [createMockFile("a.jpg")], "");
    store.createBatch("conv_2", [createMockFile("b.jpg")], "");
    const id3 = store.createBatch("conv_1", [createMockFile("c.jpg")], "");
    store.cancelBatch(id3);

    const active = store.getActiveBatches("conv_1");
    expect(active.length).toBe(1);
    expect(active[0].batchId).toBe(id1);
  });
});

describe("buildBatchViewModel", () => {
  it("builds correct view model with caption on first item only", () => {
    const store = useBatchStore.getState();
    const batchId = store.createBatch("conv_1", [createMockFile("a.jpg"), createMockFile("b.jpg")], "Hello");
    const batch = store.getBatch(batchId)!;

    const vm = buildBatchViewModel(batch);
    expect(vm.totalCount).toBe(2);
    expect(vm.caption).toBe("Hello");
    expect(vm.items[0].hasCaption).toBe(true);
    expect(vm.items[1].hasCaption).toBe(false);
  });
});

describe("buildBatchStatusViewModel", () => {
  it("shows correct status labels", () => {
    const store = useBatchStore.getState();
    const batchId = store.createBatch("conv_1", [createMockFile("a.jpg"), createMockFile("b.jpg")], "");
    const batch = store.getBatch(batchId)!;

    const pending = buildBatchStatusViewModel(batch);
    expect(pending.label).toContain("pending");
    expect(pending.isComplete).toBe(false);

    store.setItemRemoteUrl(batchId, batch.items[0].itemId, "url1");
    store.setItemRemoteUrl(batchId, batch.items[1].itemId, "url2");
    const completed = buildBatchStatusViewModel(store.getBatch(batchId)!);
    expect(completed.isComplete).toBe(true);
    expect(completed.label).toContain("sent");
  });

  it("shows retry available on failures", () => {
    const store = useBatchStore.getState();
    const batchId = store.createBatch("conv_1", [createMockFile("a.jpg")], "");
    const batch = store.getBatch(batchId)!;
    store.setItemError(batchId, batch.items[0].itemId, "err");

    const status = buildBatchStatusViewModel(store.getBatch(batchId)!);
    expect(status.hasFailed).toBe(true);
    expect(status.retryAvailable).toBe(true);
    expect(status.failedItems.length).toBe(1);
  });
});
