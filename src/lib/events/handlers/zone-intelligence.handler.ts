/**
 * P1 Listener — Zone Intelligence Propagation
 * 
 * Owner: Execution Brain
 * 
 * Single canonical handler that extracts demand/supply/traffic signals
 * from the zone overlay and propagates them to all consuming surfaces.
 * 
 * Triggered by: eta.context.refresh (which already fetches the overlay)
 * Listens to: eta.projections.updated (downstream of overlay fetch)
 * 
 * Canonical events emitted:
 * - zone.supply.updated     → rider supply state
 * - zone.demand.updated     → demand/surge state
 * - zone.traffic.updated    → traffic/speed state
 * - zone.pressure.updated   → combined pressure summary
 */
import { eventBus } from "@/lib/core/event-bus";
import { deriveExecutionState } from "@/lib/brain/execution-brain";
import type { GeoLiveStation } from "@/lib/radar/eta-projection-engine";

eventBus.on("eta.projections.updated", async (payload) => {
  const { zoneKey, station } = payload as { zoneKey: string; station: GeoLiveStation | null };
  if (!zoneKey || !station) return;

  const exec = deriveExecutionState(station, null);
  const ts = new Date().toISOString();

  // 1. Supply signal
  void eventBus.emit("zone.supply.updated", {
    zoneKey,
    riderCount: exec.supply.riderCount,
    isLow: exec.supply.isLow,
    factor: exec.supply.factor,
    updatedAt: ts,
  });

  // 2. Demand signal
  void eventBus.emit("zone.demand.updated", {
    zoneKey,
    level: exec.demand.level,
    multiplier: exec.demand.multiplier,
    isHigh: exec.demand.isHigh,
    surgeActive: exec.demand.surgeActive,
    surgeMultiplier: exec.demand.surgeMultiplier,
    updatedAt: ts,
  });

  // 3. Traffic signal
  void eventBus.emit("zone.traffic.updated", {
    zoneKey,
    level: exec.traffic.level,
    speedFactor: exec.traffic.speedFactor,
    isSevere: exec.traffic.isSevere,
    updatedAt: ts,
  });

  // 4. Combined pressure summary
  const pressureScore = (
    (exec.demand.isHigh ? 30 : exec.demand.level * 0.3) +
    (exec.supply.isLow ? 30 : Math.max(0, 30 - exec.supply.riderCount * 2)) +
    (exec.traffic.isSevere ? 40 : (1 - exec.traffic.speedFactor) * 40)
  );

  void eventBus.emit("zone.pressure.updated", {
    zoneKey,
    pressureScore: Math.min(100, Math.round(pressureScore)),
    supply: exec.supply,
    demand: exec.demand,
    traffic: exec.traffic,
    safety: exec.safety,
    merchants: exec.merchants,
    updatedAt: ts,
  });

  if (import.meta.env.DEV) {
    console.log(`[zone-intelligence] ${zoneKey} pressure=${Math.round(pressureScore)}`, {
      supply: `${exec.supply.riderCount} riders (low=${exec.supply.isLow})`,
      demand: `level=${exec.demand.level} surge=${exec.demand.surgeMultiplier}x`,
      traffic: `${exec.traffic.level} speed=${exec.traffic.speedFactor}`,
    });
  }
});
