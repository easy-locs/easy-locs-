/**
 * Fallback System — Graceful degradation when realtime fails.
 * Implements polling fallback, UI degradation mode.
 */

import { connectionManager } from "@/lib/network/connection-manager";

type FallbackFetcher = () => Promise<void>;

class FallbackSystem {
  private pollers = new Map<string, { fetcher: FallbackFetcher; intervalMs: number; timer?: ReturnType<typeof setInterval> }>();
  private realtimeHealthy = true;

  /** Register a polling fallback for a realtime subscription */
  register(name: string, fetcher: FallbackFetcher, intervalMs = 10000): () => void {
    this.pollers.set(name, { fetcher, intervalMs });
    return () => {
      const p = this.pollers.get(name);
      if (p?.timer) clearInterval(p.timer);
      this.pollers.delete(name);
    };
  }

  /** Called when realtime connection drops */
  activateFallbacks(): void {
    if (!this.realtimeHealthy) return; // Already in fallback
    this.realtimeHealthy = false;

    for (const [name, poller] of this.pollers) {
      if (poller.timer) clearInterval(poller.timer);
      poller.timer = setInterval(async () => {
        if (!connectionManager.isOnline()) return;
        try { await poller.fetcher(); } catch {}
      }, poller.intervalMs);
    }
  }

  /** Called when realtime recovers */
  deactivateFallbacks(): void {
    this.realtimeHealthy = true;
    for (const [, poller] of this.pollers) {
      if (poller.timer) {
        clearInterval(poller.timer);
        poller.timer = undefined;
      }
    }
  }

  isRealtimeHealthy(): boolean {
    return this.realtimeHealthy;
  }

  destroy(): void {
    this.deactivateFallbacks();
    this.pollers.clear();
  }
}

// Singleton
export const fallbackSystem = new FallbackSystem();
