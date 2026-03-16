/**
 * Performance utilities for Easy-Locs
 * - Route prefetching on idle
 * - Image lazy loading helper
 * - Debounced callback
 */

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

/** Prefetch multiple routes */
export function prefetchRoutes(importFns: Array<() => Promise<unknown>>): void {
  importFns.forEach((fn, i) => {
    const delay = i * 200; // stagger to avoid network contention
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
  // For Supabase storage URLs, append width transform
  if (url.includes("supabase") && url.includes("/storage/")) {
    return widths.map(w => `${url}?width=${w} ${w}w`).join(", ");
  }
  return ""; // no transform available for external URLs
}

/** Measure a function's execution time (dev only) */
export function measurePerf<T>(label: string, fn: () => T): T {
  if (import.meta.env.DEV) {
    const start = performance.now();
    const result = fn();
    const elapsed = performance.now() - start;
    if (elapsed > 16) { // Only log slow operations (>1 frame)
      console.warn(`[perf] ${label}: ${elapsed.toFixed(1)}ms`);
    }
    return result;
  }
  return fn();
}
