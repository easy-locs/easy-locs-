/**
 * useAdTracking — PASS142: Track impressions, clicks, conversions for monetization.
 * Fires silently to ad_events table. Never blocks UX.
 */
import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const SESSION_KEY = "el_ad_sid";

function getAdSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function getDevice(): string {
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export function useAdTracking() {
  const { user } = useAuth();
  const seen = useRef(new Set<string>());

  const trackAd = useCallback(
    async (
      eventType: "impression" | "click" | "conversion",
      opts: {
        targetType: string;
        targetId: string;
        shopId?: string;
        placement?: string;
        costLocs?: number;
        meta?: Record<string, any>;
      }
    ) => {
      // Deduplicate impressions per session
      const key = `${eventType}:${opts.targetId}:${opts.placement || ""}`;
      if (eventType === "impression" && seen.current.has(key)) return;
      seen.current.add(key);

      try {
        await (supabase as any).from("ad_events").insert({
          event_type: eventType,
          target_type: opts.targetType,
          target_id: opts.targetId,
          shop_id: opts.shopId || null,
          placement: opts.placement || "feed",
          user_id: user?.id || null,
          session_id: getAdSessionId(),
          device_type: getDevice(),
          referrer: document.referrer || null,
          cost_locs: opts.costLocs || 0,
          metadata_json: opts.meta || null,
        });
      } catch {
        // Silent — never block UX
      }
    },
    [user?.id]
  );

  return {
    trackImpression: useCallback(
      (targetType: string, targetId: string, placement?: string, shopId?: string) =>
        trackAd("impression", { targetType, targetId, placement, shopId }),
      [trackAd]
    ),
    trackClick: useCallback(
      (targetType: string, targetId: string, placement?: string, shopId?: string) =>
        trackAd("click", { targetType, targetId, placement, shopId }),
      [trackAd]
    ),
    trackConversion: useCallback(
      (targetType: string, targetId: string, costLocs?: number, shopId?: string) =>
        trackAd("conversion", { targetType, targetId, costLocs, shopId }),
      [trackAd]
    ),
    trackAd,
  };
}
