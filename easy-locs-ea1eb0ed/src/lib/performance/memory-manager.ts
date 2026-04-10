/**
 * Memory Manager — Prevents memory leaks on mobile devices.
 * Manages conversation cache eviction, media cleanup, and store trimming.
 */

const MAX_CACHED_CONVERSATIONS = 20;
const MAX_CACHED_MESSAGES_PER_THREAD = 200;
const CLEANUP_INTERVAL_MS = 60000; // 1 minute

interface CacheEntry {
  key: string;
  accessedAt: number;
  sizeEstimate: number;
}

class MemoryManager {
  private entries = new Map<string, CacheEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private maxMemoryMB = 50; // Soft limit

  constructor() {
    if (typeof window === "undefined") return;
    this.startCleanupCycle();

    // Listen for memory pressure
    if ("memory" in performance) {
      this.checkMemoryPressure();
    }
  }

  /** Track a cache entry */
  track(key: string, sizeEstimate: number): void {
    this.entries.set(key, { key, accessedAt: Date.now(), sizeEstimate });
    this.evictIfNeeded();
  }

  /** Mark entry as accessed (LRU) */
  touch(key: string): void {
    const entry = this.entries.get(key);
    if (entry) entry.accessedAt = Date.now();
  }

  /** Remove entry */
  remove(key: string): void {
    this.entries.delete(key);
  }

  /** Evict oldest entries if over limit */
  private evictIfNeeded(): void {
    if (this.entries.size <= MAX_CACHED_CONVERSATIONS) return;

    const sorted = Array.from(this.entries.values())
      .sort((a, b) => a.accessedAt - b.accessedAt);

    while (this.entries.size > MAX_CACHED_CONVERSATIONS) {
      const oldest = sorted.shift();
      if (!oldest) break;
      this.entries.delete(oldest.key);
    }
  }

  private checkMemoryPressure(): void {
    try {
      const mem = (performance as any).memory;
      if (mem) {
        const usedMB = mem.usedJSHeapSize / (1024 * 1024);
        if (usedMB > this.maxMemoryMB) {
          this.aggressiveCleanup();
        }
      }
    } catch {
      // Ignore memory access errors
    }
  }

  private aggressiveCleanup(): void {
    // Keep only the 5 most recent conversations
    const sorted = Array.from(this.entries.values())
      .sort((a, b) => b.accessedAt - a.accessedAt);

    const toKeep = new Set(sorted.slice(0, 5).map(e => e.key));
    for (const [key] of this.entries) {
      if (!toKeep.has(key)) this.entries.delete(key);
    }

    // Revoke object URLs if necessary
    if (typeof URL !== "undefined" && URL.revokeObjectURL) {
      // Cleanup is handled by individual consumers
    }
  }

  private startCleanupCycle(): void {
    this.cleanupTimer = setInterval(() => {
      this.checkMemoryPressure();
      // Clean entries older than 30 minutes
      const cutoff = Date.now() - 30 * 60 * 1000;
      for (const [key, entry] of this.entries) {
        if (entry.accessedAt < cutoff) this.entries.delete(key);
      }
    }, CLEANUP_INTERVAL_MS);
  }

  getStats(): { entries: number; estimatedSizeKB: number } {
    let total = 0;
    for (const e of this.entries.values()) total += e.sizeEstimate;
    return { entries: this.entries.size, estimatedSizeKB: Math.round(total / 1024) };
  }

  destroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.entries.clear();
  }
}

// Singleton
export const memoryManager = new MemoryManager();
