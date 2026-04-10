/**
 * SUBSCRIPTION REGISTRY — Singleton anti-duplication layer for all realtime subscriptions.
 *
 * Rules:
 * 1. One subscription per key — period.
 * 2. Re-registering an existing key returns existing unsubscribe (no new channel).
 * 3. clearAll() on logout/reset kills everything.
 * 4. listSubscriptions() for observability.
 *
 * Usage:
 *   const unsub = registerSubscription("orbit.messages:conv123", () => {
 *     const ch = createRealtimeChannel(...).subscribe();
 *     return () => removeRealtimeChannel(ch);
 *   });
 */

type Unsubscribe = () => void;

interface SubscriptionEntry {
  key: string;
  unsubscribe: Unsubscribe;
  createdAt: number;
  domain: string;
}

const registry = new Map<string, SubscriptionEntry>();

/**
 * Register a unique subscription. If key already exists, returns existing cleanup fn.
 * @param key - Unique subscription key (e.g., "orbit.messages:conv123")
 * @param subscribeFn - Factory that sets up the channel and returns an unsubscribe fn
 * @returns Unsubscribe function that removes from registry + cleans up channel
 */
export function registerSubscription(key: string, subscribeFn: () => Unsubscribe): Unsubscribe {
  const existing = registry.get(key);
  if (existing) {
    if (import.meta.env.DEV) {
      console.debug(`[SubRegistry] BLOCKED duplicate: ${key} (active since ${new Date(existing.createdAt).toISOString()})`);
    }
    return existing.unsubscribe;
  }

  const domain = key.split(".")[0] || key.split(":")[0] || "unknown";
  const rawUnsub = subscribeFn();

  const wrappedUnsub: Unsubscribe = () => {
    rawUnsub();
    registry.delete(key);
    if (import.meta.env.DEV) {
      console.debug(`[SubRegistry] REMOVED: ${key} (remaining: ${registry.size})`);
    }
  };

  registry.set(key, {
    key,
    unsubscribe: wrappedUnsub,
    createdAt: Date.now(),
    domain,
  });

  if (import.meta.env.DEV) {
    console.debug(`[SubRegistry] REGISTERED: ${key} (total: ${registry.size})`);
  }

  return wrappedUnsub;
}

/**
 * Force-remove a subscription by key.
 */
export function removeSubscription(key: string): void {
  const entry = registry.get(key);
  if (entry) {
    entry.unsubscribe();
  }
}

/**
 * Check if a subscription key is currently active.
 */
export function hasSubscription(key: string): boolean {
  return registry.has(key);
}

/**
 * List all active subscription keys (for debugging/monitoring).
 */
export function listSubscriptions(): string[] {
  return Array.from(registry.keys());
}

/**
 * Get detailed subscription info (for health monitoring).
 */
export function getSubscriptionHealth(): {
  count: number;
  byDomain: Record<string, number>;
  keys: string[];
  oldestAge: number | null;
} {
  const byDomain: Record<string, number> = {};
  let oldestAt = Infinity;

  for (const entry of registry.values()) {
    byDomain[entry.domain] = (byDomain[entry.domain] || 0) + 1;
    if (entry.createdAt < oldestAt) oldestAt = entry.createdAt;
  }

  return {
    count: registry.size,
    byDomain,
    keys: Array.from(registry.keys()),
    oldestAge: registry.size > 0 ? Date.now() - oldestAt : null,
  };
}

/**
 * Clear ALL subscriptions. Call on logout, session reset, or full teardown.
 */
export function clearAllSubscriptions(): void {
  const count = registry.size;
  for (const entry of registry.values()) {
    try {
      entry.unsubscribe();
    } catch {
      // Swallow — cleanup best effort
    }
  }
  // Registry already cleared by individual unsubscribe calls,
  // but force-clear in case any unsubscribe failed to self-remove
  registry.clear();

  if (import.meta.env.DEV) {
    console.debug(`[SubRegistry] CLEARED ALL (was: ${count})`);
  }
}
