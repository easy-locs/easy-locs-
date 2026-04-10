/**
 * EXECUTION BRAIN — Single source of truth for operational state.
 * 
 * Owns:
 * - ETA projections
 * - Rider availability & supply
 * - Traffic & weather conditions
 * - Station data (geo_live_station)
 * - Serviceability decisions
 * - Dispatch readiness
 * 
 * No UI or component may compute ETA or traffic.
 * All consumers must read from this brain via useArbitratedStation.
 */
import { type GeoLiveStation, type ETAProjection, projectETAs, overlayToStation } from "@/lib/radar/eta-projection-engine";
import { getZoneOverlay, type ZoneOverlay } from "@/lib/radar/radar-place-search-adapter";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXECUTION BRAIN STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ExecutionBrainState {
  station: GeoLiveStation | null;
  etas: ETAProjection;
  overlay: ZoneOverlay | null;
  /** Weather summary */
  weather: { type: string | null; intensity: number; isStorm: boolean };
  /** Traffic summary */
  traffic: { level: string | null; speedFactor: number; isSevere: boolean };
  /** Supply summary */
  supply: { riderCount: number; isLow: boolean; factor: number };
  /** Demand summary */
  demand: { level: number; multiplier: number; isHigh: boolean; surgeActive: boolean; surgeMultiplier: number };
  /** Safety flags */
  safety: { floodRisk: string | null; isBlocked: boolean };
  /** Merchant summary */
  merchants: { total: number; open: number; deliverable: number };
}

const EMPTY_ETAS: ETAProjection = { food: null, grocery: null, taxi: null, parcel: null };

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DERIVE: Build execution state from station
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function deriveExecutionState(
  station: GeoLiveStation | null,
  overlay: ZoneOverlay | null,
): ExecutionBrainState {
  if (!station) {
    return {
      station: null,
      etas: EMPTY_ETAS,
      overlay: null,
      weather: { type: null, intensity: 0, isStorm: false },
      traffic: { level: null, speedFactor: 1, isSevere: false },
      supply: { riderCount: 0, isLow: true, factor: 0 },
      demand: { level: 0, multiplier: 1, isHigh: false, surgeActive: false, surgeMultiplier: 1 },
      safety: { floodRisk: null, isBlocked: false },
      merchants: { total: 0, open: 0, deliverable: 0 },
    };
  }

  const etas = projectETAs(station);

  return {
    station,
    etas,
    overlay,
    weather: {
      type: station.weather_type,
      intensity: station.weather_intensity,
      isStorm: station.weather_type === "storm" || station.weather_intensity > 0.8,
    },
    traffic: {
      level: station.traffic_level,
      speedFactor: station.traffic_speed_factor,
      isSevere: station.traffic_level === "severe",
    },
    supply: {
      riderCount: station.rider_supply,
      isLow: station.rider_supply < 5,
      factor: station.rider_supply_factor,
    },
    demand: {
      level: station.demand_level,
      multiplier: station.demand_multiplier,
      isHigh: station.demand_level > 60,
      surgeActive: station.surge_multiplier > 1.05,
      surgeMultiplier: station.surge_multiplier,
    },
    safety: {
      floodRisk: station.flood_risk_level,
      isBlocked: station.flood_risk_level === "high" || station.flood_risk_level === "critical",
    },
    merchants: {
      total: station.merchant_count,
      open: station.merchant_open_count,
      deliverable: station.merchant_deliverable_count,
    },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FETCH: Get station from zone
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function fetchExecutionState(zoneKey: string): Promise<ExecutionBrainState> {
  try {
    const overlay = await getZoneOverlay(zoneKey);
    if (!overlay) return deriveExecutionState(null, null);
    const station = overlayToStation(overlay);
    return deriveExecutionState(station, overlay);
  } catch {
    return deriveExecutionState(null, null);
  }
}
