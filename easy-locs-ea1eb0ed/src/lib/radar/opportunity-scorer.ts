/**
 * Radar Opportunity Scorer — Phase 1 Hardened
 *
 * Brain owner: Experience Brain
 *
 * Reads recent radar_signals + zone context + radar_rules,
 * computes opportunity scores, and UPSERTS to radar_opportunities
 * using dedupe_key to prevent duplication.
 *
 * Reuses:
 * - geo_live_zone_overlays (zone intelligence)
 * - radar_rules (configurable scoring)
 * - execution-brain (supply/demand/traffic state)
 *
 * Does NOT duplicate scoring from existing brains.
 */
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";

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
  target_action: string;
  target_payload_json: Record<string, unknown>;
  target_audience: string;
  dedupe_key: string;
  zone_key?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  entity_id?: string;
  entity_type?: string;
  icon_key: string;
  metadata_json: Record<string, unknown>;
  expires_at: string;
  source_signal_count: number;
}

// ── Cached rules ──
interface RadarRule {
  signal_type: string;
  opportunity_type: string;
  route_module: string;
  target_action: string | null;
  icon_key: string;
  title_template: string | null;
  description_template: string | null;
  ttl_minutes: number;
  weights_json: Record<string, number>;
  threshold_json: Record<string, number>;
  max_active: number;
  enabled: boolean;
}

let cachedRules: RadarRule[] | null = null;
let rulesCacheTime = 0;
const RULES_CACHE_MS = 300_000; // 5 min

async function getRules(): Promise<RadarRule[]> {
  if (cachedRules && Date.now() - rulesCacheTime < RULES_CACHE_MS) return cachedRules;
  const { data } = await supabase
    .from("radar_rules")
    .select("*")
    .eq("enabled", true)
    .order("priority", { ascending: false });

  cachedRules = (data ?? []).map((r) => ({
    signal_type: r.signal_type,
    opportunity_type: r.opportunity_type,
    route_module: r.route_module,
    target_action: r.target_action,
    icon_key: r.icon_key ?? "zap",
    title_template: r.title_template,
    description_template: r.description_template,
    ttl_minutes: r.ttl_minutes ?? 30,
    weights_json: (r.weights_json as Record<string, number>) ?? { demand: 0.35, proximity: 0.25, timing: 0.2, urgency: 0.2 },
    threshold_json: (r.threshold_json as Record<string, number>) ?? {},
    max_active: r.max_active ?? 3,
    enabled: r.enabled ?? true,
  }));
  rulesCacheTime = Date.now();
  return cachedRules;
}

// ── Build dedupe key ──
function buildDedupeKey(type: string, audience: string, zoneOrEntity: string, module: string, action: string): string {
  return `${type}:${audience}:${zoneOrEntity}:${module}:${action}`;
}

// ── Time-based scoring ──
function getTimingScore(): number {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;
  if (hour >= 11 && hour <= 14) return 0.8;
  if (hour >= 18 && hour <= 22) return 0.9;
  if (isWeekend && hour >= 10 && hour <= 23) return 0.7;
  if (hour >= 23 || hour <= 5) return 0.3;
  return 0.5;
}

// ── Template interpolation ──
function interpolate(tpl: string | null, vars: Record<string, unknown>): string {
  if (!tpl) return "";
  return tpl.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? key));
}

// ── Compute opportunities from signals + rules ──
export async function computeOpportunities(
  userLat?: number,
  userLng?: number,
): Promise<ScoredOpportunity[]> {
  const rules = await getRules();
  const opportunities: ScoredOpportunity[] = [];
  const timingScore = getTimingScore();
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  // Helper to find rule by opp type
  const ruleFor = (oppType: string) => rules.find((r) => r.opportunity_type === oppType);

  // 1. Zone demand → hot_demand_zone
  const zoneRule = ruleFor("hot_demand_zone");
  if (zoneRule) {
    const minDemand = zoneRule.threshold_json.min_demand_level ?? 50;
    const { data: overlays } = await supabase
      .from("geo_live_zone_overlays")
      .select("zone_key, demand_level, demand_multiplier, surge_multiplier, rider_supply, traffic_level, weather_type")
      .gte("demand_level", minDemand)
      .order("demand_level", { ascending: false })
      .limit(zoneRule.max_active);

    if (overlays) {
      for (const z of overlays) {
        const w = zoneRule.weights_json;
        const demandScore = Math.min(1, (z.demand_level ?? 0) / 100);
        const proximityScore = 0.5;
        const surgeBonus = (z.surge_multiplier ?? 1) > 1.2 ? 0.2 : 0;
        const urgencyScore = surgeBonus > 0 ? 0.8 : 0.4;
        const score = Math.min(1,
          demandScore * (w.demand ?? 0.35) +
          proximityScore * (w.proximity ?? 0.25) +
          timingScore * (w.timing ?? 0.2) +
          urgencyScore * (w.urgency ?? 0.2)
        );

        const parts = (z.zone_key ?? "").split(":");
        const zoneCity = parts[1] || z.zone_key;
        const vars = { city: zoneCity, demand_level: z.demand_level, riders: z.rider_supply ?? 0 };

        opportunities.push({
          opportunity_type: "hot_demand_zone",
          title: interpolate(zoneRule.title_template, vars) || `High demand in ${zoneCity}`,
          description: interpolate(zoneRule.description_template, vars) || `Demand ${z.demand_level}%`,
          score, proximity_score: proximityScore, demand_score: demandScore,
          urgency_score: urgencyScore, timing_score: timingScore,
          route_module: zoneRule.route_module as RouteModule,
          route_path: "/radar",
          target_action: zoneRule.target_action ?? "open_zone",
          target_payload_json: { zoneKey: z.zone_key },
          target_audience: "user",
          dedupe_key: buildDedupeKey("hot_demand_zone", "user", z.zone_key ?? "global", zoneRule.route_module, "open_zone"),
          zone_key: z.zone_key ?? undefined,
          city: zoneCity,
          icon_key: zoneRule.icon_key,
          metadata_json: { demand_level: z.demand_level, surge: z.surge_multiplier, riders: z.rider_supply, traffic: z.traffic_level, weather: z.weather_type } as Record<string, unknown>,
          expires_at: new Date(now.getTime() + zoneRule.ttl_minutes * 60 * 1000).toISOString(),
          source_signal_count: 1,
        });
      }
    }
  }

  // 2. Entity signals → merchant_nearby
  const merchantRule = ruleFor("merchant_nearby");
  if (merchantRule) {
    const { data: recentSignals } = await supabase
      .from("radar_signals")
      .select("entity_id, signal_type, intensity, zone_key")
      .gte("created_at", fiveMinAgo)
      .in("signal_type", ["entity_view", "order_created"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (recentSignals?.length) {
      const entityCounts = new Map<string, { views: number; orders: number; zone?: string }>();
      for (const s of recentSignals) {
        if (!s.entity_id) continue;
        const e = entityCounts.get(s.entity_id) || { views: 0, orders: 0 };
        if (s.signal_type === "entity_view") e.views++;
        if (s.signal_type === "order_created") e.orders++;
        if (s.zone_key) e.zone = s.zone_key;
        entityCounts.set(s.entity_id, e);
      }

      const sorted = [...entityCounts.entries()]
        .map(([id, d]) => ({ id, actScore: d.views * 0.3 + d.orders * 0.7, ...d }))
        .sort((a, b) => b.actScore - a.actScore)
        .slice(0, merchantRule.max_active);

      const w = merchantRule.weights_json;
      for (const m of sorted) {
        if (m.views < (merchantRule.threshold_json.min_views ?? 3)) continue;
        const demandScore = Math.min(1, m.orders / 3);
        const score = Math.min(1, demandScore * (w.demand ?? 0.3) + 0.5 * (w.proximity ?? 0.3) + timingScore * (w.timing ?? 0.2) + 0.3 * (w.urgency ?? 0.2));
        const vars = { views: m.views, orders: m.orders };

        opportunities.push({
          opportunity_type: "merchant_nearby",
          title: interpolate(merchantRule.title_template, vars) || "Trending merchant",
          description: interpolate(merchantRule.description_template, vars) || `${m.views} views`,
          score, proximity_score: 0.5, demand_score: demandScore,
          urgency_score: 0.3, timing_score: timingScore,
          route_module: merchantRule.route_module as RouteModule,
          route_path: `/s/${m.id}`,
          target_action: merchantRule.target_action ?? "open_listing",
          target_payload_json: { listingId: m.id },
          target_audience: "user",
          dedupe_key: buildDedupeKey("merchant_nearby", "user", m.id, merchantRule.route_module, "open_listing"),
          entity_id: m.id, entity_type: "storefront",
          zone_key: m.zone,
          icon_key: merchantRule.icon_key,
          metadata_json: { views: m.views, orders: m.orders },
          expires_at: new Date(now.getTime() + merchantRule.ttl_minutes * 60 * 1000).toISOString(),
          source_signal_count: m.views + m.orders,
        });
      }
    }
  }

  // 3. Communication → communication_ready
  const commRule = ruleFor("communication_ready");
  if (commRule) {
    const { count } = await supabase
      .from("radar_signals")
      .select("id", { count: "exact", head: true })
      .eq("signal_type", "message_sent")
      .gte("created_at", fiveMinAgo);

    if (count && count >= (commRule.threshold_json.min_messages ?? 3)) {
      const vars = { count };
      opportunities.push({
        opportunity_type: "communication_ready",
        title: interpolate(commRule.title_template, vars) || "Active conversations",
        description: interpolate(commRule.description_template, vars) || `${count} messages`,
        score: 0.6, proximity_score: 0, demand_score: 0,
        urgency_score: 0.5, timing_score: timingScore,
        route_module: commRule.route_module as RouteModule,
        route_path: "/messages",
        target_action: commRule.target_action ?? "open_thread",
        target_payload_json: {},
        target_audience: "user",
        dedupe_key: buildDedupeKey("communication_ready", "user", "global", commRule.route_module, "open_thread"),
        icon_key: commRule.icon_key,
        metadata_json: { messageCount: count },
        expires_at: new Date(now.getTime() + commRule.ttl_minutes * 60 * 1000).toISOString(),
        source_signal_count: count,
      });
    }
  }

  // 4. Payment → payment_ready
  const payRule = ruleFor("payment_ready");
  if (payRule) {
    const { count } = await supabase
      .from("radar_signals")
      .select("id", { count: "exact", head: true })
      .eq("signal_type", "payment_activity")
      .gte("created_at", fiveMinAgo);

    if (count && count >= (payRule.threshold_json.min_payments ?? 1)) {
      const vars = { count };
      opportunities.push({
        opportunity_type: "payment_ready",
        title: interpolate(payRule.title_template, vars) || "Payment activity",
        description: interpolate(payRule.description_template, vars) || `${count} events`,
        score: 0.65, proximity_score: 0, demand_score: 0,
        urgency_score: 0.6, timing_score: timingScore,
        route_module: payRule.route_module as RouteModule,
        route_path: "/wallet",
        target_action: payRule.target_action ?? "open_payment",
        target_payload_json: {},
        target_audience: "user",
        dedupe_key: buildDedupeKey("payment_ready", "user", "global", payRule.route_module, "open_payment"),
        icon_key: payRule.icon_key,
        metadata_json: { paymentCount: count },
        expires_at: new Date(now.getTime() + payRule.ttl_minutes * 60 * 1000).toISOString(),
        source_signal_count: count,
      });
    }
  }

  return opportunities.sort((a, b) => b.score - a.score).slice(0, 8);
}

// ── Persist with UPSERT by dedupe_key ──
export async function persistOpportunities(opps: ScoredOpportunity[]): Promise<void> {
  const now = new Date().toISOString();

  // 1. Expire stale active opportunities
  await supabase
    .from("radar_opportunities")
    .update({ status: "expired", expired_at: now, updated_at: now })
    .eq("status", "active")
    .lt("expires_at", now);

  if (opps.length === 0) return;

  // 2. For each opportunity, upsert by dedupe_key
  for (const o of opps) {
    // Check existing active with same dedupe_key
    const { data: existing } = await supabase
      .from("radar_opportunities")
      .select("id")
      .eq("dedupe_key", o.dedupe_key)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Refresh existing — update score/metadata/expiry
      await supabase
        .from("radar_opportunities")
        .update({
          score: o.score,
          proximity_score: o.proximity_score,
          demand_score: o.demand_score,
          urgency_score: o.urgency_score,
          timing_score: o.timing_score,
          title: o.title,
          description: o.description,
          metadata_json: o.metadata_json as unknown as import("@/integrations/supabase/types").Json,
          target_payload_json: o.target_payload_json as unknown as import("@/integrations/supabase/types").Json,
          source_signal_count: o.source_signal_count,
          expires_at: o.expires_at,
          updated_at: now,
        })
        .eq("id", existing.id);
    } else {
      // Insert new
      await supabase.from("radar_opportunities").insert({
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
        target_action: o.target_action,
        target_payload_json: o.target_payload_json as unknown as import("@/integrations/supabase/types").Json,
        target_audience: o.target_audience,
        dedupe_key: o.dedupe_key,
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
        expires_at: o.expires_at,
        source_signal_count: o.source_signal_count,
      });
    }
  }

  // Emit lifecycle event
  void eventBus.emit("radar.opportunities.refreshed", { count: opps.length, at: now });
}

// ── Lifecycle actions (called from UI) ──
export async function dismissOpportunity(id: string): Promise<void> {
  await supabase
    .from("radar_opportunities")
    .update({ status: "dismissed", dismissed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  void eventBus.emit("radar.opportunity.dismissed", { opportunityId: id });
}

export async function trackOpportunityClick(id: string): Promise<void> {
  // Increment clicked_count via raw update
  const { data } = await supabase
    .from("radar_opportunities")
    .select("clicked_count")
    .eq("id", id)
    .maybeSingle();

  if (data) {
    await supabase
      .from("radar_opportunities")
      .update({ clicked_count: (data.clicked_count ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", id);
  }
  void eventBus.emit("radar.opportunity.clicked", { opportunityId: id });
}

export async function convertOpportunity(id: string): Promise<void> {
  const { data } = await supabase
    .from("radar_opportunities")
    .select("conversion_count")
    .eq("id", id)
    .maybeSingle();

  await supabase
    .from("radar_opportunities")
    .update({
      status: "converted",
      converted_at: new Date().toISOString(),
      conversion_count: ((data?.conversion_count ?? 0) + 1),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  void eventBus.emit("radar.opportunity.converted", { opportunityId: id });
}

// ── Haversine helper (kept for future proximity calc) ──
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
