/**
 * useBoostEngine — React hook for consuming the Canonical Boost Engine.
 * Resolves boosts for a specific surface, handles tracking automatically.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  resolveBoostsForSurface,
  trackBoostImpression,
  trackBoostClick,
  trackBoostLead,
  type BoostMatch,
  type SlotContext,
} from "@/lib/boost/canonical-boost-engine";

export function useBoostSlots(
  surface: string,
  ctx: {
    vertical?: string | null;
    subcategory?: string | null;
    country?: string | null;
    city?: string | null;
    zone?: string | null;
    locale?: string;
  } = {}
) {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Map<string, BoostMatch>>(new Map());
  const [loading, setLoading] = useState(true);
  const resolved = useRef(false);

  useEffect(() => {
    if (resolved.current) return;
    resolved.current = true;

    resolveBoostsForSurface(surface, {
      ...ctx,
      userId: user?.id,
      sessionId: sessionStorage.getItem("el_boost_sid") || undefined,
    }).then((result) => {
      setSlots(result);
      setLoading(false);
      // Auto-track impressions
      result.forEach((match) => {
        trackBoostImpression(match, user?.id);
      });
    }).catch(() => setLoading(false));
  }, [surface]);

  const handleClick = useCallback((slotKey: string, clickType = "cta") => {
    const match = slots.get(slotKey);
    if (match) {
      trackBoostClick(match, clickType, user?.id);
    }
  }, [slots, user?.id]);

  const handleLead = useCallback((slotKey: string, leadType: string, opts?: any) => {
    const match = slots.get(slotKey);
    if (match) {
      trackBoostLead(match, leadType, opts);
    }
  }, [slots]);

  return { slots, loading, handleClick, handleLead, getSlot: (key: string) => slots.get(key) };
}
