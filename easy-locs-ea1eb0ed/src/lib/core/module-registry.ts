import { platformBus } from "@/lib/shared/platform-bus";
import type { PlatformEventType } from "@/lib/shared/platform-bus";

export type PillarId = "dashboard" | "radar" | "orbit" | "wallet" | "me";

export type ModuleDomain =
  | "dashboard" | "radar" | "orbit" | "wallet" | "me"
  | "marketplace" | "property" | "delivery" | "flight"
  | "taxi" | "services" | "payments" | "auth"
  | "notifications" | "realtime" | "support";

export type ModuleCapability =
  | "search"
  | "geo"
  | "messaging"
  | "payments"
  | "identity"
  | "discovery"
  | "booking"
  | "commerce"
  | "property"
  | "delivery"
  | "analytics"
  | "media"
  | "trust"
  | "notifications"
  | "contacts"
  | "qr"
  | "settings"
  | "tracking"
  | "rides"
  | "flights"
  | "support"
  | "realtime"
  | "auth";

export type ModuleStatus = "idle" | "booting" | "active" | "degraded" | "error";

export type PermissionScope =
  | "read" | "write" | "admin"
  | "payments:read" | "payments:write"
  | "wallet:read" | "wallet:write"
  | "messaging:read" | "messaging:write"
  | "location:read" | "location:write"
  | "profile:read" | "profile:write"
  | "listings:read" | "listings:write"
  | "bookings:read" | "bookings:write"
  | "delivery:read" | "delivery:write"
  | "support:read" | "support:write";

export interface ModuleDescriptor {
  id: string;
  pillar: PillarId;
  domain: ModuleDomain;
  ownership: string;
  label: string;
  capabilities: ModuleCapability[];
  routes: string[];
  canonicalModels: string[];
  eventsPublished: string[];
  eventsConsumed: string[];
  dependencies: string[];
  healthChecks: string[];
  featureFlags: string[];
  permissions: PermissionScope[];
  runtimeStatus: ModuleStatus;
  uiSurfaces: string[];
  backendServices: string[];
  staleTimeMs: number;
  status: ModuleStatus;
  lastActiveAt: number | null;
  lastErrorAt: number | null;
  lastError: string | null;
  metadata: Record<string, unknown>;
}

export interface ModuleHealthSnapshot {
  moduleId: string;
  status: ModuleStatus;
  upSinceMs: number | null;
  errorCount: number;
  lastError: string | null;
  staleness: "fresh" | "stale" | "expired";
}

function mod(
  id: string,
  pillar: PillarId,
  domain: ModuleDomain,
  ownership: string,
  label: string,
  capabilities: ModuleCapability[],
  opts: Partial<Pick<ModuleDescriptor, "routes" | "canonicalModels" | "eventsPublished" | "eventsConsumed" | "dependencies" | "healthChecks" | "featureFlags" | "permissions" | "uiSurfaces" | "backendServices" | "staleTimeMs">> = {}
): ModuleDescriptor {
  return {
    id, pillar, domain, ownership, label, capabilities,
    routes: opts.routes ?? [],
    canonicalModels: opts.canonicalModels ?? [],
    eventsPublished: opts.eventsPublished ?? [],
    eventsConsumed: opts.eventsConsumed ?? [],
    dependencies: opts.dependencies ?? [],
    healthChecks: opts.healthChecks ?? [],
    featureFlags: opts.featureFlags ?? [],
    permissions: opts.permissions ?? ["read"],
    runtimeStatus: "idle",
    uiSurfaces: opts.uiSurfaces ?? [],
    backendServices: opts.backendServices ?? [],
    staleTimeMs: opts.staleTimeMs ?? 60_000,
    status: "idle",
    lastActiveAt: null,
    lastErrorAt: null,
    lastError: null,
    metadata: {},
  };
}

const PILLAR_MODULES: ModuleDescriptor[] = [
  mod("dashboard-core", "dashboard", "dashboard", "platform", "Smart Home", ["analytics", "notifications"], {
    routes: ["/", "/dashboard"],
    canonicalModels: ["CanonicalDashboardSummary", "DashboardActivityItem"],
    eventsPublished: ["dashboard:refresh", "dashboard:counters_refresh"],
    eventsConsumed: ["wallet:balance_updated", "orbit:message_received", "marketplace:booking_created", "delivery:delivered"],
    healthChecks: ["dashboard.data_freshness", "dashboard.card_connectivity"],
    featureFlags: ["dashboard_v2", "smart_suggestions"],
    permissions: ["read"],
    uiSurfaces: ["DashboardSmartHome", "ActivityFeed", "QuickActions"],
    backendServices: ["dashboard-aggregator"],
    staleTimeMs: 60_000,
  }),
  mod("dashboard-suggestions", "dashboard", "dashboard", "platform", "Suggestions Engine", ["analytics", "discovery"], {
    dependencies: ["radar-core", "wallet-core"],
    canonicalModels: ["CanonicalDashboardSummary"],
    eventsConsumed: ["radar:entity_selected", "wallet:payment_completed"],
    featureFlags: ["ai_suggestions"],
    uiSurfaces: ["SuggestionCards"],
    staleTimeMs: 120_000,
  }),
  mod("radar-core", "radar", "radar", "platform", "Hyper Radar", ["search", "geo", "discovery"], {
    routes: ["/radar", "/radar/search", "/radar/map"],
    canonicalModels: ["CanonicalRadarEntity", "CanonicalGeoPosition", "CanonicalAddress", "CanonicalListing"],
    eventsPublished: ["radar:location_shared", "radar:pin_selected", "radar:entity_selected", "radar:geo_updated"],
    eventsConsumed: ["geo.position.updated", "marketplace:listing_published"],
    healthChecks: ["radar.geo_permission", "radar.location_freshness", "radar.provider_density"],
    featureFlags: ["radar_v3", "nearby_providers"],
    permissions: ["read", "location:read"],
    uiSurfaces: ["HyperRadarPage", "MapView", "SearchResults", "ProviderCards"],
    backendServices: ["geo-service", "search-service"],
    staleTimeMs: 30_000,
  }),
  mod("radar-map", "radar", "radar", "platform", "Map Engine", ["geo", "discovery"], {
    dependencies: ["radar-core"],
    canonicalModels: ["CanonicalGeoPosition", "CanonicalRadarEntity"],
    eventsPublished: ["radar:pin_selected"],
    eventsConsumed: ["radar:geo_updated", "tracking:position_updated"],
    healthChecks: ["radar.map_render"],
    uiSurfaces: ["MapView", "RouteOverlay"],
    staleTimeMs: 15_000,
  }),
  mod("radar-booking", "radar", "radar", "platform", "Booking Flow", ["booking", "commerce"], {
    dependencies: ["radar-core", "wallet-core"],
    routes: ["/radar/book"],
    canonicalModels: ["CanonicalBooking", "CanonicalPaymentIntent"],
    eventsPublished: ["marketplace:booking_created"],
    eventsConsumed: ["radar:entity_selected", "wallet:payment_completed"],
    healthChecks: ["radar.booking_flow"],
    permissions: ["read", "bookings:write", "payments:write"],
    uiSurfaces: ["BookingSheet", "PaymentConfirmation"],
    backendServices: ["booking-service", "payment-engine"],
    staleTimeMs: 60_000,
  }),
  mod("orbit-core", "orbit", "orbit", "platform", "Communication Center", ["messaging", "contacts", "notifications"], {
    routes: ["/orbit", "/orbit/threads", "/orbit/contacts"],
    canonicalModels: ["CanonicalMessage", "CanonicalOrbitProfile", "CanonicalPresence", "CanonicalNotification"],
    eventsPublished: ["orbit:message_sent", "orbit:message_received", "orbit:thread_created", "orbit:thread_updated", "orbit:notification_created", "orbit:profile_updated"],
    eventsConsumed: ["marketplace:booking_created", "wallet:transfer_completed", "delivery:dispatched"],
    healthChecks: ["orbit.realtime_connection", "orbit.message_delivery", "orbit.presence_sync"],
    featureFlags: ["orbit_v3", "voice_messages", "video_calls"],
    permissions: ["read", "messaging:read", "messaging:write"],
    uiSurfaces: ["CommunicationCenter", "ThreadList", "ContactList"],
    backendServices: ["messaging-service", "presence-service", "notification-service"],
    staleTimeMs: 10_000,
  }),
  mod("orbit-chat", "orbit", "orbit", "platform", "Chat Engine", ["messaging", "media"], {
    dependencies: ["orbit-core"],
    routes: ["/orbit/chat/:threadId"],
    canonicalModels: ["CanonicalMessage", "CanonicalMediaAsset", "CommunicationContext"],
    eventsPublished: ["orbit:message_sent"],
    eventsConsumed: ["orbit:message_received"],
    healthChecks: ["orbit.message_persistence", "orbit.media_upload"],
    permissions: ["messaging:read", "messaging:write"],
    uiSurfaces: ["ChatView", "MessageBubble", "MediaGallery"],
    backendServices: ["messaging-service", "media-service"],
    staleTimeMs: 5_000,
  }),
  mod("orbit-payments", "orbit", "orbit", "platform", "Chat Payments", ["payments", "messaging"], {
    dependencies: ["orbit-core", "wallet-core"],
    canonicalModels: ["CanonicalPaymentIntent", "CanonicalWalletTransaction"],
    eventsPublished: ["wallet:payment_requested", "wallet:transfer_sent"],
    eventsConsumed: ["wallet:payment_completed", "wallet:payment_failed"],
    healthChecks: ["orbit.payment_flow"],
    permissions: ["messaging:write", "payments:write"],
    uiSurfaces: ["PaymentBubble", "PaymentRequestSheet"],
    backendServices: ["payment-engine", "wallet-service"],
    staleTimeMs: 30_000,
  }),
  mod("wallet-core", "wallet", "wallet", "platform", "Wallet Hub", ["payments", "qr"], {
    routes: ["/wallet", "/wallet/transactions", "/wallet/qr"],
    canonicalModels: ["CanonicalWalletState", "CanonicalWalletTransaction", "CanonicalLedgerEntry", "CanonicalExchangeRate", "CanonicalEscrow"],
    eventsPublished: ["wallet:balance_updated", "wallet:payment_completed", "wallet:payment_failed", "wallet:transaction_created", "wallet:loaded", "wallet:top_up"],
    eventsConsumed: ["storefront:order_placed", "marketplace:booking_paid", "delivery:completed"],
    healthChecks: ["wallet.balance_sync", "wallet.ledger_integrity", "wallet.rpc_availability"],
    featureFlags: ["multi_currency", "qr_payments", "apple_pay", "google_pay"],
    permissions: ["read", "wallet:read", "wallet:write"],
    uiSurfaces: ["WalletHubPage", "BalanceCard", "TransactionHistory", "QRScanner"],
    backendServices: ["wallet-service", "ledger-service", "fx-service"],
    staleTimeMs: 15_000,
  }),
  mod("wallet-transfers", "wallet", "wallet", "platform", "Transfers", ["payments", "contacts"], {
    dependencies: ["wallet-core"],
    routes: ["/wallet/transfer", "/wallet/send"],
    canonicalModels: ["CanonicalWalletTransaction", "CanonicalLedgerEntry"],
    eventsPublished: ["wallet:transfer_sent", "wallet:transfer_received", "wallet:transfer_completed"],
    eventsConsumed: ["wallet:balance_updated"],
    healthChecks: ["wallet.transfer_flow"],
    permissions: ["wallet:write", "payments:write"],
    uiSurfaces: ["TransferSheet", "RecipientSelector"],
    backendServices: ["wallet-service", "contact-service"],
    staleTimeMs: 30_000,
  }),
  mod("wallet-trust", "wallet", "wallet", "platform", "Trust Engine", ["trust", "analytics"], {
    dependencies: ["wallet-core"],
    canonicalModels: ["CanonicalWalletTransaction"],
    eventsConsumed: ["wallet:transaction_created", "wallet:payment_completed"],
    healthChecks: ["wallet.fraud_detection"],
    featureFlags: ["fraud_detection_v2"],
    uiSurfaces: ["TrustScoreCard"],
    backendServices: ["fraud-service"],
    staleTimeMs: 300_000,
  }),
  mod("wallet-escrow", "wallet", "wallet", "platform", "Escrow Engine", ["payments"], {
    dependencies: ["wallet-core"],
    canonicalModels: ["CanonicalEscrow", "CanonicalPaymentIntent"],
    eventsPublished: ["wallet:escrow_locked", "wallet:escrow_released"],
    eventsConsumed: ["delivery:delivered", "marketplace:booking_completed"],
    healthChecks: ["wallet.escrow_consistency"],
    permissions: ["wallet:write"],
    backendServices: ["escrow-service"],
    staleTimeMs: 60_000,
  }),
  mod("wallet-payout", "wallet", "wallet", "platform", "Payout Engine", ["payments", "analytics"], {
    dependencies: ["wallet-core"],
    canonicalModels: ["CanonicalPayout", "CanonicalCommission"],
    eventsPublished: ["wallet:payout_processed"],
    eventsConsumed: ["wallet:transaction_created"],
    healthChecks: ["wallet.payout_schedule"],
    permissions: ["wallet:write", "payments:write"],
    uiSurfaces: ["PayoutHistory", "SettlementReport"],
    backendServices: ["payout-service", "commission-service"],
    staleTimeMs: 120_000,
  }),
  mod("me-core", "me", "me", "platform", "Command Center", ["identity", "settings"], {
    routes: ["/me", "/me/profile", "/me/settings"],
    canonicalModels: ["CanonicalUserProfile", "CanonicalOrbitProfile", "CanonicalAppSession"],
    eventsPublished: ["orbit:profile_updated"],
    healthChecks: ["me.profile_sync", "me.session_validity"],
    featureFlags: ["me_v2", "dark_mode"],
    permissions: ["read", "profile:read", "profile:write"],
    uiSurfaces: ["MeCommandCenter", "ProfileEditor", "SettingsPanel"],
    backendServices: ["profile-service", "auth-service"],
    staleTimeMs: 120_000,
  }),
  mod("me-business", "me", "me", "platform", "Business Manager", ["commerce", "property", "analytics"], {
    dependencies: ["me-core", "wallet-core"],
    routes: ["/me/business", "/me/listings", "/me/orders"],
    canonicalModels: ["CanonicalListing", "CanonicalProviderProfile", "CanonicalOrder"],
    eventsPublished: ["marketplace:listing_published"],
    eventsConsumed: ["storefront:order_placed", "marketplace:booking_created"],
    healthChecks: ["me.listing_sync", "me.order_integrity"],
    permissions: ["read", "listings:write", "bookings:read"],
    uiSurfaces: ["BusinessDashboard", "ListingManager", "OrderManager"],
    backendServices: ["listing-service", "order-service"],
    staleTimeMs: 60_000,
  }),
  mod("me-delivery", "me", "me", "platform", "Delivery Manager", ["delivery", "geo"], {
    dependencies: ["me-core", "radar-core"],
    routes: ["/me/delivery", "/me/deliveries"],
    canonicalModels: ["CanonicalDeliveryJob", "CanonicalOrder"],
    eventsPublished: ["delivery:dispatched"],
    eventsConsumed: ["delivery:delivered", "delivery:failed"],
    healthChecks: ["me.delivery_tracking"],
    permissions: ["read", "delivery:read", "delivery:write"],
    uiSurfaces: ["DeliveryManager", "ActiveDeliveries"],
    backendServices: ["delivery-service", "dispatch-service"],
    staleTimeMs: 30_000,
  }),
  mod("marketplace-core", "radar", "marketplace", "platform", "Marketplace Engine", ["commerce", "discovery", "booking"], {
    routes: ["/marketplace", "/marketplace/:listingId"],
    canonicalModels: ["CanonicalListing", "CanonicalBooking", "CanonicalProviderProfile", "CanonicalOrder"],
    eventsPublished: ["marketplace:listing_published", "marketplace:listing_paused", "marketplace:booking_created", "marketplace:booking_confirmed", "marketplace:booking_paid", "marketplace:booking_completed", "marketplace:booking_cancelled", "marketplace:review_submitted"],
    eventsConsumed: ["wallet:payment_completed", "orbit:message_sent", "radar:entity_selected"],
    dependencies: ["radar-core"],
    healthChecks: ["marketplace.listing_availability", "marketplace.booking_flow", "marketplace.payment_integration"],
    featureFlags: ["marketplace_v2", "reviews_v2", "promoted_listings"],
    permissions: ["read", "listings:read", "listings:write", "bookings:write"],
    uiSurfaces: ["MarketplaceGrid", "ListingDetail", "BookingFlow", "ReviewSection"],
    backendServices: ["listing-service", "booking-service", "review-service"],
    staleTimeMs: 30_000,
  }),
  mod("property-core", "radar", "property", "platform", "Property Management", ["property", "booking"], {
    routes: ["/property", "/property/:id", "/property/management"],
    canonicalModels: ["CanonicalListing", "CanonicalBooking", "CanonicalProviderProfile"],
    eventsPublished: ["property:unit_created", "pm:lease_created", "pm:lease_activated", "pm:payment_received", "pm:receipt_generated", "pm:intervention_created"],
    eventsConsumed: ["wallet:payment_completed", "orbit:message_sent"],
    dependencies: ["wallet-core"],
    healthChecks: ["property.lease_integrity", "property.payment_tracking"],
    featureFlags: ["property_v2", "lease_management"],
    permissions: ["read", "listings:write", "payments:read"],
    uiSurfaces: ["PropertyListing", "LeaseManager", "TenantPortal"],
    backendServices: ["property-service", "lease-service"],
    staleTimeMs: 60_000,
  }),
  mod("delivery-core", "radar", "delivery", "platform", "Delivery Engine", ["delivery", "tracking", "geo"], {
    routes: ["/delivery", "/delivery/:id/track"],
    canonicalModels: ["CanonicalDeliveryJob", "CanonicalOrder", "CanonicalGeoPosition"],
    eventsPublished: ["delivery:dispatched", "delivery:pickup_arrived", "delivery:picked_up", "delivery:in_progress", "delivery:delivered", "delivery:completed", "delivery:failed"],
    eventsConsumed: ["storefront:order_placed", "dispatch:driver_assigned", "tracking:position_updated"],
    dependencies: ["radar-core", "wallet-core"],
    healthChecks: ["delivery.driver_availability", "delivery.tracking_accuracy", "delivery.completion_rate"],
    featureFlags: ["delivery_v2", "live_tracking"],
    permissions: ["read", "delivery:read", "delivery:write", "location:read"],
    uiSurfaces: ["DeliveryTracker", "DriverMap", "OrderStatus"],
    backendServices: ["delivery-service", "dispatch-service", "tracking-service"],
    staleTimeMs: 15_000,
  }),
  mod("taxi-core", "radar", "taxi", "platform", "Ride Engine", ["rides", "tracking", "geo"], {
    routes: ["/taxi", "/taxi/ride/:id"],
    canonicalModels: ["CanonicalRideRequest", "CanonicalGeoPosition", "CanonicalPaymentIntent"],
    eventsPublished: ["tracking:started", "tracking:position_updated", "tracking:status_changed", "tracking:completed"],
    eventsConsumed: ["radar:geo_updated", "wallet:payment_completed"],
    dependencies: ["radar-core", "wallet-core"],
    healthChecks: ["taxi.driver_density", "taxi.matching_speed", "taxi.eta_accuracy"],
    featureFlags: ["taxi_v2", "surge_pricing", "scheduled_rides"],
    permissions: ["read", "location:read", "payments:write"],
    uiSurfaces: ["RideRequestFlow", "DriverMatchScreen", "RideTracker", "FareEstimate"],
    backendServices: ["ride-service", "matching-service", "pricing-service"],
    staleTimeMs: 10_000,
  }),
  mod("flight-core", "radar", "flight", "platform", "Flight Engine", ["flights", "booking"], {
    routes: ["/flights", "/flights/search", "/flights/:id"],
    canonicalModels: ["CanonicalBooking", "CanonicalPaymentIntent"],
    eventsPublished: ["marketplace:booking_created"],
    eventsConsumed: ["wallet:payment_completed"],
    dependencies: ["wallet-core"],
    healthChecks: ["flight.search_availability", "flight.booking_flow"],
    featureFlags: ["flights_v2", "multi_city"],
    permissions: ["read", "bookings:write", "payments:write"],
    uiSurfaces: ["FlightSearch", "FlightResults", "FlightBooking"],
    backendServices: ["flight-service", "booking-service"],
    staleTimeMs: 60_000,
  }),
  mod("services-core", "radar", "services", "platform", "Services Engine", ["booking", "commerce"], {
    routes: ["/services", "/services/:id"],
    canonicalModels: ["CanonicalListing", "CanonicalBooking", "CanonicalProviderProfile"],
    eventsPublished: ["marketplace:booking_created"],
    eventsConsumed: ["wallet:payment_completed", "orbit:message_sent"],
    dependencies: ["radar-core", "wallet-core", "orbit-core"],
    healthChecks: ["services.provider_availability", "services.booking_flow"],
    featureFlags: ["services_v2"],
    permissions: ["read", "bookings:write"],
    uiSurfaces: ["ServiceListing", "ServiceBooking", "ProviderProfile"],
    backendServices: ["service-catalog", "booking-service"],
    staleTimeMs: 30_000,
  }),
  mod("payments-core", "wallet", "payments", "platform", "Payment Engine", ["payments"], {
    canonicalModels: ["CanonicalPaymentIntent", "CanonicalFeeBreakdown", "CanonicalCommission", "CanonicalRefund"],
    eventsPublished: ["payment:intent_created", "commerce:payment_authorized", "commerce:payment_captured", "commerce:payment_settled", "commerce:payment_reversed"],
    eventsConsumed: ["storefront:order_placed", "marketplace:booking_paid", "wallet:transfer_sent"],
    dependencies: ["wallet-core"],
    healthChecks: ["payments.processor_availability", "payments.settlement_rate"],
    permissions: ["payments:read", "payments:write"],
    backendServices: ["payment-engine", "settlement-service"],
    staleTimeMs: 30_000,
  }),
  mod("auth-core", "me", "auth", "platform", "Auth Engine", ["auth", "identity"], {
    routes: ["/login", "/register", "/verify"],
    canonicalModels: ["CanonicalOrbitProfile", "CanonicalUserProfile", "CanonicalAppSession"],
    eventsPublished: ["system:user_online"],
    healthChecks: ["auth.session_validity", "auth.token_freshness"],
    permissions: ["read"],
    uiSurfaces: ["LoginPage", "RegisterPage", "VerificationPage"],
    backendServices: ["auth-service"],
    staleTimeMs: 300_000,
  }),
  mod("notifications-core", "orbit", "notifications", "platform", "Notification Engine", ["notifications"], {
    canonicalModels: ["CanonicalNotification"],
    eventsPublished: ["orbit:notification_created"],
    eventsConsumed: ["orbit:message_received", "wallet:payment_completed", "marketplace:booking_created", "delivery:delivered"],
    dependencies: ["orbit-core"],
    healthChecks: ["notifications.delivery_rate", "notifications.queue_depth"],
    featureFlags: ["push_notifications", "email_notifications"],
    permissions: ["read"],
    uiSurfaces: ["NotificationCenter", "NotificationBadge"],
    backendServices: ["notification-service"],
    staleTimeMs: 30_000,
  }),
  mod("realtime-core", "orbit", "realtime", "platform", "Realtime Engine", ["realtime", "messaging"], {
    canonicalModels: ["CanonicalPresence"],
    eventsPublished: ["system:sync_completed"],
    healthChecks: ["realtime.connection_status", "realtime.channel_health", "realtime.latency"],
    permissions: ["read"],
    backendServices: ["realtime-service"],
    staleTimeMs: 5_000,
  }),
  mod("support-core", "orbit", "support", "platform", "Support Engine", ["support", "messaging"], {
    routes: ["/support", "/support/:ticketId"],
    canonicalModels: ["CanonicalSupportTicket", "CanonicalMessage"],
    eventsConsumed: ["orbit:message_sent"],
    dependencies: ["orbit-core"],
    healthChecks: ["support.ticket_queue", "support.response_time"],
    permissions: ["read", "support:read", "support:write"],
    uiSurfaces: ["SupportCenter", "TicketDetail"],
    backendServices: ["support-service"],
    staleTimeMs: 60_000,
  }),
];

class ModuleRegistry {
  private modules = new Map<string, ModuleDescriptor>();
  private errorCounts = new Map<string, number>();
  private bootTimestamps = new Map<string, number>();

  constructor() {
    for (const m of PILLAR_MODULES) {
      this.modules.set(m.id, { ...m });
    }
  }

  registerModule(descriptor: ModuleDescriptor): void {
    this.modules.set(descriptor.id, { ...descriptor });
  }

  getModule(id: string): ModuleDescriptor | undefined {
    return this.modules.get(id);
  }

  getAllModules(): ModuleDescriptor[] {
    return Array.from(this.modules.values());
  }

  getModulesByPillar(pillar: PillarId): ModuleDescriptor[] {
    return this.getAllModules().filter((m) => m.pillar === pillar);
  }

  getModulesByDomain(domain: ModuleDomain): ModuleDescriptor[] {
    return this.getAllModules().filter((m) => m.domain === domain);
  }

  getModulesByCapability(capability: ModuleCapability): ModuleDescriptor[] {
    return this.getAllModules().filter((m) => m.capabilities.includes(capability));
  }

  getModuleByRoute(route: string): ModuleDescriptor | undefined {
    return this.getAllModules().find((m) =>
      m.routes.some((r) => {
        const pattern = r.replace(/:[^/]+/g, "[^/]+");
        return new RegExp(`^${pattern}$`).test(route);
      })
    );
  }

  getModulesUsingCanonical(model: string): ModuleDescriptor[] {
    return this.getAllModules().filter((m) => m.canonicalModels.includes(model));
  }

  getModulesPublishingEvent(event: string): ModuleDescriptor[] {
    return this.getAllModules().filter((m) => m.eventsPublished.includes(event));
  }

  getModulesConsumingEvent(event: string): ModuleDescriptor[] {
    return this.getAllModules().filter((m) => m.eventsConsumed.includes(event));
  }

  getDependents(moduleId: string): ModuleDescriptor[] {
    return this.getAllModules().filter((m) => m.dependencies.includes(moduleId));
  }

  getDependencyGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const m of this.getAllModules()) {
      graph[m.id] = m.dependencies;
    }
    return graph;
  }

  getEventTopology(): { publishers: Record<string, string[]>; consumers: Record<string, string[]> } {
    const publishers: Record<string, string[]> = {};
    const consumers: Record<string, string[]> = {};
    for (const m of this.getAllModules()) {
      for (const e of m.eventsPublished) {
        if (!publishers[e]) publishers[e] = [];
        publishers[e].push(m.id);
      }
      for (const e of m.eventsConsumed) {
        if (!consumers[e]) consumers[e] = [];
        consumers[e].push(m.id);
      }
    }
    return { publishers, consumers };
  }

  setStatus(moduleId: string, status: ModuleStatus, error?: string): void {
    const m = this.modules.get(moduleId);
    if (!m) return;

    const prev = m.status;
    m.status = status;
    m.runtimeStatus = status;

    if (status === "active") {
      m.lastActiveAt = Date.now();
      if (!this.bootTimestamps.has(moduleId)) {
        this.bootTimestamps.set(moduleId, Date.now());
      }
    }

    if (status === "error" || status === "degraded") {
      m.lastErrorAt = Date.now();
      m.lastError = error || null;
      this.errorCounts.set(moduleId, (this.errorCounts.get(moduleId) || 0) + 1);
    }

    if (prev !== status) {
      platformBus.emit(
        "system:module_status_changed",
        { moduleId, from: prev, to: status, error },
        "system"
      );
    }
  }

  activateModule(moduleId: string): void {
    this.setStatus(moduleId, "active");
  }

  deactivateModule(moduleId: string): void {
    this.setStatus(moduleId, "idle");
  }

  getModuleHealth(moduleId: string): ModuleHealthSnapshot | null {
    const m = this.modules.get(moduleId);
    if (!m) return null;

    const bootTs = this.bootTimestamps.get(moduleId);
    const now = Date.now();
    const staleness: ModuleHealthSnapshot["staleness"] =
      m.lastActiveAt && now - m.lastActiveAt < m.staleTimeMs
        ? "fresh"
        : m.lastActiveAt && now - m.lastActiveAt < m.staleTimeMs * 3
          ? "stale"
          : "expired";

    return {
      moduleId,
      status: m.status,
      upSinceMs: bootTs ? now - bootTs : null,
      errorCount: this.errorCounts.get(moduleId) || 0,
      lastError: m.lastError,
      staleness,
    };
  }

  getPillarHealth(pillar: PillarId): {
    pillar: PillarId;
    status: ModuleStatus;
    modules: ModuleHealthSnapshot[];
  } {
    const mods = this.getModulesByPillar(pillar);
    const healths = mods
      .map((m) => this.getModuleHealth(m.id))
      .filter(Boolean) as ModuleHealthSnapshot[];

    let status: ModuleStatus = "active";
    if (healths.some((h) => h.status === "error")) status = "error";
    else if (healths.some((h) => h.status === "degraded")) status = "degraded";
    else if (healths.every((h) => h.status === "idle")) status = "idle";

    return { pillar, status, modules: healths };
  }

  getOSHealth(): {
    status: ModuleStatus;
    pillars: Record<PillarId, ModuleStatus>;
    totalModules: number;
    activeModules: number;
    errorModules: number;
    degradedModules: number;
    registeredRoutes: number;
    registeredEvents: number;
    canonicalModels: string[];
  } {
    const pillars = (["dashboard", "radar", "orbit", "wallet", "me"] as PillarId[]).reduce(
      (acc, p) => {
        acc[p] = this.getPillarHealth(p).status;
        return acc;
      },
      {} as Record<PillarId, ModuleStatus>
    );

    const all = this.getAllModules();
    const activeCount = all.filter((m) => m.status === "active").length;
    const errorCount = all.filter((m) => m.status === "error").length;
    const degradedCount = all.filter((m) => m.status === "degraded").length;

    const allRoutes = new Set(all.flatMap((m) => m.routes));
    const allEvents = new Set([...all.flatMap((m) => m.eventsPublished), ...all.flatMap((m) => m.eventsConsumed)]);
    const allModels = [...new Set(all.flatMap((m) => m.canonicalModels))];

    let status: ModuleStatus = "active";
    if (errorCount > 0) status = Object.values(pillars).every((s) => s === "error") ? "error" : "degraded";
    else if (activeCount === 0) status = "idle";

    return {
      status,
      pillars,
      totalModules: all.length,
      activeModules: activeCount,
      errorModules: errorCount,
      degradedModules: degradedCount,
      registeredRoutes: allRoutes.size,
      registeredEvents: allEvents.size,
      canonicalModels: allModels,
    };
  }

  getRegistrySummary(): {
    moduleCount: number;
    byPillar: Record<string, number>;
    byDomain: Record<string, number>;
    totalRoutes: number;
    totalEvents: number;
    totalCanonicalModels: number;
    totalHealthChecks: number;
    missingHealthChecks: string[];
    orphanedDependencies: string[];
  } {
    const all = this.getAllModules();
    const byPillar: Record<string, number> = {};
    const byDomain: Record<string, number> = {};
    for (const m of all) {
      byPillar[m.pillar] = (byPillar[m.pillar] ?? 0) + 1;
      byDomain[m.domain] = (byDomain[m.domain] ?? 0) + 1;
    }

    const allIds = new Set(all.map((m) => m.id));
    const orphaned: string[] = [];
    for (const m of all) {
      for (const dep of m.dependencies) {
        if (!allIds.has(dep)) orphaned.push(`${m.id} → ${dep}`);
      }
    }

    const noHealth = all.filter((m) => m.healthChecks.length === 0).map((m) => m.id);

    return {
      moduleCount: all.length,
      byPillar,
      byDomain,
      totalRoutes: new Set(all.flatMap((m) => m.routes)).size,
      totalEvents: new Set([...all.flatMap((m) => m.eventsPublished), ...all.flatMap((m) => m.eventsConsumed)]).size,
      totalCanonicalModels: new Set(all.flatMap((m) => m.canonicalModels)).size,
      totalHealthChecks: all.reduce((s, m) => s + m.healthChecks.length, 0),
      missingHealthChecks: noHealth,
      orphanedDependencies: orphaned,
    };
  }

  reset(): void {
    for (const m of this.modules.values()) {
      m.status = "idle";
      m.runtimeStatus = "idle";
      m.lastActiveAt = null;
      m.lastErrorAt = null;
      m.lastError = null;
    }
    this.errorCounts.clear();
    this.bootTimestamps.clear();
  }
}

export const moduleRegistry = new ModuleRegistry();

export function installModuleLifecycle(): () => void {
  const unsubs: (() => void)[] = [];

  const PILLAR_PREFIX_MAP: Record<string, PillarId> = {
    dashboard: "dashboard",
    radar: "radar",
    orbit: "orbit",
    wallet: "wallet",
    me: "me",
  };

  const DOMAIN_PREFIX_MAP: Record<string, string> = {
    marketplace: "marketplace-core",
    property: "property-core",
    delivery: "delivery-core",
    dispatch: "delivery-core",
    tracking: "taxi-core",
    storefront: "marketplace-core",
    commerce: "payments-core",
    payment: "payments-core",
    pm: "property-core",
  };

  for (const [prefix, pillar] of Object.entries(PILLAR_PREFIX_MAP)) {
    unsubs.push(
      platformBus.onPrefix(`${prefix}:`, () => {
        const mods = moduleRegistry.getModulesByPillar(pillar);
        const core = mods.find((m) => m.id === `${pillar}-core`);
        if (core && core.status === "idle") {
          moduleRegistry.activateModule(core.id);
        }
        if (core) {
          core.lastActiveAt = Date.now();
        }
      })
    );
    unsubs.push(
      platformBus.onPrefix(`${prefix}.`, () => {
        const mods = moduleRegistry.getModulesByPillar(pillar);
        const core = mods.find((m) => m.id === `${pillar}-core`);
        if (core && core.status === "idle") {
          moduleRegistry.activateModule(core.id);
        }
        if (core) {
          core.lastActiveAt = Date.now();
        }
      })
    );
  }

  for (const [prefix, moduleId] of Object.entries(DOMAIN_PREFIX_MAP)) {
    unsubs.push(
      platformBus.onPrefix(`${prefix}:`, () => {
        const m = moduleRegistry.getModule(moduleId);
        if (m && m.status === "idle") {
          moduleRegistry.activateModule(moduleId);
        }
        if (m) m.lastActiveAt = Date.now();
      })
    );
  }

  return () => unsubs.forEach((fn) => fn());
}
