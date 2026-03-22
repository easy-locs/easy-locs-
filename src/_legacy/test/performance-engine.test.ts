import { describe, it, expect } from "vitest";
import {
  perfMark, perfMeasure, getPerfLog, getSlowEntries,
  trackRender, getRenderStats, getExcessiveRenderers,
  getConnectionQuality, prefersReducedData,
  registerChunkSize, getTotalBundleSize,
  queueLazyLoad,
} from "@/lib/performance-engine";

describe("PASS55 AQ — Performance Engine", () => {
  it("records perf marks and measures", () => {
    perfMark("test-start");
    const entry = perfMeasure("test-op", "test-start");
    expect(entry).not.toBeNull();
    expect(entry!.name).toBe("test-op");
    expect(entry!.duration).toBeGreaterThanOrEqual(0);
    expect(getPerfLog().length).toBeGreaterThan(0);
  });

  it("filters slow entries", () => {
    const slow = getSlowEntries(999999);
    expect(slow).toEqual([]);
  });

  it("tracks component renders", () => {
    trackRender("TestComp", 5);
    trackRender("TestComp", 10);
    trackRender("FastComp", 1);
    const stats = getRenderStats();
    const tc = stats.find((s) => s.name === "TestComp");
    expect(tc?.count).toBe(2);
    expect(tc?.avgMs).toBe(7.5);
  });

  it("identifies excessive renderers", () => {
    for (let i = 0; i < 25; i++) trackRender("HeavyComp", 1);
    const excessive = getExcessiveRenderers(20);
    expect(excessive.some((e) => e.name === "HeavyComp")).toBe(true);
  });

  it("detects connection quality", () => {
    const q = getConnectionQuality();
    expect(["4g", "3g", "2g", "slow-2g", "offline", "unknown"]).toContain(q);
  });

  it("checks reduced data preference", () => {
    expect(typeof prefersReducedData()).toBe("boolean");
  });

  it("tracks bundle sizes", () => {
    registerChunkSize("main.js", 150000);
    registerChunkSize("vendor.js", 300000);
    const total = getTotalBundleSize();
    expect(total.totalBytes).toBe(450000);
    expect(total.chunks[0].name).toBe("vendor.js");
  });

  it("queues lazy loads", async () => {
    let loaded = false;
    queueLazyLoad(async () => { loaded = true; }, 1);
    await new Promise((r) => setTimeout(r, 50));
    expect(loaded).toBe(true);
  });
});
