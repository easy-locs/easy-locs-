/**
 * DINO Journey Wiring — Track real business events to both PostHog and Supabase.
 */

import { supabase } from "@/integrations/supabase/client";
import { captureEvent } from "@/lib/analytics/posthog";
import type { Json } from "@/integrations/supabase/types";

export type BusinessEvent =
  | "RESTAURANT_OPEN"
  | "ADD_TO_CART"
  | "PROPERTY_DETAIL_OPEN"
  | "PROPERTY_CONTACT_CLICK"
  | "TRAVEL_PAGE_OPEN"
  | "SETTINGS_PAGE_OPEN"
  | "ONBOARDING_STEP_COMPLETE"
  | "CHECKOUT_START"
  | "CHECKOUT_ABANDON"
  | "SHOP_PAGE_OPEN"
  | "PROFILE_PUBLISH"
  | "CTA_CLICK";

export async function trackBusinessEvent(input: {
  event: BusinessEvent;
  route: string;
  actorType: "anonymous" | "user" | "pro";
  actorId?: string | null;
  context?: Record<string, unknown>;
  country?: string | null;
  language?: string | null;
}) {
  // PostHog
  captureEvent(input.event, {
    route: input.route,
    actorType: input.actorType,
    actorId: input.actorId,
    ...input.context,
  });

  // Supabase journey_events
  await supabase.from("journey_events").insert([{
    actor_type: input.actorType,
    actor_id: input.actorId ?? null,
    event_name: input.event,
    route: input.route,
    country: input.country ?? null,
    language: input.language ?? null,
    device_type: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
    context_json: (input.context ?? {}) as Json,
  }]);
}

/**
 * Convenience helpers for common business events.
 */
export function trackRestaurantOpen(restaurantId: string, actorId?: string) {
  return trackBusinessEvent({
    event: "RESTAURANT_OPEN",
    route: `/food/restaurant/${restaurantId}`,
    actorType: actorId ? "user" : "anonymous",
    actorId,
    context: { restaurantId },
  });
}

export function trackAddToCart(itemId: string, route: string, actorId?: string) {
  return trackBusinessEvent({
    event: "ADD_TO_CART",
    route,
    actorType: actorId ? "user" : "anonymous",
    actorId,
    context: { itemId },
  });
}

export function trackCheckoutStart(route: string, actorId: string) {
  return trackBusinessEvent({
    event: "CHECKOUT_START",
    route,
    actorType: "user",
    actorId,
  });
}

export function trackCheckoutAbandon(route: string, actorId: string) {
  return trackBusinessEvent({
    event: "CHECKOUT_ABANDON",
    route,
    actorType: "user",
    actorId,
  });
}
