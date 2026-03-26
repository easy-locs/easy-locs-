/**
 * Radar Brain Orchestrator — Central nervous system of the platform.
 * Connects Radar context to: Mobility, Wallet, Orbit, Notifications, Geo.
 * Every module reads from and reacts to the Radar state.
 */
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";
import {
  fetchGeoLiveContext,
  computeETA,
  computeVisibilityScore,
  fetchNearbyRiders,
  buildZoneKey,
  type GeoLiveContext,
  type RiderRuntimeState,
} from "@/lib/mobility/live-context-engine";
import {
  predictDemand,
  fetchActiveZoneEvents,
  scoreDispatchCandidate,
  rankDispatchCandidates,
  computeAutoCompensation,
  type ZoneEvent,
  type DemandPrediction,
  type DispatchCandidate,
} from "@/lib/radar/predictive-demand-engine";
import { haversineKm } from "@/lib/geo/distance";

// ── Types ──

export type RadarDecision =
  | { type: "block_zone"; zoneKey: string; reason: string }
  | { type: "expand_radius"; zoneKey: string; extraKm: number }
  | { type: "surge_pricing"; zoneKey: string; multiplier: number }
  | { type: "boost_merchants"; zoneKey: string; maxPrepMinutes: number }
  | { type: "reposition_riders"; zoneKey: string; targetCount: number }
  | { type: "lower_visibility"; merchantIds: string[]; reason: string }
  | { type: "auto_compensate"; jobId: string; amount: number; reason: string }
  | { type: "weather_alert"; zoneKey: string; weatherType: string; severity: string }
  | { type: "demand_alert"; zoneKey: string; level: number; trend: string };

export interface RadarBrainState {
  zoneKey: string;
  geoContext: GeoLiveContext | null;
  zoneEvents: ZoneEvent[];
  nearbyRiders: RiderRuntimeState[];
  demandPrediction: DemandPrediction | null;
  decisions: RadarDecision[];
  timestamp: string;
}

// ── Smart Logic Engine ──

/**
 * Process live geo context and produce automated platform decisions.
 * This is the core intelligence — every condition triggers real actions.
 */
export function processSmartLogic(
  geo: GeoLiveContext | null,
  events: ZoneEvent[],
  riders: RiderRuntimeState[],
  prediction: DemandPrediction | null,
  zoneKey: string,
): RadarDecision[] {
  const decisions: RadarDecision[] = [];
  if (!geo) return decisions;

  const traffic = geo.traffic_speed_factor ?? 1.0;
  const weather = geo.weather_speed_factor ?? 1.0;
  const weatherType = geo.weather_type ?? "clear";
  const demandLevel = prediction?.predicted_demand ?? 30;
  const riderCount = riders.filter(r => r.is_available).length;

  // ── Weather rules ──
  if (weatherType === "flood" || weatherType === "storm") {
    decisions.push({
      type: "block_zone",
      zoneKey,
      reason: `Unsafe weather: ${weatherType}`,
    });
    decisions.push({
      type: "weather_alert",
      zoneKey,
      weatherType,
      severity: "critical",
    });
  } else if (weatherType === "rain") {
    decisions.push({
      type: "weather_alert",
      zoneKey,
      weatherType,
      severity: "medium",
    });
    // Rain increases demand — boost fast merchants
    if (demandLevel > 50) {
      decisions.push({
        type: "boost_merchants",
        zoneKey,
        maxPrepMinutes: 15,
      });
    }
  }

  // ── Traffic rules ──
  if (traffic < 0.4) {
    // Severe traffic
    decisions.push({
      type: "expand_radius",
      zoneKey,
      extraKm: 5,
    });
  }

  // ── Demand vs supply ──
  if (demandLevel > 70 && riderCount < Math.ceil(demandLevel / 15)) {
    decisions.push({
      type: "surge_pricing",
      zoneKey,
      multiplier: 1.0 + Math.min(0.8, (demandLevel - 70) * 0.02),
    });
    decisions.push({
      type: "reposition_riders",
      zoneKey,
      targetCount: Math.ceil(demandLevel / 10),
    });
  }

  if (demandLevel > 60) {
    decisions.push({
      type: "demand_alert",
      zoneKey,
      level: demandLevel,
      trend: prediction?.trend ?? "stable",
    });
  }

  // ── Zone events ──
  const severeEvents = events.filter(
    e => e.severity === "critical" || e.severity === "high",
  );
  if (severeEvents.length > 0) {
    decisions.push({
      type: "block_zone",
      zoneKey,
      reason: `${severeEvents.length} severe event(s): ${severeEvents.map(e => e.event_type).join(", ")}`,
    });
  }

  return decisions;
}

// ── Emit decisions to event bus ──

export function emitRadarDecisions(decisions: RadarDecision[]) {
  for (const d of decisions) {
    eventBus.emit(`radar.decision.${d.type}`, d as any);
  }
  if (decisions.length > 0) {
    eventBus.emit("radar.decisions.batch", { decisions, count: decisions.length });
  }
}

// ── Full Brain Evaluation ──

export async function evaluateRadarBrain(params: {
  zoneKey: string;
  customerLat?: number;
  customerLng?: number;
  vertical?: string;
}): Promise<RadarBrainState> {
  const { zoneKey, customerLat, customerLng, vertical } = params;

  // Fetch all context in parallel
  const [geoContext, zoneEvents, riders] = await Promise.all([
    fetchGeoLiveContext(zoneKey),
    fetchActiveZoneEvents(zoneKey),
    customerLat != null && customerLng != null
      ? fetchNearbyRiders(customerLat, customerLng, 15)
      : Promise.resolve([]),
  ]);

  // Compute demand prediction
  const now = new Date();
  const prediction = predictDemand({
    currentHour: now.getHours(),
    vertical: vertical ?? "food",
    activeEvents: zoneEvents,
    riderCount: riders.length,
    weatherType: geoContext?.weather_type ?? "clear",
    dayOfWeek: now.getDay(),
  });
  prediction.zone_key = zoneKey;

  // Process smart logic
  const decisions = processSmartLogic(geoContext, zoneEvents, riders, prediction, zoneKey);

  // Emit decisions
  emitRadarDecisions(decisions);

  return {
    zoneKey,
    geoContext,
    zoneEvents,
    nearbyRiders: riders,
    demandPrediction: prediction,
    decisions,
    timestamp: new Date().toISOString(),
  };
}

// ── Wallet Integration: Dynamic Price Modifier ──

export function computeRadarPriceModifier(brain: RadarBrainState): number {
  const surgeDecision = brain.decisions.find(d => d.type === "surge_pricing");
  if (surgeDecision && surgeDecision.type === "surge_pricing") {
    return surgeDecision.multiplier;
  }
  return 1.0;
}

// ── Orbit Integration: Should create conversation? ──

export function shouldCreateOrbitThread(
  brain: RadarBrainState,
  jobType: "taxi" | "food" | "grocery" | "parcel",
): boolean {
  // Always create orbit thread for active jobs
  // Add extra urgency context for weather/event zones
  return true;
}

export function getOrbitContextMetadata(brain: RadarBrainState) {
  return {
    zone_key: brain.zoneKey,
    weather: brain.geoContext?.weather_type ?? "clear",
    traffic: brain.geoContext?.traffic_level ?? "low",
    demand: brain.demandPrediction?.current_demand ?? 0,
    active_events: brain.zoneEvents.length,
    decisions_count: brain.decisions.length,
    has_severe_events: brain.decisions.some(d => d.type === "block_zone"),
  };
}

// ── Notification Triggers ──

export function getRadarNotificationTriggers(brain: RadarBrainState): Array<{
  type: string;
  title: string;
  body: string;
  severity: string;
  targetRole: "client" | "rider" | "merchant" | "admin";
}> {
  const notifications: ReturnType<typeof getRadarNotificationTriggers> = [];

  for (const d of brain.decisions) {
    switch (d.type) {
      case "weather_alert":
        if (d.severity === "critical") {
          notifications.push({
            type: "weather_alert",
            title: "⚠️ Severe Weather Alert",
            body: `${d.weatherType} conditions in your area. Deliveries may be affected.`,
            severity: "high",
            targetRole: "client",
          });
          notifications.push({
            type: "weather_alert",
            title: "🚨 Weather Warning",
            body: `${d.weatherType} — stay safe. Some zones may be restricted.`,
            severity: "high",
            targetRole: "rider",
          });
        }
        break;
      case "surge_pricing":
        notifications.push({
          type: "surge_alert",
          title: "💰 High Demand Zone",
          body: `Earnings boosted ${Math.round((d.multiplier - 1) * 100)}% in this area`,
          severity: "info",
          targetRole: "rider",
        });
        break;
      case "demand_alert":
        notifications.push({
          type: "demand_alert",
          title: "📈 Demand Rising",
          body: `Prepare for incoming orders — demand is ${d.trend}`,
          severity: "medium",
          targetRole: "merchant",
        });
        break;
      case "block_zone":
        notifications.push({
          type: "zone_blocked",
          title: "🚫 Zone Restricted",
          body: d.reason,
          severity: "critical",
          targetRole: "admin",
        });
        break;
    }
  }

  return notifications;
}
