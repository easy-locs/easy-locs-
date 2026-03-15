/**
 * Platform Event Bus — Single nervous system for the entire application.
 * 
 * Every module fires events here. Every module listens here.
 * Wallet ↔ Orbit ↔ Marketplace ↔ Property Management
 */

type PlatformEventType =
  // Wallet
  | "wallet:balance_updated"
  | "wallet:payment_completed"
  | "wallet:payment_failed"
  | "wallet:locs_purchased"
  | "wallet:transfer_sent"
  | "wallet:transfer_received"
  // Orbit / Communication
  | "orbit:message_sent"
  | "orbit:call_started"
  | "orbit:call_ended"
  | "orbit:thread_created"
  | "orbit:notification_created"
  // Marketplace
  | "marketplace:listing_published"
  | "marketplace:listing_paused"
  | "marketplace:booking_created"
  | "marketplace:booking_confirmed"
  | "marketplace:booking_paid"
  | "marketplace:booking_completed"
  | "marketplace:booking_cancelled"
  | "marketplace:review_submitted"
  // Property Management
  | "pm:lease_created"
  | "pm:lease_activated"
  | "pm:rent_call_created"
  | "pm:payment_received"
  | "pm:receipt_generated"
  | "pm:intervention_created"
  | "pm:document_shared"
  // Deals
  | "deal:created"
  | "deal:offer_sent"
  | "deal:accepted"
  | "deal:cancelled"
  // Tracking
  | "tracking:started"
  | "tracking:position_updated"
  | "tracking:status_changed"
  | "tracking:completed"
  // System
  | "system:currency_changed"
  | "system:sync_completed"
  | "system:user_online";

export type { PlatformEventType };

export interface PlatformEvent<T = unknown> {
  type: PlatformEventType;
  payload: T;
  source: "wallet" | "orbit" | "marketplace" | "pm" | "system" | "tracking";
  userId?: string;
  orgId?: string;
  timestamp: number;
}

type EventListener = (event: PlatformEvent) => void;

class PlatformBus {
  private listeners = new Map<string, Set<EventListener>>();
  private globalListeners = new Set<EventListener>();
  private eventLog: PlatformEvent[] = [];
  private readonly MAX_LOG = 200;

  on(type: PlatformEventType, listener: EventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  onAll(listener: EventListener): () => void {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  onPrefix(prefix: string, listener: EventListener): () => void {
    const wrappedListener: EventListener = (event) => {
      if (event.type.startsWith(prefix)) listener(event);
    };
    this.globalListeners.add(wrappedListener);
    return () => this.globalListeners.delete(wrappedListener);
  }

  emit<T = unknown>(
    type: PlatformEventType,
    payload: T,
    source: PlatformEvent["source"],
    meta?: { userId?: string; orgId?: string }
  ): void {
    const event: PlatformEvent<T> = {
      type,
      payload,
      source,
      userId: meta?.userId,
      orgId: meta?.orgId,
      timestamp: Date.now(),
    };

    this.eventLog.push(event);
    if (this.eventLog.length > this.MAX_LOG) {
      this.eventLog = this.eventLog.slice(-this.MAX_LOG);
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

  // Lazy import to avoid circular deps
  const refreshOrbitEngine = () => {
    import("@/stores/orbit-engine").then(({ useOrbitEngine }) => {
      const state = useOrbitEngine.getState();
      const userId = state.lastRefreshUserId;
      const orgId = state.lastRefreshOrgId ?? undefined;
      if (userId) state.refresh(userId, orgId);
    }).catch(() => {});
  };

  // ── All wallet events → refresh orbit engine (balance + counters) ──
  unsubs.push(
    platformBus.onPrefix("wallet:", () => refreshOrbitEngine())
  );

  // ── All marketplace events → refresh orbit engine ──
  unsubs.push(
    platformBus.onPrefix("marketplace:", () => refreshOrbitEngine())
  );

  // ── All PM events → refresh orbit engine ──
  unsubs.push(
    platformBus.onPrefix("pm:", () => refreshOrbitEngine())
  );

  // ── All deal events → refresh orbit engine ──
  unsubs.push(
    platformBus.onPrefix("deal:", () => refreshOrbitEngine())
  );

  // ── Orbit communication events → refresh orbit engine ──
  unsubs.push(
    platformBus.onPrefix("orbit:", () => refreshOrbitEngine())
  );

  // ── Tracking completed → refresh orbit ──
  unsubs.push(
    platformBus.on("tracking:completed", () => refreshOrbitEngine())
  );

  // ── Tracking started → refresh orbit (new entity on radar) ──
  unsubs.push(
    platformBus.on("tracking:started", () => refreshOrbitEngine())
  );

  // ── Currency changed → propagate via custom event for legacy components ──
  unsubs.push(
    platformBus.on("system:currency_changed", (event) => {
      window.dispatchEvent(new CustomEvent("currency:changed", { detail: event.payload }));
    })
  );

  // Debug logging in development
  if (import.meta.env.DEV) {
    unsubs.push(
      platformBus.onAll((event) => {
        console.debug(`[platform-bus] ${event.type}`, event.payload);
      })
    );
  }

  return () => unsubs.forEach((fn) => fn());
}
