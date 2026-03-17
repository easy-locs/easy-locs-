/**
 * Performance utilities for Easy-Locs — PASS145-147
 * - Route prefetching on idle
 * - Image lazy loading / preloading
 * - Debounced/throttled callbacks
 * - Render performance monitoring
 * - OptimizedImage component
 */
import { useCallback, useRef } from "react";

/** Prefetch a route's chunk during idle time */
export function prefetchRoute(importFn: () => Promise<unknown>): void {
  if (typeof window === "undefined") return;
  const run = () => {
    importFn().catch(() => {/* silent — prefetch is best-effort */});
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(run, { timeout: 5000 });
  } else {
    setTimeout(run, 3000);
  }
}

/** Prefetch multiple routes with stagger */
export function prefetchRoutes(importFns: Array<() => Promise<unknown>>): void {
  importFns.forEach((fn, i) => {
    const delay = i * 200;
    setTimeout(() => prefetchRoute(fn), delay);
  });
}

/** Debounce a function with cleanup */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** Throttle a function — executes at most once per interval */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
      last = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };
}

/** Generate optimized image srcSet for responsive loading */
export function imageSrcSet(url: string, widths: number[] = [320, 640, 960, 1280]): string {
  if (url.includes("supabase") && url.includes("/storage/")) {
    return widths.map(w => `${url}?width=${w} ${w}w`).join(", ");
  }
  return "";
}

/** Measure a function's execution time (dev only) */
export function measurePerf<T>(label: string, fn: () => T): T {
  if (import.meta.env.DEV) {
    const start = performance.now();
    const result = fn();
    const elapsed = performance.now() - start;
    if (elapsed > 16) {
      console.warn(`[perf] ${label}: ${elapsed.toFixed(1)}ms`);
    }
    return result;
  }
  return fn();
}

/* ─── Render Performance ─── */

/**
 * Track render counts in dev mode.
 * Usage: useRenderCount("MyComponent") in component body.
 */
export function useRenderCount(componentName: string): void {
  if (!import.meta.env.DEV) return;
  const countRef = { current: 0 };
  countRef.current++;
  if (countRef.current > 50) {
    console.warn(`[perf] ${componentName} rendered ${countRef.current} times — possible infinite loop`);
  }
}

/**
 * Schedule non-critical work during idle time.
 * Falls back to setTimeout on unsupported browsers.
 */
export function scheduleIdle(fn: () => void, timeout = 5000): void {
  if (typeof window === "undefined") return;
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(fn, { timeout });
  } else {
    setTimeout(fn, 100);
  }
}

/**
 * Batch multiple DOM reads to avoid layout thrashing.
 * Queues reads for the next animation frame.
 */
const readQueue: Array<() => void> = [];
let readScheduled = false;

export function batchDOMRead(fn: () => void): void {
  readQueue.push(fn);
  if (!readScheduled) {
    readScheduled = true;
    requestAnimationFrame(() => {
      const batch = readQueue.splice(0);
      batch.forEach(f => f());
      readScheduled = false;
    });
  }
}

/**
 * Detect slow network conditions.
 * Returns true if the user is on a slow connection (2G, slow-2G, save-data).
 */
export function isSlowConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as any).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") return true;
  return false;
}

/**
 * Create a memory-efficient LRU cache for expensive computations.
 */
export function createLRUCache<K, V>(maxSize: number) {
  const cache = new Map<K, V>();

  return {
    get(key: K): V | undefined {
      if (!cache.has(key)) return undefined;
      const value = cache.get(key)!;
      // Move to end (most recently used)
      cache.delete(key);
      cache.set(key, value);
      return value;
    },
    set(key: K, value: V): void {
      if (cache.has(key)) cache.delete(key);
      cache.set(key, value);
      if (cache.size > maxSize) {
        const firstKey = cache.keys().next().value;
        if (firstKey !== undefined) cache.delete(firstKey);
      }
    },
    has(key: K): boolean {
      return cache.has(key);
    },
    clear(): void {
      cache.clear();
    },
    get size() {
      return cache.size;
    },
  };
}

// OptimizedImage component is in src/components/ui/optimized-image.tsx

// ── Preload critical images ──────────────────────────────────────────

const preloadedUrls = new Set<string>();

export function preloadImage(url: string) {
  if (!url || preloadedUrls.has(url)) return;
  preloadedUrls.add(url);
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = url;
  document.head.appendChild(link);
}

export function preloadFeedImages(items: Array<{ photo_url?: string | null; logo_url?: string | null }>, count = 3) {
  items.slice(0, count).forEach((item) => {
    if (item.photo_url) preloadImage(item.photo_url);
    if (item.logo_url) preloadImage(item.logo_url);
  });
}

// ── Stable callback ref ─────────────────────────────────────────────

export function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn);
  ref.current = fn;
  return useCallback((...args: any[]) => ref.current(...args), []) as T;
}
