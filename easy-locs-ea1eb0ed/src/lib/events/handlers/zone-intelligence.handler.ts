/**
 * P1 Listener — Zone Intelligence Propagation
 * 
 * Owner: Execution Brain
 * 
 * Triggered by: eta:projections_updated (downstream of overlay fetch)
 * 
 * Canonical events emitted:
 * - zone:supply_updated
 * - zone:demand_updated
 * - zone:traffic_updated
 * - zone:weather_updated
 * - zone:weather_safety_updated
 * - zone:pressure_updated
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { deriveExecutionState } from "@/lib/brain/execution-brain";
import type { GeoLiveStation } from "@/lib/radar/eta-projection-engine";

platformBus.on("eta:projections_updated", async (event) => {
  const payload = event.payload as Record<string, any>;
  const { zoneKey, station } = payload as { zoneKey: string; station: GeoLiveStation | null };
  if (!zoneKey || !station) return;

  const exec = deriveExecutionState(station, null);
  const ts = new Date().toISOString();

  platformBus.emit("zone:supply_updated", {
    zoneKey,
    riderCount: exec.supply.riderCount,
    isLow: exec.supply.isLow,
    factor: exec.supply.factor,
    updatedAt: ts,
  }, "system");

  platformBus.emit("zone:demand_updated", {
    zoneKey,
    level: exec.demand.level,
    multiplier: exec.demand.multiplier,
    isHigh: exec.demand.isHigh,
    surgeActive: exec.demand.surgeActive,
    surgeMultiplier: exec.demand.surgeMultiplier,
    updatedAt: ts,
  }, "system");

  platformBus.emit("zone:traffic_updated", {
    zoneKey,
    level: exec.traffic.level,
    speedFactor: exec.traffic.speedFactor,
    isSevere: exec.traffic.isSevere,
    updatedAt: ts,
  }, "system");

  platformBus.emit("zone:weather_updated", {
    zoneKey,
    weatherType: exec.weather.type,
    weatherIntensity: exec.weather.intensity,
    isStorm: exec.weather.isStorm,
    updatedAt: ts,
  }, "system");

  platformBus.emit("zone:weather_safety_updated", {
    zoneKey,
    weatherType: exec.weather.type,
    floodRisk: exec.safety.floodRisk,
    severe: exec.weather.isStorm || exec.weather.intensity > 0.7,
    blocked: exec.safety.isBlocked,
    updatedAt: ts,
  }, "system");

  const weatherPenalty = exec.weather.isStorm ? 15 : exec.weather.intensity * 10;
  const floodPenalty = exec.safety.isBlocked ? 20 : exec.safety.floodRisk === "moderate" ? 8 : 0;

  const pressureScore = (
    (exec.demand.isHigh ? 25 : exec.demand.level * 0.25) +
    (exec.supply.isLow ? 25 : Math.max(0, 25 - exec.supply.riderCount * 2)) +
    (exec.traffic.isSevere ? 30 : (1 - exec.traffic.speedFactor) * 30) +
    weatherPenalty +
    floodPenalty
  );

  platformBus.emit("zone:pressure_updated", {
    zoneKey,
    pressureScore: Math.min(100, Math.round(pressureScore)),
    supply: exec.supply,
    demand: exec.demand,
    traffic: exec.traffic,
    weather: exec.weather,
    safety: exec.safety,
    merchants: exec.merchants,
    updatedAt: ts,
  }, "system");

  if (import.meta.env.DEV) {
    console.log(`[zone-intelligence] ${zoneKey} pressure=${Math.round(pressureScore)}`, {
      supply: `${exec.supply.riderCount} riders (low=${exec.supply.isLow})`,
      demand: `level=${exec.demand.level} surge=${exec.demand.surgeMultiplier}x`,
      traffic: `${exec.traffic.level} speed=${exec.traffic.speedFactor}`,
      weather: `${exec.weather.type ?? "clear"} intensity=${exec.weather.intensity} storm=${exec.weather.isStorm}`,
      safety: `flood=${exec.safety.floodRisk} blocked=${exec.safety.isBlocked}`,
    });
  }
});
