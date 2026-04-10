const clickGuards = new Map<string, number>();
const CLICK_DEBOUNCE_MS = 1000;

export function withDoubleClickGuard<T extends (...args: unknown[]) => Promise<unknown>>(
  key: string,
  fn: T,
  debounceMs = CLICK_DEBOUNCE_MS,
): T {
  return (async (...args: unknown[]) => {
    const now = Date.now();
    const last = clickGuards.get(key) ?? 0;
    if (now - last < debounceMs) return undefined;
    clickGuards.set(key, now);
    try {
      return await fn(...args);
    } finally {
      setTimeout(() => clickGuards.delete(key), debounceMs);
    }
  }) as T;
}

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export function onOnline(callback: () => void): () => void {
  window.addEventListener("online", callback);
  return () => window.removeEventListener("online", callback);
}

const pendingQueue: Array<{ key: string; fn: () => Promise<void> }> = [];
let processingQueue = false;

export function queueWhenOffline(key: string, fn: () => Promise<void>): boolean {
  if (isOnline()) return false;
  pendingQueue.push({ key, fn });
  return true;
}

export async function processPendingQueue(): Promise<number> {
  if (processingQueue || !isOnline()) return 0;
  processingQueue = true;
  let processed = 0;
  while (pendingQueue.length > 0) {
    const item = pendingQueue.shift();
    if (item) {
      try {
        await item.fn();
        processed++;
      } catch {
        pendingQueue.unshift(item);
        break;
      }
    }
  }
  processingQueue = false;
  return processed;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { void processPendingQueue(); });
}

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback?: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => {
      if (fallback !== undefined) return _(fallback as never);
      reject(new Error(`Operation timed out after ${ms}ms`));
    }, ms);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    clearTimeout(timer!);
    return result;
  } catch (e) {
    clearTimeout(timer!);
    throw e;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 500,
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (i < maxRetries) {
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}

const sessionGuards = new Map<string, boolean>();

export function acquireSessionGuard(key: string): boolean {
  if (sessionGuards.get(key)) return false;
  sessionGuards.set(key, true);
  return true;
}

export function releaseSessionGuard(key: string): void {
  sessionGuards.delete(key);
}

export function withSessionGuard<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> | null {
  if (!acquireSessionGuard(key)) return null;
  return fn().finally(() => releaseSessionGuard(key));
}

export interface ResilienceTestResult {
  test: string;
  passed: boolean;
  details: string;
}

export function runResilienceChecks(): ResilienceTestResult[] {
  const results: ResilienceTestResult[] = [];

  results.push({
    test: "offline_detection",
    passed: typeof navigator !== "undefined" && "onLine" in navigator,
    details: `Online: ${isOnline()}`,
  });

  results.push({
    test: "storage_available",
    passed: (() => {
      try {
        localStorage.setItem("__resilience_test__", "1");
        localStorage.removeItem("__resilience_test__");
        return true;
      } catch { return false; }
    })(),
    details: "localStorage read/write test",
  });

  results.push({
    test: "pending_queue",
    passed: true,
    details: `Queued operations: ${pendingQueue.length}`,
  });

  results.push({
    test: "active_guards",
    passed: sessionGuards.size < 10,
    details: `Active session guards: ${sessionGuards.size}`,
  });

  return results;
}
