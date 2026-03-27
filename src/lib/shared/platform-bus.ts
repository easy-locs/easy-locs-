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
  | "wallet:payment_requested"
  // Wallet (dot-notation — emitted by walletStore)
  | "wallet.loaded"
  | "wallet.transaction.created"
  | "wallet.payment.success"
  | "wallet.payment.failed"
  | "wallet.payment.completed"
  // Orbit / Communication
  | "orbit:message_sent"
  | "orbit:call_started"
  | "orbit:call_ended"
  | "orbit:thread_created"
  | "orbit:notification_created"
  // Orbit (dot-notation — emitted by orbitStore / V2 cross-app)
  | "orbit.profile.loaded"
  | "orbit.message.sent"
  | "orbit.message.received"
  | "orbit.call.started"
  | "orbit.call.ended"
  // Marketplace
  | "marketplace:listing_published"
  | "marketplace:listing_paused"
  | "marketplace:booking_created"
  | "marketplace:booking_confirmed"
  | "marketplace:booking_paid"
  | "marketplace:booking_completed"
  | "marketplace:booking_cancelled"
  | "marketplace:review_submitted"
  | "marketplace:provider_went_live"
  | "marketplace:provider_went_offline"
  | "marketplace.merchant.live"
  | "marketplace.contact.opened"
  // Storefront / Commerce (PASS123)
  | "storefront:order_placed"
  | "storefront:order_paid"
  | "storefront:order_shipped"
  | "storefront:order_completed"
  | "storefront:order_cancelled"
  | "storefront:cart_updated"
  | "storefront:deal_accepted"
  | "storefront:deal_converted"
  | "storefront:delivery_dispatched"
  | "storefront:review_posted"
  | "storefront:stock_low"
  | "storefront:trust_updated"
  | "storefront:loyalty_earned"
  | "storefront:risk_flagged"
  | "storefront:growth_milestone"
  | "storefront:return_requested"
  | "storefront:return_processed"
  | "storefront:crm_updated"
  // Commerce Lifecycle (Orbit orchestration)
  | "commerce:order_created"
  | "commerce:intent_prepared"
  | "commerce:payment_authorized"
  | "commerce:payment_captured"
  | "commerce:payment_settled"
  | "commerce:payment_reversed"
  | "commerce:driver_assigned"
  | "commerce:order_validated"
  | "commerce:order_cancelled"
  // Dispatch & Delivery
  | "dispatch:job_created"
  | "dispatch:broadcast_started"
  | "dispatch:offer_sent"
  | "dispatch:driver_accepted"
  | "dispatch:driver_declined"
  | "dispatch:driver_assigned"
  | "delivery:pickup_arrived"
  | "delivery:picked_up"
  | "delivery:in_progress"
  | "delivery:delivered"
  | "delivery:validated"
  | "delivery:failed"
  // Automation
  | "automation:workflow_created"
  | "automation:workflow_started"
  | "automation:step_executed"
  | "automation:step_failed"
  | "automation:workflow_completed"
  | "automation:workflow_stopped"
  | "automation:workflow_cancelled"
  | "automation:workflow_failed"
  | "automation:priority_escalated"
  | "automation:exception_created"
  | "automation:exception_resolved"
  | "automation:scheduler_started"
  | "automation:scheduler_stopped"
  // Property Management
  | "pm:lease_created"
  | "pm:lease_activated"
  | "pm:rent_call_created"
  | "pm:payment_received"
  | "pm:receipt_generated"
  | "pm:intervention_created"
  | "pm:document_shared"
  // Listing (dot-notation — emitted by listingStore)
  | "listing.created"
  | "listing.updated"
  | "listing.published"
  // Booking (dot-notation — emitted by bookingStore/reactions)
  | "booking.requested"
  | "booking.payment.required"
  | "booking.confirmation.required"
  | "booking.confirmed"
  | "booking.cancelled"
  | "booking.completed"
  | "booking.created"
  // Conversation / Message (dot-notation — emitted by chatStore)
  | "conversation.created"
  | "message.sent"
  | "contact.opened"
  // Property Management (dot-notation — emitted by propertyManagementStore)
  | "property.unit.created"
  | "lease.created"
  | "rent.payment.created"
  | "rent.payment.required"
  | "rent.payment.paid"
  // Geo (dot-notation)
  | "geo.permission.changed"
  | "geo.position.updated"
  // Call (dot-notation)
  | "call.started"
  | "call.ended"
  | "call.request"
  // UI (dot-notation — emitted by uiShellStore/cameraStore)
  | "ui.panel.changed"
  | "camera.opened"
  | "camera.closed"
  // QR (dot-notation — emitted by QrScannerPage / qr-engine)
  | "qr.scan.started"
  | "qr.scan.decoded"
  | "qr.scan.failed"
  | "qr.scan.expired"
  | "qr.resolve.started"
  | "qr.resolve.completed"
  | "qr.payment.initiated"
  | "qr.payment.completed"
  | "qr.payment.failed"
  | "qr.navigation"
  // Radar (dot-notation — V2 cross-app)
  | "radar.location.shared"
  | "radar.pin.selected"
  // Dashboard (dot-notation — V2 cross-app)
  | "dashboard.refresh"
  | "dashboard.counters.refresh"
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
  | "system:user_online"
  // Orchestration engine (UPPERCASE legacy — merged from lib/orchestration)
  | "ORDER_CREATED"
  | "ORDER_CONFIRMED"
  | "ORDER_READY"
  | "ORDER_DELIVERED"
  | "ORDER_COMPLETED"
  | "ORDER_REFUNDED"
  | "ORDER_SETTLED"
  | "PAYMENT_SUCCESS"
  | "REFUND_REQUESTED"
  | "MISSION_CREATED"
  | "MISSION_ACCEPTED"
  | "MISSION_COMPLETED"
  // Vertical pipeline events (strict separation)
  | "ENTITY_CLASSIFIED"
  | "FOOD_MENU_NORMALIZED"
  | "HOTEL_INVENTORY_NORMALIZED"
  | "SERVICE_CATALOG_NORMALIZED"
  | "GROCERY_CATALOG_NORMALIZED"
  | "PUBLISH_GATE_PASSED"
  | "PUBLISH_GATE_BLOCKED"
  | "DELIVERY_COMPLETED"
  | "ISSUE_CREATED"
  | "USER_OPEN_HOME"
  | "USER_SEARCH";

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
  private readonly MAX_LOG = 300;

  on(type: PlatformEventType | string, listener: EventListener): () => void {
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
    type: PlatformEventType | string,
    payload: T,
    source: PlatformEvent["source"] | string,
    meta?: { userId?: string; orgId?: string }
  ): void {
    const event: PlatformEvent<T> = {
      type: type as PlatformEventType,
      payload,
      source: source as PlatformEvent["source"],
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
  unsubs.push(
    platformBus.onPrefix("wallet:", () => refreshModule("wallet")),
    platformBus.onPrefix("wallet.", () => refreshModule("wallet"))
  );

  // ── Marketplace events → refresh business module ──
  unsubs.push(
    platformBus.onPrefix("marketplace:", () => refreshModule("business")),
    platformBus.onPrefix("marketplace.", () => refreshModule("business"))
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
    platformBus.onPrefix("orbit:", () => refreshModule("communication")),
    platformBus.onPrefix("orbit.", () => refreshModule("communication"))
  );

  // ── Booking events → refresh business module ──
  unsubs.push(
    platformBus.onPrefix("booking.", () => refreshModule("business"))
  );

  // ── Radar events → refresh business module ──
  unsubs.push(
    platformBus.onPrefix("radar.", () => refreshModule("business"))
  );

  // ── Dashboard refresh events → targeted refresh only ──
  // Was refreshModule("all") — reduced to avoid cascade on every event.
  // Dashboard counters come from individual module data; no need to reload everything.
  unsubs.push(
    platformBus.onPrefix("dashboard.", () => refreshModule("business"))
  );

  // (tracking:completed and tracking:started now handled by tracking: prefix below)

  // ── Storefront events → refresh business module ──
  unsubs.push(
    platformBus.onPrefix("storefront:", () => refreshModule("business"))
  );

  // ── Commerce events → refresh wallet module ──
  unsubs.push(
    platformBus.onPrefix("commerce:", () => refreshModule("wallet"))
  );

  // ── Tracking position/status → refresh business ──
  unsubs.push(
    platformBus.onPrefix("tracking:", () => refreshModule("business"))
  );

  // ── Listing events → refresh business module ──
  unsubs.push(
    platformBus.onPrefix("listing.", () => refreshModule("business"))
  );

  // ── Rent/PM payment events → refresh wallet + business ──
  unsubs.push(
    platformBus.onPrefix("rent.", () => {
      refreshModule("wallet");
      refreshModule("business");
    })
  );

  // ── Growth events → refresh business ──
  unsubs.push(
    platformBus.onPrefix("growth:", () => refreshModule("business"))
  );

  // ── Currency changed → propagate via custom event for legacy components ──
  unsubs.push(
    platformBus.on("system:currency_changed", (event) => {
      window.dispatchEvent(new CustomEvent("currency:changed", { detail: event.payload }));
    })
  );

  // ── TRANSITION BRIDGE: dot ↔ colon notation ──
  // Maps dot-notation events to colon equivalents and vice versa.
  // Uses a single __bridged flag to prevent loops (dot→colon→STOP).
  const NOTATION_BRIDGE: Record<string, string> = {
    "dashboard.refresh": "dashboard:refresh",
    "dashboard.counters.refresh": "dashboard:counters_refresh",
    "wallet.payment.completed": "wallet:payment_completed",
    "wallet.payment.success": "wallet:payment_success",
    "wallet.payment.failed": "wallet:payment_failed",
    "orbit.message.sent": "orbit:message_sent",
    "orbit.message.received": "orbit:message_received",
    "orbit.call.started": "orbit:call_started",
    "orbit.call.ended": "orbit:call_ended",
    "booking.created": "marketplace:booking_created",
    "booking.confirmed": "marketplace:booking_confirmed",
    "radar.location.shared": "radar:location_shared",
    "radar.pin.selected": "radar:pin_selected",
    "marketplace.merchant.live": "marketplace:provider_went_live",
    "marketplace.contact.opened": "marketplace:booking_created",
  };

  unsubs.push(
    platformBus.onAll((event) => {
      // Only bridge dot→colon (one direction). No reverse = no loop.
      const colon = NOTATION_BRIDGE[event.type];
      if (!colon) return;
      // Single guard: never re-bridge an already-bridged event
      if ((event.payload as any)?.__bridged) return;
      platformBus.emit(
        colon as PlatformEventType,
        { ...(typeof event.payload === "object" && event.payload ? event.payload : {}), __bridged: true },
        event.source
      );
    })
  );

  // Debug logging in development
  if (import.meta.env.DEV) {
    unsubs.push(
      platformBus.onAll((event) => {
        if (!(event.payload as any)?.__bridged) {
          console.debug(`[platform-bus] ${event.type}`, event.payload);
        }
      })
    );
  }

  return () => unsubs.forEach((fn) => fn());
}
