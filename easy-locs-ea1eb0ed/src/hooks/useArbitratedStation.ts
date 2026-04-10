/**
 * useArbitratedStation — Hook that combines GeoLiveStation with Super Brain arbitration.
 * Returns arbitrated ETAs, surge, and safety state instead of raw station data.
 * 
 * This is the SINGLE source of truth for UI display of ETAs/pricing/promises.
 * All UI surfaces must use this hook, not raw useGeoLiveStation.
 */
import { useMemo } from "react";
import { useGeoLiveStation } from "@/hooks/useGeoLiveStation";
import { quickArbitrate, type ArbitrationResult, DecisionPriority } from "@/lib/brain/platform-super-brain";
import type { ETAProjection } from "@/lib/radar/eta-projection-engine";

export interface ArbitratedStationState {
  /** Raw station data */
  zoneKey: string | null;
  label: string | null;
  loading: boolean;

  /** Arbitrated outputs — use these in UI, NOT raw etas */
  etas: ETAProjection;
  surge: number;
  safetyBlock: boolean;
  riderCount: number;
  trafficLevel: string | null;
  weatherType: string | null;

  /** Full arbitration result for advanced consumers */
  arbitration: ArbitrationResult | null;

  /** Promise warnings to show in UI */
  warnings: string[];
}

const EMPTY_ETAS: ETAProjection = { food: null, grocery: null, taxi: null, parcel: null };

export function useArbitratedStation(): ArbitratedStationState {
  const station = useGeoLiveStation();

  const result = useMemo(() => {
    if (!station.station) {
      return {
        zoneKey: station.zoneKey,
        label: station.label,
        loading: station.loading,
        etas: station.etas,
        surge: 1.0,
        safetyBlock: false,
        riderCount: 0,
        trafficLevel: null,
        weatherType: null,
        arbitration: null,
        warnings: [],
      };
    }

    // Run arbitration
    const arb = quickArbitrate(station.station, station.etas);

    // Extract warnings for UI
    const warnings: string[] = [];
    for (const d of arb.decisions) {
      if (d.module === "promise" && (d.action === "degrade_promise" || d.action === "reject_promise")) {
        if (d.action === "degrade_promise") {
          warnings.push(d.degradedValue);
        } else {
          warnings.push(`${d.promiseType.replace(/_/g, " ")} temporarily unavailable`);
        }
      }
    }

    return {
      zoneKey: station.zoneKey,
      label: station.label,
      loading: station.loading,
      etas: arb.arbitratedETAs,
      surge: arb.arbitratedSurge,
      safetyBlock: arb.safetyBlock,
      riderCount: station.station.rider_supply,
      trafficLevel: station.station.traffic_level,
      weatherType: station.station.weather_type,
      arbitration: arb,
      warnings,
    };
  }, [station.station, station.etas, station.zoneKey, station.label, station.loading]);

  return result;
}
