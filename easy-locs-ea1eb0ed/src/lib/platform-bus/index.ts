import { structuredLogger } from "@/lib/observability/structured-logger";
import type { LogDomain } from "@/lib/observability/structured-logger";

export type PlatformEventDomain =
  | "identity"
  | "orbit"
  | "wallet"
  | "listing"
  | "dashboard"
  | "radar"
  | "provider"
  | "booking"
  | "scraping"
  | "notification"
  | "system"
  | "realtime"
  | "media"
  | "taxonomy";

export interface PlatformEvent<T = unknown> {
  id: string;
  name: string;
  domain: PlatformEventDomain;
  timestamp: string;
  release_id?: string;
  environment: string;
  trace_id?: string;
  user_id_safe?: string;
  payload: T;
}

export type EventHandler<T = unknown> = (event: PlatformEvent<T>) => void | Promise<void>;

interface Subscription {
  pattern: string;
  handler: EventHandler<any>;
  once: boolean;
}

const ENV = typeof window !== "undefined"
  ? (window as any).__ENV__ || "development"
  : process.env.NODE_ENV || "development";

let eventCounter = 0;

function generateEventId(): string {
  eventCounter++;
  return `evt_${Date.now()}_${eventCounter}`;
}

const EVENT_HISTORY: PlatformEvent[] = [];
const MAX_HISTORY = 200;

const subscriptions: Subscription[] = [];

function matchPattern(pattern: string, eventName: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith(".*")) {
    return eventName.startsWith(pattern.slice(0, -1));
  }
  return pattern === eventName;
}

function domainToLogDomain(d: PlatformEventDomain): LogDomain {
  const map: Record<PlatformEventDomain, LogDomain> = {
    identity: "identity",
    orbit: "orbit",
    wallet: "wallet",
    listing: "listing",
    dashboard: "dashboard",
    radar: "radar",
    provider: "marketplace",
    booking: "booking",
    scraping: "scraping",
    notification: "notification",
    system: "system",
    realtime: "realtime",
    media: "media",
    taxonomy: "taxonomy",
  };
  return map[d] || "system";
}

export const platformBus = {
  emit<T = unknown>(
    name: string,
    domain: PlatformEventDomain,
    payload: T,
    opts?: { trace_id?: string; user_id_safe?: string }
  ): PlatformEvent<T> {
    const event: PlatformEvent<T> = {
      id: generateEventId(),
      name,
      domain,
      timestamp: new Date().toISOString(),
      environment: ENV,
      payload,
      trace_id: opts?.trace_id,
      user_id_safe: opts?.user_id_safe,
    };

    EVENT_HISTORY.push(event as PlatformEvent);
    if (EVENT_HISTORY.length > MAX_HISTORY) EVENT_HISTORY.shift();

    structuredLogger.debug(
      domainToLogDomain(domain),
      "platform_bus.emit",
      `Event: ${name}`,
      { trace_id: opts?.trace_id }
    );

    const toRemove: number[] = [];
    for (let i = 0; i < subscriptions.length; i++) {
      const sub = subscriptions[i];
      if (matchPattern(sub.pattern, name)) {
        try {
          sub.handler(event);
        } catch (err: any) {
          structuredLogger.error(
            domainToLogDomain(domain),
            "platform_bus.handler_error",
            `Handler failed for ${name}: ${err?.message}`,
            { error_code: "BUS_HANDLER_ERROR" }
          );
        }
        if (sub.once) toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      subscriptions.splice(toRemove[i], 1);
    }

    return event;
  },

  on<T = unknown>(pattern: string, handler: EventHandler<T>): () => void {
    const sub: Subscription = { pattern, handler: handler as EventHandler<any>, once: false };
    subscriptions.push(sub);
    return () => {
      const idx = subscriptions.indexOf(sub);
      if (idx >= 0) subscriptions.splice(idx, 1);
    };
  },

  once<T = unknown>(pattern: string, handler: EventHandler<T>): () => void {
    const sub: Subscription = { pattern, handler: handler as EventHandler<any>, once: true };
    subscriptions.push(sub);
    return () => {
      const idx = subscriptions.indexOf(sub);
      if (idx >= 0) subscriptions.splice(idx, 1);
    };
  },

  getHistory(domain?: PlatformEventDomain, limit = 50): PlatformEvent[] {
    const filtered = domain
      ? EVENT_HISTORY.filter((e) => e.domain === domain)
      : EVENT_HISTORY;
    return filtered.slice(-limit);
  },

  getRecentByName(namePrefix: string, limit = 20): PlatformEvent[] {
    return EVENT_HISTORY.filter((e) => e.name.startsWith(namePrefix)).slice(-limit);
  },

  clearHistory(): void {
    EVENT_HISTORY.length = 0;
  },

  getSubscriptionCount(): number {
    return subscriptions.length;
  },
};

export const PLATFORM_EVENTS = {
  IDENTITY_OTP_REQUESTED: "identity.otp.requested",
  IDENTITY_OTP_VERIFIED: "identity.otp.verified",
  IDENTITY_OTP_FAILED: "identity.otp.failed",
  IDENTITY_ACTIVATED: "identity.activated",
  IDENTITY_CONTACT_SYNC_COMPLETED: "identity.contact.sync.completed",
  IDENTITY_CONTACT_SYNC_FAILED: "identity.contact.sync.failed",
  IDENTITY_SESSION_RESTORED: "identity.session.restored",
  IDENTITY_LOGOUT: "identity.logout",

  ORBIT_THREAD_CREATED: "orbit.thread.created",
  ORBIT_THREAD_OPENED: "orbit.thread.opened",
  ORBIT_MESSAGE_SENT: "orbit.message.sent",
  ORBIT_MESSAGE_DELIVERED: "orbit.message.delivered",
  ORBIT_MESSAGE_READ: "orbit.message.read",
  ORBIT_MESSAGE_FAILED: "orbit.message.failed",
  ORBIT_CALL_STARTED: "orbit.call.started",
  ORBIT_CALL_ANSWERED: "orbit.call.answered",
  ORBIT_CALL_REJECTED: "orbit.call.rejected",
  ORBIT_CALL_ENDED: "orbit.call.ended",
  ORBIT_CALL_FAILED: "orbit.call.failed",
  ORBIT_CONTACT_LINKED: "orbit.contact.linked",
  ORBIT_REALTIME_CONNECTED: "orbit.realtime.connected",
  ORBIT_REALTIME_DISCONNECTED: "orbit.realtime.disconnected",

  WALLET_OPENED: "wallet.opened",
  WALLET_BALANCE_FETCHED: "wallet.balance.fetched",
  WALLET_TOPUP_INITIATED: "wallet.topup.initiated",
  WALLET_TOPUP_CONFIRMED: "wallet.topup.confirmed",
  WALLET_TOPUP_FAILED: "wallet.topup.failed",
  WALLET_PAYMENT_INITIATED: "wallet.payment.initiated",
  WALLET_PAYMENT_CONFIRMED: "wallet.payment.confirmed",
  WALLET_PAYMENT_FAILED: "wallet.payment.failed",
  WALLET_TRANSFER_INITIATED: "wallet.transfer.initiated",
  WALLET_TRANSFER_COMPLETED: "wallet.transfer.completed",
  WALLET_TRANSFER_FAILED: "wallet.transfer.failed",
  WALLET_QR_PAYMENT: "wallet.qr.payment",
  WALLET_CONVERSION_REQUESTED: "wallet.conversion.requested",
  WALLET_PAYOUT_REQUESTED: "wallet.payout.requested",
  WALLET_INTEGRITY_ALERT: "wallet.integrity.alert",

  LISTING_PUBLISH_REQUESTED: "listing.publish.requested",
  LISTING_PUBLISH_APPROVED: "listing.publish.approved",
  LISTING_PUBLISH_BLOCKED: "listing.publish.blocked",
  LISTING_QUARANTINED: "listing.quarantined",
  LISTING_UPDATED: "listing.updated",

  DASHBOARD_CARD_CLICKED: "dashboard.card.clicked",
  DASHBOARD_CARD_LOADED: "dashboard.card.loaded",
  DASHBOARD_CARD_ERROR: "dashboard.card.error",
  DASHBOARD_CARD_DEAD_CLICK: "dashboard.card.dead_click",

  RADAR_SEARCH_EXECUTED: "radar.search.executed",
  RADAR_RESULT_OPENED: "radar.result.opened",
  RADAR_MAP_LOADED: "radar.map.loaded",

  BOOKING_FOOD_CREATED: "booking.food.created",
  BOOKING_HOTEL_CONFIRMED: "booking.hotel.confirmed",
  BOOKING_SERVICE_CREATED: "booking.service.created",
  BOOKING_FLIGHT_TICKETED: "booking.flight.ticketed",
  BOOKING_CANCELLED: "booking.cancelled",

  PROVIDER_PROFILE_UPDATED: "provider.profile.updated",
  PROVIDER_CATALOG_UPDATED: "provider.catalog.updated",
  PROVIDER_PUBLISH_FAILED: "provider.publish.failed",

  SCRAPING_IMPORT_STARTED: "scraping.import.started",
  SCRAPING_IMPORT_COMPLETED: "scraping.import.completed",
  SCRAPING_IMAGE_MISMATCH: "scraping.image.mismatch",
  SCRAPING_ENTITY_MISMATCH: "scraping.entity.mismatch",

  TAXONOMY_CONFLICT_DETECTED: "taxonomy:conflict_detected",
  TAXONOMY_MISMATCH_FIXED: "taxonomy:mismatch_fixed",

  SYSTEM_HEALTH_CHECK: "system.health.check",
  SYSTEM_KILL_SWITCH_TOGGLED: "system.kill_switch.toggled",
  SYSTEM_RELEASE_DEPLOYED: "system.release.deployed",
} as const;

export type PlatformEventName = typeof PLATFORM_EVENTS[keyof typeof PLATFORM_EVENTS];
