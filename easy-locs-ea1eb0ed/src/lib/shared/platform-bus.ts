/**
 * Platform Event Bus — Single nervous system for the entire application.
 * 
 * Every module fires events here. Every module listens here.
 * Wallet ↔ Orbit ↔ Marketplace ↔ Property Management
 */

type PlatformEventType =
  // Wallet (canonical colon-notation)
  | "wallet:balance_updated"
  | "wallet:payment_completed"
  | "wallet:payment_failed"
  | "wallet:locs_purchased"
  | "wallet:transfer_sent"
  | "wallet:transfer_received"
  | "wallet:transfer_completed"
  | "wallet:payment_requested"
  | "wallet:payment_success"
  | "wallet:transaction_created"
  | "wallet:loaded"
  | "wallet:top_up"
  | "wallet:receipt_generated"
  | "wallet:commission_split"
  // Orbit / Communication (canonical colon-notation)
  | "orbit:message_sent"
  | "orbit:message_received"
  | "orbit:message_read"
  | "orbit:call_started"
  | "orbit:call_ended"
  | "orbit:thread_created"
  | "orbit:thread_updated"
  | "orbit:notification_created"
  | "orbit:profile_updated"
  | "orbit:presence_changed"
  | "orbit:session_restored"
  | "orbit:media_attached"
  | "orbit:unread_corrected"
  | "orbit:force_reload"
  // Marketplace (canonical colon-notation)
  | "marketplace:listing_published"
  | "marketplace:listing_paused"
  | "marketplace:listing_unpublished"
  | "marketplace:listing_sold"
  | "marketplace:booking_created"
  | "marketplace:booking_confirmed"
  | "marketplace:booking_paid"
  | "marketplace:booking_completed"
  | "marketplace:booking_cancelled"
  | "marketplace:review_submitted"
  | "marketplace:listing_shared"
  | "marketplace:provider_went_live"
  | "marketplace:provider_went_offline"
  | "marketplace:contact_opened"
  | "marketplace:vente_completed"
  | "marketplace:stock_updated"
  | "marketplace:reservation_created"
  | "marketplace:availability_updated"
  // Storefront / Commerce
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
  // Commerce Lifecycle
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
  | "delivery:dispatched"
  | "delivery:completed"
  | "delivery:driver_assigned"
  | "delivery:pickup_arrived"
  | "delivery:picked_up"
  | "delivery:in_progress"
  | "delivery:delivered"
  | "delivery:validated"
  | "delivery:failed"
  // Automation
  | "automation:workflow_created"
  | "automation:workflow_started"
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
  // Order lifecycle
  | "order:status_changed"
  // Payment lifecycle
  | "payment:intent_created"
  // Property
  | "property:unit_created"
  | "property:published_to_marketplace"
  | "property:device_state_changed"
  | "property:access_granted"
  | "property:automation_triggered"
  // Property Management
  | "pm:lease_created"
  | "pm:lease_activated"
  | "pm:rent_call_created"
  | "pm:payment_received"
  | "pm:receipt_generated"
  | "pm:intervention_created"
  | "pm:document_shared"
  // Listing (canonical colon-notation)
  | "listing:created"
  | "listing:updated"
  | "listing:published"
  | "listing:viewed"
  // Booking (canonical colon-notation)
  | "booking:requested"
  | "booking:payment_required"
  | "booking:confirmation_required"
  | "booking:confirmed"
  | "booking:cancelled"
  | "booking:completed"
  | "booking:created"
  // Conversation / Message (canonical colon-notation)
  | "conversation:created"
  | "message:sent"
  | "contact:opened"
  // Geo (canonical colon-notation)
  | "geo:permission_changed"
  | "geo:position_updated"
  // Call (canonical colon-notation)
  | "call:started"
  | "call:ended"
  | "call:request"
  // UI
  | "ui:panel_changed"
  | "ui:interaction_performed"
  | "ui:gesture_detected"
  | "camera:opened"
  | "camera:closed"
  // QR (canonical colon-notation)
  | "qr:scan_started"
  | "qr:scan_decoded"
  | "qr:scan_failed"
  | "qr:scan_expired"
  | "qr:resolve_started"
  | "qr:resolve_completed"
  | "qr:payment_initiated"
  | "qr:payment_completed"
  | "qr:payment_failed"
  | "qr:navigation"
  // Attachment / Gallery (canonical colon-notation)
  | "attachment:gallery_saved"
  | "attachment:gallery_failed"
  | "attachment:preview_ready"
  | "attachment:uploaded"
  | "attachment:reconciled"
  // Message lifecycle (canonical colon-notation)
  | "message:created_optimistic"
  | "message:persisted"
  | "message:reconciled"
  | "message:failed"
  // Radar
  | "radar:location_shared"
  | "radar:pin_selected"
  | "radar:entity_selected"
  | "radar:geo_updated"
  // Dashboard
  | "dashboard:refresh"
  | "dashboard:counters_refresh"
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
  | "system:sync_requested"
  | "system:online_recovered"
  | "system:user_online"
  | "system:module_status_changed"
  | "system:pipeline_completed"
  | "system:pipeline_error"
  | "system:stale_queries_detected"
  | "system:memory_pressure"
  // Onboarding
  | "onboarding:started"
  | "onboarding:step_completed"
  | "onboarding:completed"
  | "onboarding:failed"
  // Import
  | "import:started"
  | "import:completed"
  | "import:failed"
  // Publish Gate
  | "publish:gate_passed"
  | "publish:gate_blocked"
  // Transaction
  | "transaction:created"
  | "transaction:confirmed"
  | "transaction:completed"
  | "transaction:cancelled"
  | "transaction:failed"
  | "transaction:refunded"
  // Notification
  | "notification:created"
  | "notification:read"
  // Support
  | "support:ticket_created"
  | "support:ticket_resolved"
  | "support:ticket_escalated"
  // KYC / Compliance
  | "kyc:status_changed"
  | "compliance:aml_alert"
  // Admin
  | "admin:audit_logged"
  | "admin:user_action"
  // Moderation
  | "moderation:action_taken"
  | "moderation:content_flagged"
  | "taxonomy:conflict_detected"
  // SLA
  | "sla:warning"
  | "sla:breached"
  | "sla:escalated"
  // Multi-tenant
  | "tenant:created"
  | "tenant:plan_upgraded"
  | "tenant:member_invited"
  | "tenant:quota_warning"
  // API Gateway
  | "api:request_completed"
  | "api:rate_limit_hit"
  | "api:webhook_delivered"
  // Orbit extensions
  | "orbit:message_edited_optimistic"
  | "orbit:message_deleted"
  | "orbit:identity_updated"
  | "orbit:group_updated"
  | "orbit:group_created"
  | "orbit:ephemeral_timer_changed"
  | "orbit:contacts_updated"
  | "orbit:profile_loaded"
  // Media / Location
  | "media:viewer_open"
  | "media:viewer_close"
  | "location:live_update"
  | "location:live_stopped"
  // Orchestration engine (UPPERCASE legacy — kept for backward compat, to be deprecated)
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
  // Vertical pipeline events
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
  | "USER_SEARCH"
  // UI Engine (control-room telemetry)
  | "ui-engine:report"
  // Governance engine violation events
  | "text:integrity_violation"
  | "layout:integrity_violation"
  | "i18n:localization_violation"
  // Repair pipeline domain events
  | "repair:pipeline:completed"
  | "engine:memory:regression"
  // Dashboard card audit/repair events
  | "dashboard:card_audit_completed"
  | "dashboard:card_repair_completed"
  // Engine orchestrator lifecycle events
  | "engine:orchestrator:booted"
  | "engine:stopped"
  // Engine health monitor events
  | "engine:health:crash"
  | "engine:health:freeze"
  | "engine:health:timeout"
  | "engine:health:restarted"
  | "engine:health:safe_mode"
  // Engine storm guard events
  | "engine:storm:global_pause"
  | "engine:storm:engine_paused"
  // Engine optimizer events
  | "engine:optimizer:run"
  // Repair safety events
  | "repair:storm:detected"
  | "repair:loop:detected"
  | "repair:quarantine:entered"
  | "repair:quarantine:lifted"
  // Orbit media/voice upload lifecycle (emitted by send-media/send-voice)
  | "orbit:voice_upload_completed"
  | "orbit:media_upload_completed"
  | "orbit:payment_received"
  // Story/Radar bridge (emitted by story-radar-bridge)
  | "story:radar_revoke"
  | "radar:open_location"
  // App lifecycle
  | "app:bootstrapped"
  | "app:ready"
  // Wallet (canonical)
  | "wallet:transaction_created"
  | "wallet:payment_success"
  | "wallet:payment_failed"
  | "wallet:payment_completed"
  | "wallet:transfer_completed"
  | "wallet:balance_updated"
  | "wallet:qr_scanned"
  | "wallet:pos_updated"
  | "wallet:topup_initiated"
  | "wallet:top_up"
  | "wallet:loaded"
  // Order (canonical)
  | "order:created"
  | "order:confirmed"
  | "order:preparing"
  | "order:ready"
  | "order:assigned"
  | "order:delivering"
  | "order:completed"
  | "order:cancelled"
  | "order:refunded"
  // Payment (canonical)
  | "payment:success"
  | "payment:failed"
  // Delivery (canonical additions)
  | "delivery:pickup"
  | "delivery:delivering"
  // Mission
  | "mission:accepted"
  | "mission:completed"
  // Orbit (canonical additions)
  | "orbit:message_sent"
  | "orbit:message_received"
  | "orbit:call_started"
  | "orbit:call_ended"
  | "orbit:thread_selected"
  | "orbit:message_read"
  | "orbit:thread_updated"
  | "orbit:thread_created"
  | "orbit:profile_updated"
  // Rental
  | "rental:property_created"
  | "rental:property_updated"
  | "rental:tenant_created"
  | "rental:tenant_updated"
  | "rental:rent_call_created"
  | "rental:rent_call_paid"
  | "rental:receipt_generated"
  | "rental:lease_generated"
  | "rental:message_sent"
  // Seasonal
  | "seasonal:booking_created"
  | "seasonal:booking_updated"
  | "seasonal:booking_cancelled"
  | "seasonal:ical_synced"
  // Concierge
  | "concierge:service_booked"
  | "concierge:booking_updated"
  // Groups / Channels
  | "group:created"
  | "group:message_sent"
  | "channel:updated"
  // Storefront (canonical additions)
  | "storefront:order_placed"
  | "storefront:order_completed"
  | "storefront:product_updated"
  | "storefront:menu_updated"
  // Support (canonical additions)
  | "support:ticket_replied"
  | "refund:requested"
  // Radar (canonical additions)
  | "radar:view_changed"
  // Dashboard (canonical additions)
  | "dashboard:counters_refresh"
  // Notifications / Me
  | "notifications:refresh"
  | "me:refresh"
  // Watchdog / Repair
  | "watchdog:alert"
  | "watchdog:status_changed"
  | "browser_repair:run_completed"
  | "browser_repair:issue_found"
  | "browser_repair:completed"
  // Identity / Contacts
  | "identity:activated"
  | "contacts:synced"
  // Map
  | "map:entity_selected"
  | "map:entity_hovered"
  | "map:clicked"
  | "map:entity_deselected"
  | "map:rt_drivers_updated"
  | "map:rt_orders_updated"
  // Marketplace (canonical additions)
  | "marketplace:contact_opened"
  | "marketplace:provider_went_live"
  | "marketplace:booking_confirmed"
  | "marketplace:booking_completed"
  | "marketplace:booking_cancelled"
  | "marketplace:booking_created"
  | "marketplace:vente_completed"
  // Deal (canonical additions)
  | "deal:counter_offer"
  | "deal:offer_sent"
  // ENTITY_OPENED (legacy compat)
  | "ENTITY_OPENED"
  // Close-flow dynamic events
  | `${string}:flow_closed`
;

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
