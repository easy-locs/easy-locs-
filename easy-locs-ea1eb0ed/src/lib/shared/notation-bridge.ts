/**
 * Notation Bridge — reverse path: eventBus (dot-notation) → platformBus (colon-notation)
 *
 * The forward path (platformBus colon → eventBus dot) is handled in event-init.ts via BRIDGE_MAP.
 * This module closes the loop so that events emitted on eventBus are also available on platformBus.
 *
 * Key mismatches resolved:
 *   - wallet.payment.required  → wallet:payment_requested
 *   - mobility.requested       → dispatch:job_created
 *   - booking.completed        → marketplace:booking_completed
 *   - booking.created          → marketplace:booking_created
 *   - ride.completed           → tracking:completed
 *   - delivery.completed       → delivery:completed
 *   - message.sent             → orbit:message_sent (already in forward map, also reverse)
 */

import { platformBus, type PlatformEventType } from "@/lib/shared/platform-bus";
import { eventBus } from "@/lib/core/event-bus";

type ReverseEntry = {
  colonEvent: PlatformEventType | string;
  source: "wallet" | "orbit" | "marketplace" | "pm" | "system" | "tracking";
};

const DOT_TO_COLON_MAP: Record<string, ReverseEntry> = {
  "wallet.payment.required":    { colonEvent: "wallet:payment_requested",       source: "wallet" },
  "wallet.payment.success":     { colonEvent: "wallet:payment_success",          source: "wallet" },
  "wallet.payment.failed":      { colonEvent: "wallet:payment_failed",           source: "wallet" },
  "wallet.transaction.created": { colonEvent: "wallet:transaction_created",      source: "wallet" },
  "wallet.balance.refresh":     { colonEvent: "wallet:balance_updated",          source: "wallet" },
  "booking.completed":          { colonEvent: "marketplace:booking_completed",   source: "marketplace" },
  "booking.created":            { colonEvent: "marketplace:booking_created",     source: "marketplace" },
  "order.created":              { colonEvent: "storefront:order_placed",         source: "marketplace" },
  "order.completed":            { colonEvent: "storefront:order_completed",      source: "marketplace" },
  "message.sent":               { colonEvent: "orbit:message_sent",              source: "orbit" },
  "message.received":           { colonEvent: "orbit:message_received",          source: "orbit" },
  "call.started":               { colonEvent: "orbit:call_started",              source: "orbit" },
  "call.ended":                 { colonEvent: "orbit:call_ended",                source: "orbit" },
  "listing.created":            { colonEvent: "listing:created",                 source: "marketplace" },
  "listing.published":          { colonEvent: "listing:published",               source: "marketplace" },
  "ride.completed":             { colonEvent: "tracking:completed",              source: "tracking" },
  "delivery.completed":         { colonEvent: "delivery:completed",              source: "tracking" },
  // mobility.requested is the authoritative unified event for dispatch
  // delivery.requested is NOT mapped here: compat handler translates it → mobility.requested first
  // to avoid a duplicate dispatch:job_created emission on each delivery.requested
  "mobility.requested":         { colonEvent: "dispatch:job_created",            source: "tracking" },
};

let _installed = false;
const _handlers: Map<string, (payload: any) => void> = new Map();

/**
 * Install the reverse notation bridge: eventBus (dot) → platformBus (colon).
 * Idempotent — safe to call multiple times, will only install once.
 * Returns a cleanup function.
 */
export function installReverseNotationBridge(): () => void {
  if (_installed) return () => {};
  _installed = true;

  for (const [dotEvent, { colonEvent, source }] of Object.entries(DOT_TO_COLON_MAP)) {
    const handler = async (payload: any) => {
      if (payload?.__bridged) return;
      platformBus.emit(
        colonEvent as PlatformEventType,
        { ...(payload ?? {}), __bridged: true, _bridgedFrom: dotEvent },
        source
      );
    };
    _handlers.set(dotEvent, handler);
    eventBus.on(dotEvent, handler);
  }

  if (import.meta.env.DEV) {
    console.log(
      `[notation-bridge] Reverse bridge installed — ${Object.keys(DOT_TO_COLON_MAP).length} dot→colon mappings active`
    );
  }

  return () => {
    _installed = false;
    for (const [dotEvent, handler] of _handlers) {
      eventBus.off(dotEvent, handler);
    }
    _handlers.clear();
  };
}
