/**
 * Platform Event Bus — Single nervous system for the entire application.
 * 
 * Every module fires events here. Every module listens here.
 * Wallet ↔ Orbit ↔ Marketplace ↔ Property Management
 * 
 * This replaces scattered, siloed event handling with a unified,
 * observable event stream that guarantees cross-module consistency.
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
  // System
  | "system:currency_changed"
  | "system:sync_completed"
  | "system:user_online";

export interface PlatformEvent<T = any> {
  type: PlatformEventType;
  payload: T;
  source: "wallet" | "orbit" | "marketplace" | "pm" | "system";
  userId?: string;
  orgId?: string;
  timestamp: number;
}

type EventListener = (event: PlatformEvent) => void;

class PlatformBus {
  private listeners = new Map<string, Set<EventListener>>();
  private globalListeners = new Set<EventListener>();
  private eventLog: PlatformEvent[] = [];
  private readonly MAX_LOG = 100;

  /** Subscribe to a specific event type */
  on(type: PlatformEventType, listener: EventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  /** Subscribe to ALL events (for logging, analytics, debugging) */
  onAll(listener: EventListener): () => void {
    this.globalListeners.add(listener);
    return () => this.globalListeners.delete(listener);
  }

  /** Subscribe to events matching a prefix (e.g. "wallet:" for all wallet events) */
  onPrefix(prefix: string, listener: EventListener): () => void {
    const wrappedListener: EventListener = (event) => {
      if (event.type.startsWith(prefix)) listener(event);
    };
    this.globalListeners.add(wrappedListener);
    return () => this.globalListeners.delete(wrappedListener);
  }

  /** Emit an event across the entire platform */
  emit<T = any>(
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

    // Log for debugging
    this.eventLog.push(event);
    if (this.eventLog.length > this.MAX_LOG) {
      this.eventLog = this.eventLog.slice(-this.MAX_LOG);
    }

    // Notify type-specific listeners
    this.listeners.get(type)?.forEach((fn) => {
      try { fn(event); } catch (e) { console.error(`[platform-bus] listener error for ${type}:`, e); }
    });

    // Notify global listeners
    this.globalListeners.forEach((fn) => {
      try { fn(event); } catch (e) { console.error(`[platform-bus] global listener error:`, e); }
    });
  }

  /** Get recent event log (for debugging) */
  getLog(): PlatformEvent[] {
    return [...this.eventLog];
  }

  /** Clear all listeners (for cleanup) */
  clear(): void {
    this.listeners.clear();
    this.globalListeners.clear();
  }
}

// Singleton instance — import this everywhere
export const platformBus = new PlatformBus();

// ═══════════════════════════════════════════════
// Cross-module reaction rules
// These are the "synapses" that connect modules
// ═══════════════════════════════════════════════

/**
 * Install the default cross-module reactions.
 * Call once at app startup (e.g. in App.tsx or main.tsx).
 */
export function installPlatformReactions(): () => void {
  const unsubs: (() => void)[] = [];

  // 1. Wallet payment → refresh Orbit engine counters
  unsubs.push(
    platformBus.on("wallet:payment_completed", () => {
      // Orbit engine will pick this up via its own refresh cycle
      window.dispatchEvent(new CustomEvent("orbit:refresh"));
    })
  );

  // 2. Marketplace booking paid → update wallet display
  unsubs.push(
    platformBus.on("marketplace:booking_paid", () => {
      window.dispatchEvent(new CustomEvent("wallet:refresh"));
    })
  );

  // 3. PM payment received → update wallet + orbit
  unsubs.push(
    platformBus.on("pm:payment_received", () => {
      window.dispatchEvent(new CustomEvent("wallet:refresh"));
      window.dispatchEvent(new CustomEvent("orbit:refresh"));
    })
  );

  // 4. Currency changed → propagate to all displays
  unsubs.push(
    platformBus.on("system:currency_changed", (event) => {
      window.dispatchEvent(new CustomEvent("currency:changed", { detail: event.payload }));
    })
  );

  // 5. Listing published → refresh orbit counters
  unsubs.push(
    platformBus.on("marketplace:listing_published", () => {
      window.dispatchEvent(new CustomEvent("orbit:refresh"));
    })
  );

  // 6. Lease activated → refresh PM + orbit
  unsubs.push(
    platformBus.on("pm:lease_activated", () => {
      window.dispatchEvent(new CustomEvent("orbit:refresh"));
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
