import { db } from "@/services/db";
import { eventBus } from "@/lib/core/event-bus";
import type { MobilityTrafficLevel, MobilityWeatherType } from "./unified-mobility.types";

export interface SmartZoneData {
  zoneKey: string | null;
  demand: number;
  supply: number;
  traffic: MobilityTrafficLevel;
  weather: MobilityWeatherType;
  heatLevel: "cold" | "warm" | "hot" | "surge";
  suggestedRepositionZone: string | null;
  incentiveBonus: number;
  demandTrend: "rising" | "stable" | "falling";
  avgWaitMinutes: number;
}

export interface ZoneHeatMap {
  zones: ZoneHeatEntry[];
  computedAt: string;
}

export interface ZoneHeatEntry {
  zoneKey: string;
  lat: number;
  lng: number;
  demand: number;
  supply: number;
  heat: number;
  label: "cold" | "warm" | "hot" | "surge";
}

const ZONE_CACHE = new Map<string, { data: SmartZoneData; ts: number }>();
const CACHE_TTL_MS = 30_000;

function makeZoneKey(lat: number, lng: number): string {
  const gridLat = Math.round(lat * 100) / 100;
  const gridLng = Math.round(lng * 100) / 100;
  return `zone_${gridLat}_${gridLng}`;
}

function classifyHeat(demand: number, supply: number): "cold" | "warm" | "hot" | "surge" {
  const ratio = demand / Math.max(supply, 1);
  if (ratio > 3) return "surge";
  if (ratio > 2) return "hot";
  if (ratio > 1.2) return "warm";
  return "cold";
}

function computeIncentive(heat: string, demand: number, supply: number): number {
  if (heat === "surge") return Math.min(50, Math.round(10 + (demand - supply) * 0.5));
  if (heat === "hot") return Math.min(25, Math.round(5 + (demand - supply) * 0.3));
  return 0;
}

function getTrendFromHistory(current: number, previous: number): "rising" | "stable" | "falling" {
  const delta = current - previous;
  if (delta > 3) return "rising";
  if (delta < -3) return "falling";
  return "stable";
}

function getTimeMultiplier(): number {
  const hour = new Date().getHours();
  if (hour >= 7 && hour <= 9) return 1.6;
  if (hour >= 11 && hour <= 13) return 1.4;
  if (hour >= 17 && hour <= 20) return 1.8;
  if (hour >= 22 || hour <= 5) return 1.3;
  return 1.0;
}

export async function getSmartZoneData(lat: number, lng: number): Promise<SmartZoneData> {
  const zoneKey = makeZoneKey(lat, lng);
  const cached = ZONE_CACHE.get(zoneKey);

  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const { data: overlay } = await db
    .from("geo_live_zone_overlays")
    .select("*")
    .eq("zone_key", zoneKey)
    .maybeSingle();

  const timeMultiplier = getTimeMultiplier();

  let baseDemand = 15;
  let baseSupply = 10;
  let traffic: MobilityTrafficLevel = "moderate";
  let weather: MobilityWeatherType = "clear";
  let previousDemand = 15;

  if (overlay) {
    baseDemand = (overlay as any).demand_level ?? 15;
    baseSupply = (overlay as any).supply_level ?? 10;
    traffic = ((overlay as any).traffic_level ?? "moderate") as MobilityTrafficLevel;
    weather = ((overlay as any).weather_type ?? "clear") as MobilityWeatherType;
    previousDemand = (overlay as any).prev_demand_level ?? baseDemand;
  }

  const adjustedDemand = Math.round(baseDemand * timeMultiplier);
  const heat = classifyHeat(adjustedDemand, baseSupply);
  const incentive = computeIncentive(heat, adjustedDemand, baseSupply);
  const trend = getTrendFromHistory(adjustedDemand, previousDemand);

  let suggestedReposition: string | null = null;
  if (heat === "cold" && baseSupply > 5) {
    const { data: hotZones } = await db
      .from("geo_live_zone_overlays")
      .select("zone_key, demand_level, supply_level")
      .gt("demand_level", 30)
      .lt("supply_level", 5)
      .limit(1)
      .maybeSingle();

    if (hotZones) {
      suggestedReposition = (hotZones as any).zone_key;
    }
  }

  const avgWaitMinutes = Math.max(
    1,
    Math.round((baseSupply > 0 ? adjustedDemand / baseSupply : 10) * 2),
  );

  const result: SmartZoneData = {
    zoneKey,
    demand: adjustedDemand,
    supply: baseSupply,
    traffic,
    weather,
    heatLevel: heat,
    suggestedRepositionZone: suggestedReposition,
    incentiveBonus: incentive,
    demandTrend: trend,
    avgWaitMinutes,
  };

  ZONE_CACHE.set(zoneKey, { data: result, ts: Date.now() });

  return result;
}

export async function computeZoneHeatMap(): Promise<ZoneHeatMap> {
  const { data: zones } = await db
    .from("geo_live_zone_overlays")
    .select("zone_key, lat, lng, demand_level, supply_level")
    .limit(200);

  if (!zones?.length) {
    return { zones: [], computedAt: new Date().toISOString() };
  }

  const timeMultiplier = getTimeMultiplier();

  const entries: ZoneHeatEntry[] = (zones as any[]).map((z) => {
    const demand = Math.round((z.demand_level ?? 0) * timeMultiplier);
    const supply = z.supply_level ?? 0;
    const ratio = demand / Math.max(supply, 1);

    return {
      zoneKey: z.zone_key,
      lat: z.lat ?? 0,
      lng: z.lng ?? 0,
      demand,
      supply,
      heat: Math.min(1, ratio / 5),
      label: classifyHeat(demand, supply),
    };
  });

  return {
    zones: entries.sort((a, b) => b.heat - a.heat),
    computedAt: new Date().toISOString(),
  };
}

export async function suggestRiderRepositioning(riderId: string, currentLat: number, currentLng: number) {
  const heatMap = await computeZoneHeatMap();
  const hotZones = heatMap.zones.filter((z) => z.label === "surge" || z.label === "hot");

  if (hotZones.length === 0) return null;

  let bestZone = hotZones[0];
  let bestScore = -Infinity;

  for (const zone of hotZones) {
    const R = 6371;
    const dLat = ((zone.lat - currentLat) * Math.PI) / 180;
    const dLng = ((zone.lng - currentLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((currentLat * Math.PI) / 180) *
        Math.cos((zone.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const proximity = Math.max(0, 1 - distKm / 15);
    const heatScore = zone.heat;
    const score = heatScore * 0.6 + proximity * 0.4;

    if (score > bestScore) {
      bestScore = score;
      bestZone = zone;
    }
  }

  void eventBus.emit("zone.reposition_suggested", {
    riderId,
    targetZone: bestZone.zoneKey,
    targetLat: bestZone.lat,
    targetLng: bestZone.lng,
    heat: bestZone.label,
  });

  return {
    targetZone: bestZone.zoneKey,
    targetLat: bestZone.lat,
    targetLng: bestZone.lng,
    heat: bestZone.label,
    estimatedDemand: bestZone.demand,
  };
}
