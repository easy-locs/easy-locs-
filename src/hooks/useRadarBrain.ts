/**
 * useRadarBrain — Connects the Radar Brain Orchestrator to the UI.
 * Evaluates zone context, produces decisions, feeds pricing + notifications.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { evaluateRadarBrain, type RadarBrainState } from "@/lib/radar/radar-brain-orchestrator";
import { buildZoneKey } from "@/lib/mobility/live-context-engine";
import { computeDynamicPrice, buildPricingContextFromRadar, type PricingResult } from "@/lib/radar/dynamic-pricing-engine";
import { getRadarBehavior, type RadarCategoryBehavior } from "@/lib/radar/category-radar-behavior";
import { useLocationStore } from "@/stores/locationStore";

interface UseRadarBrainOptions {
  vertical?: string;
  zoneKey?: string;
  autoEvaluate?: boolean;
  evaluateIntervalMs?: number;
}

interface RadarBrainHookResult {
  brain: RadarBrainState | null;
  behavior: RadarCategoryBehavior;
  loading: boolean;
  evaluate: () => Promise<void>;
  getPricing: (baseFee: number, distanceKm: number, feePerKm: number, currency: string, isScheduled?: boolean) => PricingResult | null;
}

export function useRadarBrain(options: UseRadarBrainOptions = {}): RadarBrainHookResult {
  const { vertical = "food", zoneKey: explicitZoneKey, autoEvaluate = true, evaluateIntervalMs = 60_000 } = options;

  const [brain, setBrain] = useState<RadarBrainState | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const currentLocation = useLocationStore((s) => s.currentLocation);
  const behavior = useMemo(() => getRadarBehavior(vertical), [vertical]);

  const zoneKey = explicitZoneKey ?? "AE_DUBAI";

  const evaluate = useCallback(async () => {
    setLoading(true);
    try {
      const result = await evaluateRadarBrain({
        zoneKey,
        customerLat: currentLocation?.lat,
        customerLng: currentLocation?.lng,
        vertical,
      });
      setBrain(result);
    } catch (e) {
      console.error("[radar-brain] evaluation failed:", e);
    } finally {
      setLoading(false);
    }
  }, [zoneKey, currentLocation?.lat, currentLocation?.lng, vertical]);

  // Auto-evaluate on mount and interval
  useEffect(() => {
    if (!autoEvaluate) return;

    evaluate();
    intervalRef.current = setInterval(evaluate, evaluateIntervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoEvaluate, evaluate, evaluateIntervalMs]);

  // Pricing helper
  const getPricing = useCallback(
    (baseFee: number, distanceKm: number, feePerKm: number, currency: string, isScheduled = false): PricingResult | null => {
      if (!brain) return null;

      const surgeDecision = brain.decisions.find(d => d.type === "surge_pricing");
      const surgeMultiplier = surgeDecision?.type === "surge_pricing" ? (surgeDecision as any).multiplier : 1.0;

      const ctx = buildPricingContextFromRadar({
        baseFee,
        distanceKm,
        feePerKm,
        geoContext: brain.geoContext as any,
        surgeMultiplier,
        isScheduled,
        currency,
      });

      return computeDynamicPrice(ctx);
    },
    [brain],
  );

  return { brain, behavior, loading, evaluate, getPricing };
}
