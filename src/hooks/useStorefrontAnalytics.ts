/**
 * useStorefrontAnalytics — Tracks real buyer events to storefront_analytics_events.
 * Events: page_view, product_view, add_to_cart, checkout, purchase
 */
import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SESSION_KEY = "sf_session_id";

function getSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function getDeviceType(): string {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function useStorefrontAnalytics(shopId: string | undefined) {
  const { user } = useAuth();
  const tracked = useRef(new Set<string>());

  const track = useCallback(
    async (
      eventType: string,
      opts?: { itemId?: string; revenue?: number; currency?: string; meta?: Record<string, any> }
    ) => {
      if (!shopId) return;

      // Deduplicate page_view per session
      const dedupeKey = `${eventType}:${opts?.itemId || ""}`;
      if (eventType === "page_view" && tracked.current.has(dedupeKey)) return;
      tracked.current.add(dedupeKey);

      try {
        await (supabase as any).from("storefront_analytics_events").insert({
          shop_id: shopId,
          event_type: eventType,
          item_id: opts?.itemId || null,
          user_id: user?.id || null,
          session_id: getSessionId(),
          referrer: document.referrer || null,
          country: null, // could use geo later
          device_type: getDeviceType(),
          metadata_json: opts?.meta || null,
          revenue: opts?.revenue || null,
          currency: opts?.currency || null,
        });
      } catch {
        // Silent fail — analytics should never block UX
      }
    },
    [shopId, user?.id]
  );

  return {
    trackPageView: useCallback(() => track("page_view"), [track]),
    trackProductView: useCallback((itemId: string) => track("product_view", { itemId }), [track]),
    trackAddToCart: useCallback(
      (itemId: string, price: number, currency?: string) =>
        track("add_to_cart", { itemId, revenue: price, currency }),
      [track]
    ),
    trackCheckout: useCallback(
      (total: number, currency?: string) => track("checkout_start", { revenue: total, currency }),
      [track]
    ),
    trackPurchase: useCallback(
      (orderId: string, total: number, currency?: string) =>
        track("purchase", { revenue: total, currency, meta: { orderId } }),
      [track]
    ),
    trackSearch: useCallback(
      (query: string) => track("search", { meta: { query } }),
      [track]
    ),
    track,
  };
}
