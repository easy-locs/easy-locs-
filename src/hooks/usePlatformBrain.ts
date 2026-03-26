/**
 * usePlatformBrain — Unified hook exposing all 5 brains through one interface.
 * 
 * This is the RECOMMENDED entry point for any UI surface needing platform intelligence.
 * 
 * Flow: Geo → Execution → Category → Arbitration → Experience → UI
 */
import { useMemo } from "react";
import { useGeoStore } from "@/lib/geo/geo-store";
import { useLocationStore } from "@/stores/locationStore";
import { useRadarPlaceStore } from "@/stores/radarPlaceStore";
import { useArbitratedStation, type ArbitratedStationState } from "@/hooks/useArbitratedStation";
import { getGeoBrainState, type GeoBrainState } from "@/lib/brain/geo-brain";
import { deriveExecutionState, type ExecutionBrainState } from "@/lib/brain/execution-brain";
import { getCategoryBrain, type CategoryBrainState, type CategoryKey } from "@/lib/brain/category-brain";
import { computeExperienceBrain, type ExperienceBrainOutput } from "@/lib/brain/experience-brain";

export interface PlatformBrainOutput {
  /** 1. Geo Brain — location & zone */
  geo: GeoBrainState;
  /** 2. Execution Brain — station, weather, traffic, supply, demand */
  execution: ExecutionBrainState;
  /** 3. Category Brain — per-vertical behavior (call with category key) */
  category: (key: CategoryKey) => CategoryBrainState;
  /** 4. Arbitration Brain — final ETAs, surge, safety, warnings */
  arbitration: ArbitratedStationState;
  /** 5. Experience Brain — suggestions, trending */
  experience: ExperienceBrainOutput;
  /** Loading state */
  loading: boolean;
}

export function usePlatformBrain(): PlatformBrainOutput {
  // Triggers re-render on location changes
  const gpsPoint = useGeoStore((s) => s.point);
  const gpsPermission = useGeoStore((s) => s.permission);
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const radarPlace = useRadarPlaceStore((s) => s.selectedPlace);

  // 4. Arbitration (includes station fetch + arbitration)
  const arbitration = useArbitratedStation();

  // 1. Geo Brain
  const geo = useMemo(() => getGeoBrainState(), [gpsPoint, gpsPermission, selectedLocation, radarPlace]);

  // 2. Execution Brain (derived from arbitrated station)
  const execution = useMemo(
    () => deriveExecutionState(arbitration.arbitration?.arbitratedETAs ? arbitration as any : null, null),
    [arbitration],
  );

  // Proper execution from station
  const executionState = useMemo(() => {
    if (!arbitration.arbitration) {
      return deriveExecutionState(null, null);
    }
    // Build a minimal station-like object from arbitrated data
    const station = (arbitration as any).arbitration ? {
      zone_key: arbitration.zoneKey ?? "",
      weather_type: arbitration.weatherType,
      weather_intensity: 0,
      traffic_level: arbitration.trafficLevel,
      traffic_speed_factor: 1,
      rider_supply: arbitration.riderCount,
      rider_supply_factor: 1,
      merchant_count: 0,
      merchant_open_count: 0,
      merchant_deliverable_count: 0,
      avg_food_eta_minutes: arbitration.etas.food,
      avg_grocery_eta_minutes: arbitration.etas.grocery,
      avg_taxi_eta_minutes: arbitration.etas.taxi,
      avg_parcel_eta_minutes: arbitration.etas.parcel,
      demand_level: 0,
      demand_multiplier: 1,
      surge_multiplier: arbitration.surge,
      flood_risk_level: arbitration.safetyBlock ? "high" : null,
      updated_at: new Date().toISOString(),
    } : null;
    return deriveExecutionState(station, null);
  }, [arbitration]);

  // 5. Experience Brain
  const experience = useMemo(
    () => computeExperienceBrain(executionState),
    [executionState],
  );

  return {
    geo,
    execution: executionState,
    category: getCategoryBrain,
    arbitration,
    experience,
    loading: arbitration.loading,
  };
}
