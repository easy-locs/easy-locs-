/**
 * Advanced Performance Toolkit
 * Memory profiling, lazy hydration, render budgets, bundle analysis helpers.
 * Complements src/lib/performance.ts with deeper optimization utilities.
 */
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";

/* ─── Memory Profiler ─── */

export interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usagePercent: number;
}

/** Take a memory snapshot (Chrome only) */
export function getMemorySnapshot(): MemorySnapshot | null {
  if (typeof performance === "undefined") return null;
  const mem = (performance as any).memory;
  if (!mem) return null;
  return {
    timestamp: Date.now(),
    usedJSHeapSize: mem.usedJSHeapSize,
    totalJSHeapSize: mem.totalJSHeapSize,
    jsHeapSizeLimit: mem.jsHeapSizeLimit,
    usagePercent: Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100),
  };
}

/** Track memory over time, warn if threshold exceeded */
export function createMemoryMonitor(options: {
  intervalMs?: number;
  warnThresholdPercent?: number;
  onWarning?: (snapshot: MemorySnapshot) => void;
}) {
  const { intervalMs = 30_000, warnThresholdPercent = 80, onWarning } = options;
  const snapshots: MemorySnapshot[] = [];
  let timer: ReturnType<typeof setInterval> | null = null;

  const check = () => {
    const snap = getMemorySnapshot();
    if (!snap) return;
    snapshots.push(snap);
    if (snapshots.length > 100) snapshots.shift();
    if (snap.usagePercent >= warnThresholdPercent) {
      onWarning?.(snap);
    }
  };

  return {
    start() {
      check();
      timer = setInterval(check, intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    getSnapshots: () => [...snapshots],
    getLatest: () => snapshots[snapshots.length - 1] ?? null,
    getTrend(): "stable" | "growing" | "shrinking" {
      if (snapshots.length < 3) return "stable";
      const recent = snapshots.slice(-5);
      const first = recent[0].usedJSHeapSize;
      const last = recent[recent.length - 1].usedJSHeapSize;
      const change = (last - first) / first;
      if (change > 0.1) return "growing";
      if (change < -0.1) return "shrinking";
      return "stable";
    },
  };
}

/* ─── Render Budget ─── */

export interface RenderBudget {
  component: string;
  renderCount: number;
  totalMs: number;
  avgMs: number;
  maxMs: number;
  overBudget: boolean;
}

const renderMetrics = new Map<string, { count: number; totalMs: number; maxMs: number }>();

/** Record a render duration for a component */
export function recordRender(component: string, durationMs: number) {
  const existing = renderMetrics.get(component) || { count: 0, totalMs: 0, maxMs: 0 };
  existing.count++;
  existing.totalMs += durationMs;
  existing.maxMs = Math.max(existing.maxMs, durationMs);
  renderMetrics.set(component, existing);
}

/** Get render budget report (16ms = 60fps frame budget) */
export function getRenderBudgets(budgetMs = 16): RenderBudget[] {
  return Array.from(renderMetrics.entries()).map(([component, m]) => ({
    component,
    renderCount: m.count,
    totalMs: Math.round(m.totalMs * 10) / 10,
    avgMs: Math.round((m.totalMs / m.count) * 10) / 10,
    maxMs: Math.round(m.maxMs * 10) / 10,
    overBudget: m.maxMs > budgetMs,
  }));
}

/** Clear render metrics */
export function clearRenderMetrics() {
  renderMetrics.clear();
}

/* ─── useRenderProfiler Hook ─── */

/** Profile a component's render performance */
export function useRenderProfiler(componentName: string) {
  const renderStart = useRef(performance.now());

  useEffect(() => {
    const duration = performance.now() - renderStart.current;
    recordRender(componentName, duration);

    if (import.meta.env.DEV && duration > 16) {
      console.warn(`[perf] ${componentName} render: ${duration.toFixed(1)}ms (over 16ms budget)`);
    }
  });

  // Reset timer on each render
  renderStart.current = performance.now();
}

/* ─── Lazy Hydration ─── */

/** Defer rendering until element is visible (IntersectionObserver) */
export function useLazyHydration(options: {
  rootMargin?: string;
  threshold?: number;
} = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!ref.current || hydrated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHydrated(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: options.rootMargin ?? "200px",
        threshold: options.threshold ?? 0,
      }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hydrated, options.rootMargin, options.threshold]);

  return { ref, hydrated };
}

/* ─── Long Task Observer ─── */

export interface LongTask {
  name: string;
  startTime: number;
  duration: number;
  timestamp: number;
}

/** Observe long tasks (>50ms) using PerformanceObserver */
export function observeLongTasks(
  onTask: (task: LongTask) => void,
  maxTasks = 50
): (() => void) | null {
  if (typeof PerformanceObserver === "undefined") return null;

  try {
    const tasks: LongTask[] = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const task: LongTask = {
          name: entry.name,
          startTime: entry.startTime,
          duration: entry.duration,
          timestamp: Date.now(),
        };
        tasks.push(task);
        if (tasks.length > maxTasks) tasks.shift();
        onTask(task);
      }
    });

    observer.observe({ type: "longtask", buffered: true });
    return () => observer.disconnect();
  } catch {
    return null;
  }
}

/* ─── Bundle Size Tracker ─── */

export interface ChunkInfo {
  name: string;
  size: number;
  sizeKB: string;
  transferSize: number;
  cached: boolean;
  loadTimeMs: number;
}

/** Analyze loaded chunks via Performance API */
export function getLoadedChunks(): ChunkInfo[] {
  if (typeof performance === "undefined") return [];

  return performance
    .getEntriesByType("resource")
    .filter((e) => {
      const r = e as PerformanceResourceTiming;
      return r.name.endsWith(".js") || r.name.endsWith(".css");
    })
    .map((e) => {
      const r = e as PerformanceResourceTiming;
      const name = r.name.split("/").pop() || r.name;
      const size = r.decodedBodySize || 0;
      return {
        name,
        size,
        sizeKB: `${(size / 1024).toFixed(1)}KB`,
        transferSize: r.transferSize || 0,
        cached: r.transferSize === 0 && size > 0,
        loadTimeMs: Math.round(r.responseEnd - r.startTime),
      };
    })
    .sort((a, b) => b.size - a.size);
}

/** Get total bundle size loaded */
export function getTotalBundleSize(): { totalKB: number; cachedKB: number; transferredKB: number } {
  const chunks = getLoadedChunks();
  const totalBytes = chunks.reduce((s, c) => s + c.size, 0);
  const cachedBytes = chunks.filter((c) => c.cached).reduce((s, c) => s + c.size, 0);
  const transferredBytes = chunks.reduce((s, c) => s + c.transferSize, 0);
  return {
    totalKB: Math.round(totalBytes / 1024),
    cachedKB: Math.round(cachedBytes / 1024),
    transferredKB: Math.round(transferredBytes / 1024),
  };
}

/* ─── Interaction Responsiveness ─── */

/** Measure time from user action to UI update (INP-like) */
export function measureInteraction(label: string): () => number {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    if (import.meta.env.DEV && duration > 200) {
      console.warn(`[perf] Slow interaction "${label}": ${duration.toFixed(0)}ms`);
    }
    return duration;
  };
}

/* ─── RAF Scheduler ─── */

const rafQueue: Array<() => void> = [];
let rafScheduled = false;

/** Schedule work in the next animation frame, batching multiple calls */
export function scheduleRAF(fn: () => void) {
  rafQueue.push(fn);
  if (!rafScheduled) {
    rafScheduled = true;
    requestAnimationFrame(() => {
      const batch = rafQueue.splice(0);
      batch.forEach((f) => f());
      rafScheduled = false;
    });
  }
}

/* ─── useStableCallback ─── */

/** Returns a stable callback reference that always calls the latest version */
export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args: any[]) => ref.current(...args), []) as T;
}
