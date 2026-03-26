/**
 * Radar Opportunity Scorer — Phase 1
 *
 * Brain owner: Experience Brain
 *
 * Reads recent radar_signals + zone context from existing brains,
 * computes opportunity scores, and upserts to radar_opportunities.
 *
 * Reuses:
 * - geo_live_zone_overlays (zone intelligence)
 * - predictive-demand-engine (demand patterns)
 * - execution-brain (supply/demand/traffic state)
 *
 * Does NOT duplicate scoring from existing brains.
 */
import { supabase } from "@/integrations/supabase/client";

// ── Opportunity types for Phase 1 ──
export type OpportunityType =
  | "hot_demand_zone"
  | "merchant_nearby"
  | "urgent_service"
  | "payment_ready"
  | "communication_ready"
  | "new_listing";

export type RouteModule = "marketplace" | "orbit" | "wallet";

export interface ScoredOpportunity {
  opportunity_type: OpportunityType;
  title: string;
  description: string;
  score: number;
  proximity_score: number;
  demand_score: number;
  urgency_score: number;
  timing_score: number;
  route_module: RouteModule;
  route_path: string;
  zone_key?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  entity_id?: string;
  entity_type?: string;
  icon_key: string;
  metadata_json: Record<string, unknown>;
  expires_at?: string;
}

// ── Time-based scoring ──
function getTimingScore(): number {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;

  // Peak hours: lunch (11-14), dinner (18-22)
  if (hour >= 11 && hour <= 14) return 0.8;
  if (hour >= 18 && hour <= 22) return 0.9;
  if (isWeekend && hour >= 10 && hour <= 23) return 0.7;
  if (hour >= 23 || hour <= 5) return 0.3;
  return 0.5;
}

// ── Compute opportunities from recent signals ──
export async function computeOpportunities(
  userLat?: number,
  userLng?: number,
  userCity?: string,
): Promise<ScoredOpportunity[]> {
  const opportunities: ScoredOpportunity[] = [];
  const timingScore = getTimingScore();
  const now = new Date();

  // 1. Check zone overlays for demand spikes
  const { data: overlays } = await supabase
    .from("geo_live_zone_overlays")
    .select("zone_key, demand_level, demand_multiplier, surge_multiplier, rider_supply, traffic_level, weather_type")
    .gte("demand_level", 50)
    .order("demand_level", { ascending: false })
    .limit(5);

  if (overlays) {
    for (const z of overlays) {
      const demandScore = Math.min(1, (z.demand_level ?? 0) / 100);
      const proximityScore = 0.5; // no lat/lng on overlay table, use default
      const surgeBonus = (z.surge_multiplier ?? 1) > 1.2 ? 0.2 : 0;
      const score = demandScore * 0.35 + proximityScore * 0.25 + timingScore * 0.2 + surgeBonus + 0.2;

      // Extract city from zone_key (format: "country:city:district")
      const parts = (z.zone_key ?? "").split(":");
      const zoneCity = parts[1] || z.zone_key;

      opportunities.push({
        opportunity_type: "hot_demand_zone",
        title: `High demand in ${zoneCity}`,
        description: `Demand level ${z.demand_level}% — ${z.rider_supply ?? 0} riders available`,
        score: Math.min(1, score),
        proximity_score: proximityScore,
        demand_score: demandScore,
        urgency_score: surgeBonus > 0 ? 0.8 : 0.4,
        timing_score: timingScore,
        route_module: "marketplace",
        route_path: "/radar",
        zone_key: z.zone_key ?? undefined,
        city: zoneCity,
        icon_key: "flame",
        metadata_json: {
          demand_level: z.demand_level,
          surge: z.surge_multiplier,
          riders: z.rider_supply,
          traffic: z.traffic_level,
          weather: z.weather_type,
        } as Record<string, unknown>,
        expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      });
    }
  }

  // 2. Check recent high-activity merchants (from recent signals)
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const { data: recentSignals } = await supabase
    .from("radar_signals")
    .select("entity_id, signal_type, intensity, zone_key, metadata_json")
    .gte("created_at", fiveMinAgo)
    .in("signal_type", ["entity_view", "order_created"])
    .order("created_at", { ascending: false })
    .limit(50);

  if (recentSignals && recentSignals.length > 0) {
    // Aggregate by entity
    const entityCounts = new Map<string, { views: number; orders: number; zone?: string }>();
    for (const s of recentSignals) {
      if (!s.entity_id) continue;
      const entry = entityCounts.get(s.entity_id) || { views: 0, orders: 0 };
      if (s.signal_type === "entity_view") entry.views++;
      if (s.signal_type === "order_created") entry.orders++;
      if (s.zone_key) entry.zone = s.zone_key;
      entityCounts.set(s.entity_id, entry);
    }

    // Top merchants by activity
    const sorted = [...entityCounts.entries()]
      .map(([id, d]) => ({ id, score: d.views * 0.3 + d.orders * 0.7, ...d }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    for (const m of sorted) {
      if (m.score < 0.5) continue;
      opportunities.push({
        opportunity_type: "merchant_nearby",
        title: "Trending merchant",
        description: `${m.views} views, ${m.orders} orders in last 5 min`,
        score: Math.min(1, m.score / 5),
        proximity_score: 0.5,
        demand_score: Math.min(1, m.orders / 3),
        urgency_score: 0.3,
        timing_score: timingScore,
        route_module: "marketplace",
        route_path: `/s/${m.id}`,
        entity_id: m.id,
        entity_type: "storefront",
        zone_key: m.zone,
        icon_key: "store",
        metadata_json: { views: m.views, orders: m.orders },
        expires_at: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      });
    }
  }

  // 3. Check recent communication signals → communication_ready
  const { count: msgCount } = await supabase
    .from("radar_signals")
    .select("id", { count: "exact", head: true })
    .eq("signal_type", "message_sent")
    .gte("created_at", fiveMinAgo);

  if (msgCount && msgCount > 3) {
    opportunities.push({
      opportunity_type: "communication_ready",
      title: "Active conversations",
      description: `${msgCount} messages exchanged recently`,
      score: 0.6,
      proximity_score: 0,
      demand_score: 0,
      urgency_score: 0.5,
      timing_score: timingScore,
      route_module: "orbit",
      route_path: "/messages",
      icon_key: "message-circle",
      metadata_json: { messageCount: msgCount },
      expires_at: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
    });
  }

  // 4. Check payment signals → payment_ready
  const { count: payCount } = await supabase
    .from("radar_signals")
    .select("id", { count: "exact", head: true })
    .eq("signal_type", "payment_activity")
    .gte("created_at", fiveMinAgo);

  if (payCount && payCount > 0) {
    opportunities.push({
      opportunity_type: "payment_ready",
      title: "Payment activity detected",
      description: `${payCount} payment events — check your wallet`,
      score: 0.65,
      proximity_score: 0,
      demand_score: 0,
      urgency_score: 0.6,
      timing_score: timingScore,
      route_module: "wallet",
      route_path: "/wallet",
      icon_key: "wallet",
      metadata_json: { paymentCount: payCount },
      expires_at: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
    });
  }

  return opportunities.sort((a, b) => b.score - a.score);
}

// ── Persist opportunities ──
export async function persistOpportunities(opps: ScoredOpportunity[]): Promise<void> {
  if (opps.length === 0) return;

  // Expire old active opportunities
  await supabase
    .from("radar_opportunities")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString());

  // Insert new
  const { error } = await supabase.from("radar_opportunities").insert(
    opps.map((o) => ({
      opportunity_type: o.opportunity_type,
      title: o.title,
      description: o.description,
      score: o.score,
      proximity_score: o.proximity_score,
      demand_score: o.demand_score,
      urgency_score: o.urgency_score,
      timing_score: o.timing_score,
      route_module: o.route_module,
      route_path: o.route_path,
      zone_key: o.zone_key ?? null,
      city: o.city ?? null,
      country: o.country ?? null,
      lat: o.lat ?? null,
      lng: o.lng ?? null,
      entity_id: o.entity_id ?? null,
      entity_type: o.entity_type ?? null,
      icon_key: o.icon_key,
      metadata_json: o.metadata_json as unknown as import("@/integrations/supabase/types").Json,
      status: "active",
      expires_at: o.expires_at ?? null,
    })),
  );

  if (error && import.meta.env.DEV) {
    console.warn("[radar-scorer] persist error", error.message);
  }
}

// ── Haversine helper ──
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
