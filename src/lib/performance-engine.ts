/**
 * PASS55 Block AQ — Performance Engine
 * Runtime performance monitoring, lazy loading orchestration, and resource hints.
 */

// ─── Performance Observer ────────────────────────────────────────────────────

export interface PerfEntry {
  name: string;
  duration: number;
  startTime: number;
  entryType: string;
  timestamp: number;
}

const perfLog: PerfEntry[] = [];
const MAX_LOG = 500;

/** Start a named performance mark */
export function perfMark(name: string): void {
  if (typeof performance !== "undefined") {
    performance.mark(name);
  }
}

/** End a performance mark and record duration */
export function perfMeasure(name: string, startMark: string): PerfEntry | null {
  if (typeof performance === "undefined") return null;
  try {
    const measure = performance.measure(name, startMark);
    const entry: PerfEntry = {
      name,
      duration: measure.duration,
      startTime: measure.startTime,
      entryType: "measure",
      timestamp: Date.now(),
    };
    perfLog.push(entry);
    if (perfLog.length > MAX_LOG) perfLog.splice(0, perfLog.length - MAX_LOG);
    return entry;
  } catch {
    return null;
  }
}

/** Get all recorded performance entries */
export function getPerfLog(): PerfEntry[] {
  return [...perfLog];
}

/** Get entries slower than threshold */
export function getSlowEntries(thresholdMs: number): PerfEntry[] {
  return perfLog.filter((e) => e.duration > thresholdMs);
}

// ─── Component Render Tracker ────────────────────────────────────────────────

const renderCounts = new Map<string, { count: number; totalMs: number; lastMs: number }>();

/** Track a component render */
export function trackRender(componentName: string, durationMs: number): void {
  const existing = renderCounts.get(componentName) || { count: 0, totalMs: 0, lastMs: 0 };
  renderCounts.set(componentName, {
    count: existing.count + 1,
    totalMs: existing.totalMs + durationMs,
    lastMs: durationMs,
  });
}

/** Get render stats for all tracked components */
export function getRenderStats() {
  const stats: Array<{ name: string; count: number; avgMs: number; lastMs: number; totalMs: number }> = [];
  renderCounts.forEach((v, name) => {
    stats.push({ name, count: v.count, avgMs: Math.round(v.totalMs / v.count * 100) / 100, lastMs: v.lastMs, totalMs: v.totalMs });
  });
  return stats.sort((a, b) => b.totalMs - a.totalMs);
}

/** Identify components that render excessively */
export function getExcessiveRenderers(threshold = 20): Array<{ name: string; count: number }> {
  return getRenderStats().filter((s) => s.count > threshold).map(({ name, count }) => ({ name, count }));
}

// ─── Resource Hints ──────────────────────────────────────────────────────────

/** Add a preload hint for a resource */
export function preloadResource(href: string, as: "script" | "style" | "image" | "font" | "fetch"): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[rel="preload"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "preload";
  link.href = href;
  link.as = as;
  if (as === "font") link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

/** Add a prefetch hint */
export function prefetchResource(href: string): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[rel="prefetch"][href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = href;
  document.head.appendChild(link);
}

/** Add a preconnect hint for a domain */
export function preconnectDomain(origin: string): void {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = origin;
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

// ─── Lazy Loading Orchestrator ───────────────────────────────────────────────

type LazyModule = () => Promise<unknown>;
const moduleQueue: Array<{ loader: LazyModule; priority: number }> = [];
let isProcessing = false;

/** Queue a module for deferred loading with priority (lower = sooner) */
export function queueLazyLoad(loader: LazyModule, priority = 10): void {
  moduleQueue.push({ loader, priority });
  moduleQueue.sort((a, b) => a.priority - b.priority);
  if (!isProcessing) processQueue();
}

async function processQueue() {
  if (isProcessing || moduleQueue.length === 0) return;
  isProcessing = true;
  while (moduleQueue.length > 0) {
    const item = moduleQueue.shift()!;
    try {
      await item.loader();
    } catch (e) {
      console.debug("[perf-engine] lazy load failed:", e);
    }
    // Yield to main thread between loads
    await new Promise((r) => setTimeout(r, 0));
  }
  isProcessing = false;
}

// ─── Memory Monitor ──────────────────────────────────────────────────────────

export interface MemorySnapshot {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercent: number;
  timestamp: number;
}

/** Take a memory snapshot (Chrome only) */
export function getMemorySnapshot(): MemorySnapshot | null {
  if (typeof performance === "undefined" || !(performance as any).memory) return null;
  const mem = (performance as any).memory;
  return {
    usedJSHeapSize: mem.usedJSHeapSize,
    totalJSHeapSize: mem.totalJSHeapSize,
    jsHeapSizeLimit: mem.jsHeapSizeLimit,
    usagePercent: Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100),
    timestamp: Date.now(),
  };
}

// ─── Bundle Size Tracker ─────────────────────────────────────────────────────

const chunkSizes = new Map<string, number>();

/** Register a chunk size for tracking */
export function registerChunkSize(chunkName: string, sizeBytes: number): void {
  chunkSizes.set(chunkName, sizeBytes);
}

/** Get total tracked bundle size */
export function getTotalBundleSize(): { totalBytes: number; chunks: Array<{ name: string; bytes: number }> } {
  let total = 0;
  const chunks: Array<{ name: string; bytes: number }> = [];
  chunkSizes.forEach((bytes, name) => {
    total += bytes;
    chunks.push({ name, bytes });
  });
  chunks.sort((a, b) => b.bytes - a.bytes);
  return { totalBytes: total, chunks };
}

// ─── Network Quality Detection ───────────────────────────────────────────────

export type ConnectionQuality = "4g" | "3g" | "2g" | "slow-2g" | "offline" | "unknown";

/** Detect current network quality */
export function getConnectionQuality(): ConnectionQuality {
  if (typeof navigator === "undefined") return "unknown";
  if (!navigator.onLine) return "offline";
  const conn = (navigator as any).connection;
  if (conn?.effectiveType) return conn.effectiveType as ConnectionQuality;
  return "unknown";
}

/** Check if user prefers reduced data */
export function prefersReducedData(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as any).connection;
  return conn?.saveData === true;
}
