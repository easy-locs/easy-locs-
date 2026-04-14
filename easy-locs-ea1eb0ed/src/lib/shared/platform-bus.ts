/**
 * Platform Event Bus — Single nervous system for the entire application.
 *
 * Every module fires events here. Every module listens here.
 * Wallet ↔ Orbit ↔ Marketplace ↔ Property Management
 *
 * UNIFICATION (Task 4 + Task 7):
 * - Removed dot↔colon bridge to canonical bus (@/lib/platform-bus). The app is
 *   standardised on colon-notation (e.g. "wallet:payment_completed"). The secondary
 *   dot-notation bus is used solely for structured logging and is not bridged back.
 * - Added anti-storm dedup guard: cascade refresh events (dashboard:counters_refresh,
 *   dashboard:refresh, notifications:refresh, me:refresh) are deduplicated within a
 *   100ms window so a single user action triggers at most ONE invalidation chain.
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
  traceId?: string;
}

type EventListener = (event: PlatformEvent) => void;

const MAX_LISTENERS_PER_EVENT = 100;
const MAX_GLOBAL_LISTENERS = 80;

/**
 * Event types that are pure "refresh signals" — they carry no unique payload and
 * firing them N times within 100ms has exactly the same effect as firing once.
 * These are deduplicated to prevent cascade storms.
 */
const DEDUP_EVENT_PREFIXES = [
  "dashboard:counters_refresh",
  "dashboard:refresh",
  "notifications:refresh",
  "me:refresh",
];
const DEDUP_WINDOW_MS = 100;

let _correlationCounter = 0;
export function generateCorrelationId(prefix = "evt"): string {
  return `${prefix}-${Date.now()}-${++_correlationCounter}`;
}

export type EmitInterceptor = (type: string, payload: unknown, source: string) => "pass" | "block" | "enqueue";
export type ListenerTimingReporter = (type: string, durationMs: number, success: boolean) => void;

let _activeTraceId: string | null = null;

export function getActiveTraceId(): string | null {
  return _activeTraceId;
}

export function setActiveTraceId(traceId: string | null): string | null {
  const previous = _activeTraceId;
  _activeTraceId = traceId;
  return previous;
}

class PlatformBus {
  private listeners = new Map<string, Set<EventListener>>();
  private globalListeners = new Set<EventListener>();
  private eventLog: PlatformEvent[] = [];
  private readonly MAX_LOG = 150;
  private _devEmitCount = 0;
  private _devEmitTimer: ReturnType<typeof setInterval> | null = null;
  private _interceptors: EmitInterceptor[] = [];
  private _timingReporter: ListenerTimingReporter | null = null;

  /** Anti-storm guard: maps dedup-eligible event types → last dispatch timestamp */
  private _dedupWindow = new Map<string, number>();

  addInterceptor(interceptor: EmitInterceptor): () => void {
    this._interceptors.push(interceptor);
    return () => {
      this._interceptors = this._interceptors.filter((i) => i !== interceptor);
    };
  }

  setTimingReporter(reporter: ListenerTimingReporter): () => void {
    this._timingReporter = reporter;
    return () => { if (this._timingReporter === reporter) this._timingReporter = null; };
  }

  on(type: PlatformEventType | string, listener: EventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const set = this.listeners.get(type)!;
    if (set.size >= MAX_LISTENERS_PER_EVENT) {
      if (import.meta.env?.DEV) {
        console.warn(`[platform-bus] Fan-out limit reached for "${type}" (${MAX_LISTENERS_PER_EVENT}), listener not added`);
      }
      return () => {};
    }
    set.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  onAll(listener: EventListener): () => void {
    if (this.globalListeners.size >= MAX_GLOBAL_LISTENERS) {
      if (import.meta.env?.DEV) {
        console.warn(`[platform-bus] Global listener limit reached (${MAX_GLOBAL_LISTENERS}), listener not added`);
      }
      return () => {};
    }
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  onPrefix(prefix: string, listener: EventListener): () => void {
    if (this.globalListeners.size >= MAX_GLOBAL_LISTENERS) {
      if (import.meta.env?.DEV) {
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

  private _bypassDepth = 0;

  emitInternal<T = unknown>(
    type: PlatformEventType | string,
    payload: T,
    source: PlatformEvent["source"] | string,
    meta?: { userId?: string; orgId?: string; correlationId?: string; traceId?: string }
  ): void {
    this._bypassDepth++;
    try {
      this._emitCore(type, payload, source, meta, true);
    } finally {
      this._bypassDepth--;
    }
  }

  emit<T = unknown>(
    type: PlatformEventType | string,
    payload: T,
    source: PlatformEvent["source"] | string,
    meta?: { userId?: string; orgId?: string; correlationId?: string; traceId?: string }
  ): void {
    this._emitCore(type, payload, source, meta, false);
  }

  private _emitCore<T = unknown>(
    type: PlatformEventType | string,
    payload: T,
    source: PlatformEvent["source"] | string,
    meta: { userId?: string; orgId?: string; correlationId?: string; traceId?: string } | undefined,
    skipInterceptors: boolean,
  ): void {
    const now = Date.now();

    const isDedup = DEDUP_EVENT_PREFIXES.some((p) => (type as string).startsWith(p));
    if (isDedup) {
      const last = this._dedupWindow.get(type as string);
      if (last !== undefined && now - last < DEDUP_WINDOW_MS) {
        if (import.meta.env?.DEV) {
          console.debug(`[platform-bus] dedup dropped "${type}" (${now - last}ms since last)`);
        }
        return;
      }
      this._dedupWindow.set(type as string, now);
    }

    if (!skipInterceptors && this._bypassDepth === 0) {
      for (const interceptor of this._interceptors) {
        try {
          const verdict = interceptor(type as string, payload, source as string);
          if (verdict === "block" || verdict === "enqueue") {
            return;
          }
        } catch (interceptorErr) {
          console.error(`[platform-bus] interceptor error for "${type}":`, interceptorErr);
        }
      }
    }

    const traceId = meta?.traceId ?? _activeTraceId ?? meta?.correlationId ?? generateCorrelationId("trace");

    const event: PlatformEvent<T> = {
      type: type as PlatformEventType,
      payload,
      source: source as PlatformEvent["source"],
      userId: meta?.userId,
      orgId: meta?.orgId,
      timestamp: now,
      correlationId: meta?.correlationId ?? traceId,
      traceId,
    };

    this.eventLog.push(event);
    if (this.eventLog.length > this.MAX_LOG) {
      this.eventLog.splice(0, this.eventLog.length - this.MAX_LOG);
    }

    if (import.meta.env?.DEV) {
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

    const reporter = this._timingReporter;

    const previousTraceId = _activeTraceId;
    _activeTraceId = traceId;

    this.listeners.get(type)?.forEach((fn) => {
      const start = reporter ? performance.now() : 0;
      try {
        fn(event);
        if (reporter) reporter(type as string, performance.now() - start, true);
      } catch (e) {
        console.error(`[platform-bus] listener error for ${type}:`, e);
        if (reporter) reporter(type as string, performance.now() - start, false);
      }
    });

    this.globalListeners.forEach((fn) => {
      try { fn(event); } catch (e) { console.error(`[platform-bus] global listener error:`, e); }
    });

    _activeTraceId = previousTraceId;
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
    this._dedupWindow.clear();
    this._interceptors = [];
    this._timingReporter = null;
  }
}

// Singleton
export const platformBus = new PlatformBus();

/**
 * Install cross-module reactions.
 * Called once at app startup. Uses direct Zustand store updates instead of window events.
 *
 * TASK 4: The dot↔colon bridge to @/lib/platform-bus (canonical dot-notation bus) has been
 * removed. The shared platform bus is the single event backbone — colon-notation only.
 * The canonical bus at @/lib/platform-bus is kept for structured logging but no longer
 * receives/re-emits events back onto this bus (which was causing circular amplification).
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

  return () => unsubs.forEach((fn) => fn());
}
