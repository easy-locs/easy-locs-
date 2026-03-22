/**
 * Performance Toolkit Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getMemorySnapshot,
  createMemoryMonitor,
  recordRender,
  getRenderBudgets,
  clearRenderMetrics,
  measureInteraction,
  scheduleRAF,
  getLoadedChunks,
  getTotalBundleSize,
  type MemorySnapshot,
  type RenderBudget,
  type LongTask,
  type ChunkInfo,
} from "@/lib/perf-toolkit";
import {
  debounce,
  throttle,
  createLRUCache,
  scheduleIdle,
  imageSrcSet,
} from "@/lib/performance";

/* ── Debounce ── */
describe("debounce", () => {
  it("delays execution", async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 50);
    debounced();
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 80));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

/* ── Throttle ── */
describe("throttle", () => {
  it("executes immediately then throttles", async () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 150));
    // trailing call fires
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

/* ── LRU Cache ── */
describe("createLRUCache", () => {
  it("stores and retrieves", () => {
    const cache = createLRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.get("a")).toBe(1);
    expect(cache.size).toBe(2);
  });

  it("evicts oldest entry", () => {
    const cache = createLRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.has("a")).toBe(false);
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("refreshes on get", () => {
    const cache = createLRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a"); // refresh "a"
    cache.set("c", 3); // should evict "b"
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
  });

  it("clears all entries", () => {
    const cache = createLRUCache<string, number>(5);
    cache.set("x", 1);
    cache.set("y", 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

/* ── Render Budget ── */
describe("Render Budget", () => {
  beforeEach(() => clearRenderMetrics());

  it("records render durations", () => {
    recordRender("TestComp", 5);
    recordRender("TestComp", 10);
    const budgets = getRenderBudgets();
    expect(budgets.length).toBe(1);
    expect(budgets[0].component).toBe("TestComp");
    expect(budgets[0].renderCount).toBe(2);
    expect(budgets[0].avgMs).toBeCloseTo(7.5, 0);
    expect(budgets[0].maxMs).toBe(10);
    expect(budgets[0].overBudget).toBe(false);
  });

  it("detects over-budget renders", () => {
    recordRender("SlowComp", 25);
    const budgets = getRenderBudgets(16);
    expect(budgets[0].overBudget).toBe(true);
  });

  it("clears metrics", () => {
    recordRender("A", 1);
    clearRenderMetrics();
    expect(getRenderBudgets()).toEqual([]);
  });
});

/* ── Memory Monitor ── */
describe("createMemoryMonitor", () => {
  it("creates monitor with start/stop", () => {
    const monitor = createMemoryMonitor({});
    expect(typeof monitor.start).toBe("function");
    expect(typeof monitor.stop).toBe("function");
    expect(typeof monitor.getSnapshots).toBe("function");
    expect(typeof monitor.getTrend).toBe("function");
  });

  it("getTrend returns stable with no data", () => {
    const monitor = createMemoryMonitor({});
    expect(monitor.getTrend()).toBe("stable");
  });

  it("getLatest returns null initially", () => {
    const monitor = createMemoryMonitor({});
    expect(monitor.getLatest()).toBeNull();
  });
});

/* ── Memory Snapshot ── */
describe("getMemorySnapshot", () => {
  it("returns null when performance.memory unavailable", () => {
    // jsdom doesn't have performance.memory
    const snap = getMemorySnapshot();
    expect(snap).toBeNull();
  });
});

/* ── Measure Interaction ── */
describe("measureInteraction", () => {
  it("returns a stop function that reports duration", async () => {
    const stop = measureInteraction("test-click");
    await new Promise((r) => setTimeout(r, 10));
    const duration = stop();
    expect(duration).toBeGreaterThan(0);
    expect(typeof duration).toBe("number");
  });
});

/* ── Bundle Analysis ── */
describe("getLoadedChunks", () => {
  it("returns array", () => {
    const chunks = getLoadedChunks();
    expect(Array.isArray(chunks)).toBe(true);
  });
});

describe("getTotalBundleSize", () => {
  it("returns size breakdown", () => {
    const sizes = getTotalBundleSize();
    expect(sizes).toHaveProperty("totalKB");
    expect(sizes).toHaveProperty("cachedKB");
    expect(sizes).toHaveProperty("transferredKB");
    expect(typeof sizes.totalKB).toBe("number");
  });
});

/* ── scheduleRAF ── */
describe("scheduleRAF", () => {
  it("batches calls into animation frame", async () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    scheduleRAF(fn1);
    scheduleRAF(fn2);
    // Should not be called synchronously
    expect(fn1).not.toHaveBeenCalled();
    // Wait for RAF
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });
});

/* ── imageSrcSet ── */
describe("imageSrcSet", () => {
  it("generates srcSet for supabase storage URLs", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/img.jpg";
    const result = imageSrcSet(url);
    expect(result).toContain("320w");
    expect(result).toContain("1280w");
  });

  it("returns empty for non-supabase URLs", () => {
    expect(imageSrcSet("https://example.com/img.jpg")).toBe("");
  });
});

/* ── scheduleIdle ── */
describe("scheduleIdle", () => {
  it("schedules work", () => {
    const fn = vi.fn();
    scheduleIdle(fn);
    // Non-blocking, just verify no error
    expect(fn).not.toHaveBeenCalled();
  });
});
