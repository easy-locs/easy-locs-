/**
 * Platform Event Bus — Single nervous system for the entire application.
 * 
 * Every module fires events here. Every module listens here.
 * Wallet ↔ Orbit ↔ Marketplace ↔ Property Management
 */

/**
 * PlatformEventType — derived from the canonical APP_EVENTS constant map.
 *
 * DEDUPLICATION FIX: Previously this file maintained a 450-line manual union type that
 * duplicated APP_EVENTS (src/lib/platform/events.ts) and contained internal duplicates
 * (e.g. 'wallet:transfer_completed' appeared twice). The canonical source of truth is
 * APP_EVENTS. PlatformEventType is now AppEventKey | (string & {}) to:
 *   1. Provide autocomplete/type-safety for all canonical events via AppEventKey
 *   2. Still accept dynamic event strings for backward compatibility
 *   3. Eliminate the maintenance burden of a parallel union list
 */
import type { AppEventKey } from "@/lib/platform/events";

type PlatformEventType = AppEventKey | (string & {});

export type { PlatformEventType };

export interface StorefrontOrderPayload {
  orderId: string;
  shopId?: string;
  total?: number;
  requiresDelivery?: boolean;
  __bridged?: boolean;
}

export interface StorefrontCartPayload {
  shopId: string;
  __bridged?: boolean;
}

export interface StorefrontDealPayload {
  dealId: string;
  shopId?: string;
  orderId?: string;
  __bridged?: boolean;
}

export interface StorefrontDeliveryPayload {
  orderId?: string;
  jobId?: string;
  shopId?: string;
  source?: string;
  __bridged?: boolean;
}

export interface StorefrontReviewPayload {
  shopId: string;
  __bridged?: boolean;
}

export interface StorefrontStockPayload {
  itemTitle: string;
  remaining: number;
  __bridged?: boolean;
}

export interface StorefrontTrustPayload {
  shopId: string;
  score?: number;
  __bridged?: boolean;
}

export interface StorefrontLoyaltyPayload {
  shopId: string;
  points: number;
  __bridged?: boolean;
}

export interface StorefrontRiskPayload {
  shopId: string;
  severity: "critical" | "warning" | "info";
  reason: string;
  __bridged?: boolean;
}

export interface StorefrontGrowthPayload {
  shopId: string;
  milestone: string;
  __bridged?: boolean;
}

export interface WalletPaymentPayload {
  referenceType?: string;
  referenceId?: string;
  requiresDelivery?: boolean;
  amount?: number;
  currency?: string;
  __bridged?: boolean;
}

export interface PlatformEvent<T = unknown> {
  type: PlatformEventType;
  payload: T;
  source: "wallet" | "orbit" | "marketplace" | "pm" | "system" | "tracking";
  userId?: string;
  orgId?: string;
  timestamp: number;
  correlationId?: string;
}

type EventListener = (event: PlatformEvent) => void;

const MAX_LISTENERS_PER_EVENT = 50;
const MAX_GLOBAL_LISTENERS = 30;

let _correlationCounter = 0;
export function generateCorrelationId(prefix = "evt"): string {
  return `${prefix}-${Date.now()}-${++_correlationCounter}`;
}

class PlatformBus {
  private listeners = new Map<string, Set<EventListener>>();
  private globalListeners = new Set<EventListener>();
  private eventLog: PlatformEvent[] = [];
  private readonly MAX_LOG = 150;
  private _devEmitCount = 0;
  private _devEmitTimer: ReturnType<typeof setInterval> | null = null;

  on(type: PlatformEventType | string, listener: EventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const set = this.listeners.get(type)!;
    if (set.size >= MAX_LISTENERS_PER_EVENT) {
      if (import.meta.env.DEV) {
        console.warn(`[platform-bus] Fan-out limit reached for "${type}" (${MAX_LISTENERS_PER_EVENT}), listener not added`);
      }
      return () => {};
    }
    set.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  onAll(listener: EventListener): () => void {
    if (this.globalListeners.size >= MAX_GLOBAL_LISTENERS) {
      if (import.meta.env.DEV) {
        console.warn(`[platform-bus] Global listener limit reached (${MAX_GLOBAL_LISTENERS}), listener not added`);
      }
      return () => {};
    }
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  onPrefix(prefix: string, listener: EventListener): () => void {
    if (this.globalListeners.size >= MAX_GLOBAL_LISTENERS) {
      if (import.meta.env.DEV) {
        console.warn(`[platform-bus] Global listener limit reached (${MAX_GLOBAL_LISTENERS}), prefix listener for "${prefix}" not added`);
      }
      return () => {};
    }
    const wrappedListener: EventListener = (event) => {
      if (event.type.startsWith(prefix)) listener(event);
    };
    this.globalListeners.add(wrappedListener);
    return () => this.globalListeners.delete(wrappedListener);
  }

  emit<T = unknown>(
    type: PlatformEventType | string,
    payload: T,
    source: PlatformEvent["source"] | string,
    meta?: { userId?: string; orgId?: string; correlationId?: string }
  ): void {
    const event: PlatformEvent<T> = {
      type: type as PlatformEventType,
      payload,
      source: source as PlatformEvent["source"],
      userId: meta?.userId,
      orgId: meta?.orgId,
      timestamp: Date.now(),
      correlationId: meta?.correlationId,
    };

    this.eventLog.push(event);
    if (this.eventLog.length > this.MAX_LOG) {
      this.eventLog.splice(0, this.eventLog.length - this.MAX_LOG);
    }

    if (import.meta.env.DEV) {
      this._devEmitCount++;
      if (!this._devEmitTimer) {
        this._devEmitTimer = setInterval(() => {
          if (this._devEmitCount > 0) {
            console.debug(`[platform-bus] ${this._devEmitCount} events/sec`);
          }
          this._devEmitCount = 0;
        }, 1000);
      }
    }

    this.listeners.get(type)?.forEach((fn) => {
      try { fn(event); } catch (e) { console.error(`[platform-bus] listener error for ${type}:`, e); }
    });

    this.globalListeners.forEach((fn) => {
      try { fn(event); } catch (e) { console.error(`[platform-bus] global listener error:`, e); }
    });
  }

  getLog(): PlatformEvent[] {
    return [...this.eventLog];
  }

  /** Alias for admin monitoring (merged from orchestration bus) */
  getLogs() {
    return this.eventLog.map((e, i) => ({
      id: `${i}-${e.timestamp}`,
      event: e.type,
      payload: e.payload,
      createdAt: new Date(e.timestamp).toISOString(),
      source: typeof e.source === "string" ? e.source : undefined,
    }));
  }

  getRegisteredEvents(): string[] {
    return Array.from(this.listeners.keys());
  }

  getListenerStats(): { totalTyped: number; totalGlobal: number; byEvent: Record<string, number> } {
    let totalTyped = 0;
    const byEvent: Record<string, number> = {};
    for (const [type, set] of this.listeners) {
      byEvent[type] = set.size;
      totalTyped += set.size;
    }
    return { totalTyped, totalGlobal: this.globalListeners.size, byEvent };
  }

  clearLogs(): void {
    this.eventLog = [];
  }

  clear(): void {
    this.listeners.clear();
    this.globalListeners.clear();
  }
}

// Singleton
export const platformBus = new PlatformBus();

/**
 * Install cross-module reactions.
 * Called once at app startup. Uses direct Zustand store updates instead of window events.
 */
export function installPlatformReactions(): () => void {
  const unsubs: (() => void)[] = [];

  // V2: Targeted module refresh — map event prefixes to specific modules
  const refreshModule = (module: import("@/stores/orbit-engine").OrbitModule) => {
    import("@/stores/orbit-engine").then(({ useOrbitEngine }) => {
      const state = useOrbitEngine.getState();
      const userId = state.lastRefreshUserId;
      const orgId = state.lastRefreshOrgId ?? undefined;
      if (userId) state.refreshModule(module, userId, orgId);
    }).catch(() => {});
  };

  // ── Wallet events → refresh wallet module only ──
  // NOTE: Only colon-notation prefix. Dot-notation events are bridged to colon by the notation bridge below.
  unsubs.push(
    platformBus.onPrefix("wallet:", () => refreshModule("wallet"))
  );

  // ── Marketplace events → refresh business module ──
  unsubs.push(
    platformBus.onPrefix("marketplace:", () => refreshModule("business"))
  );

  // ── PM events → refresh business module ──
  unsubs.push(
    platformBus.onPrefix("pm:", () => refreshModule("business"))
  );

  // ── Deal events → refresh business module ──
  unsubs.push(
    platformBus.onPrefix("deal:", () => refreshModule("business"))
  );

  // ── Orbit communication events → refresh communication module ──
  unsubs.push(
    platformBus.onPrefix("orbit:", () => refreshModule("communication"))
  );

  // ── Booking events → refresh business module ──
  unsubs.push(
    platformBus.onPrefix("booking:", () => refreshModule("business"))
  );

  // ── Currency changed → propagate via custom event for legacy components ──
  unsubs.push(
    platformBus.on("system:currency_changed", (event) => {
      window.dispatchEvent(new CustomEvent("currency:changed", { detail: event.payload }));
    })
  );

  try {
    import("@/lib/platform-bus").then(({ platformBus: canonicalBus }) => {
      unsubs.push(
        platformBus.onAll((event) => {
          if ((event.payload as Record<string, unknown>)?.__bridged) return;
          const domainMap: Record<string, import("@/lib/platform-bus").PlatformEventDomain> = {
            wallet: "wallet", orbit: "orbit", marketplace: "listing",
            pm: "listing", system: "system", tracking: "system",
          };
          const domain = domainMap[event.source] || "system";
          canonicalBus.emit(event.type, domain, event.payload, {
            user_id_safe: event.userId,
          });
        })
      );
    }).catch(() => {});
  } catch {}

  return () => unsubs.forEach((fn) => fn());
}
