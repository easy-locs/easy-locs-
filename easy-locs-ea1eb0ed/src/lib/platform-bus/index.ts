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

/**
 * PLATFORM_EVENTS — canonical event constants.
 *
 * DEDUPLICATION: This previously held a parallel dot-notation event dictionary that conflicted
 * with APP_EVENTS (colon-notation) in @/lib/platform/events.ts.
 * The dot-notation variant has been removed. PLATFORM_EVENTS now re-exports APP_EVENTS as the
 * single canonical source of truth for all event name constants.
 *
 * Emitters and listeners MUST use APP_EVENTS (or this re-export) — never raw strings.
 */
export { APP_EVENTS as PLATFORM_EVENTS } from "@/lib/platform/events";
export type { AppEventKey as PlatformEventName } from "@/lib/platform/events";
