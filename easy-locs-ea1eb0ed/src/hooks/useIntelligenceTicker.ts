import { useState, useEffect, useCallback, useRef } from "react";
import { isPlatformFlagEnabled } from "@/lib/growth/feature-flag-registry";
import { isFeatureEnabled } from "@/lib/control-plane/kill-switches";
import { composeTicker, advanceTicker, getCurrentTickerItem } from "@/lib/intelligence/global/ticker-engine";
import { bootProviders, executeShadowValidation } from "@/lib/intelligence/global/provider-boot";
import { fetchFromAllProviders } from "@/lib/intelligence/global/provider-adapter";
import type { TickerItem, TickerState } from "@/lib/intelligence/global/ticker-engine";

const ROTATION_INTERVAL_MS = 8_000;
const REFRESH_INTERVAL_MS = 300_000;

export function useIntelligenceTicker(country: string, city?: string) {
  const [tickerState, setTickerState] = useState<TickerState | null>(null);
  const [currentItem, setCurrentItem] = useState<TickerItem | null>(null);
  const [visible, setVisible] = useState(false);
  const rotationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isGated = useCallback(() => {
    return (
      !isPlatformFlagEnabled("enable_global_intelligence") ||
      !isPlatformFlagEnabled("enable_intelligence_ticker") ||
      !isFeatureEnabled("intelligence_enabled")
    );
  }, []);

  const refresh = useCallback(() => {
    if (isGated()) {
      setTickerState(null);
      setCurrentItem(null);
      setVisible(false);
      return;
    }
    bootProviders();
    const state = composeTicker(country, city);
    setTickerState(state);
    setCurrentItem(getCurrentTickerItem(state));
    setVisible(!state.gated && state.items.length > 0);
    if (!state.gated && state.items.length > 0) {
      const raw = fetchFromAllProviders(country, city);
      executeShadowValidation(raw);
    }
  }, [country, city, isGated]);

  useEffect(() => {
    refresh();

    refreshRef.current = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current);
    };
  }, [refresh]);

  useEffect(() => {
    if (!tickerState || tickerState.gated || tickerState.items.length === 0) {
      if (rotationRef.current) clearInterval(rotationRef.current);
      return;
    }

    rotationRef.current = setInterval(() => {
      if (isGated()) {
        setTickerState(null);
        setCurrentItem(null);
        setVisible(false);
        return;
      }
      setTickerState(prev => {
        if (!prev) return prev;
        const next = advanceTicker(prev);
        setCurrentItem(getCurrentTickerItem(next));
        setVisible(next.items.length > 0);
        return next;
      });
    }, ROTATION_INTERVAL_MS);

    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current);
    };
  }, [tickerState?.gated, tickerState?.items.length]);

  return { currentItem, visible, tickerState, refresh };
}
