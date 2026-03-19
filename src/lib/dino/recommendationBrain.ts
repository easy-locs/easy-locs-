/**
 * DINO V20 — Universal Recommendation Brain
 * Cross-service intent understanding and journey suggestions.
 */
import { supabase } from "@/integrations/supabase/client";

export type ServiceVertical =
  | "food"
  | "shops"
  | "property"
  | "taxi"
  | "send"
  | "travel"
  | "grocery"
  | "services";

export interface Recommendation {
  vertical: ServiceVertical;
  title: string;
  reason: string;
  priority: number;
  actionRoute: string;
  metadata?: Record<string, unknown>;
}

interface UserIntent {
  primaryVertical: ServiceVertical;
  secondaryVerticals: ServiceVertical[];
  recentActivity: string[];
  intentStrength: Record<ServiceVertical, number>;
}

/** Service connection map — which services naturally link together */
const SERVICE_GRAPH: Record<ServiceVertical, ServiceVertical[]> = {
  food: ["grocery", "shops"],
  shops: ["food", "services"],
  property: ["services", "send"],
  taxi: ["food", "travel"],
  send: ["shops", "food"],
  travel: ["taxi", "food", "property"],
  grocery: ["food", "shops"],
  services: ["property", "shops"],
};

/** Record a user signal for the recommendation engine */
export async function recordSignal(params: {
  userId: string;
  signalType: "order" | "search" | "view" | "bookmark" | "review";
  vertical: ServiceVertical;
  entityId?: string;
  entityType?: string;
}) {
  await supabase.from("recommendation_signals").insert({
    user_id: params.userId,
    signal_type: params.signalType,
    service_vertical: params.vertical,
    entity_id: params.entityId ?? null,
    entity_type: params.entityType ?? null,
    weight: params.signalType === "order" ? 3 : params.signalType === "bookmark" ? 2 : 1,
  });
}

/** Analyze user intent from recent signals */
export async function analyzeIntent(userId: string): Promise<UserIntent> {
  const { data: signals } = await supabase
    .from("recommendation_signals")
    .select("signal_type, service_vertical, weight")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  const intentStrength: Record<ServiceVertical, number> = {
    food: 0, shops: 0, property: 0, taxi: 0,
    send: 0, travel: 0, grocery: 0, services: 0,
  };

  for (const s of signals ?? []) {
    const v = s.service_vertical as ServiceVertical;
    if (v in intentStrength) {
      intentStrength[v] += Number(s.weight ?? 1);
    }
  }

  const sorted = Object.entries(intentStrength)
    .sort(([, a], [, b]) => b - a)
    .map(([v]) => v as ServiceVertical);

  return {
    primaryVertical: sorted[0] ?? "food",
    secondaryVerticals: sorted.slice(1, 3),
    recentActivity: (signals ?? []).slice(0, 5).map(s => s.signal_type),
    intentStrength,
  };
}

/** Generate personalized cross-service recommendations */
export async function generateRecommendations(userId: string): Promise<Recommendation[]> {
  const intent = await analyzeIntent(userId);
  const recs: Recommendation[] = [];

  // 1. Primary vertical — reinforce what the user likes most
  recs.push({
    vertical: intent.primaryVertical,
    title: getVerticalTitle(intent.primaryVertical),
    reason: "Based on your recent activity",
    priority: 100,
    actionRoute: getVerticalRoute(intent.primaryVertical),
  });

  // 2. Connected services — cross-sell from service graph
  const connected = SERVICE_GRAPH[intent.primaryVertical] ?? [];
  for (const cv of connected) {
    recs.push({
      vertical: cv,
      title: getVerticalTitle(cv),
      reason: `People who use ${intent.primaryVertical} also love ${cv}`,
      priority: 70 + (intent.intentStrength[cv] ?? 0),
      actionRoute: getVerticalRoute(cv),
    });
  }

  // 3. Journey suggestions based on combined intent
  if (intent.intentStrength.travel > 5 && intent.intentStrength.taxi > 0) {
    recs.push({
      vertical: "taxi",
      title: "Airport Transfer",
      reason: "Complete your travel journey with a ride",
      priority: 85,
      actionRoute: "/app/taxi",
    });
  }

  if (intent.intentStrength.property > 5 && intent.intentStrength.services > 0) {
    recs.push({
      vertical: "services",
      title: "Home Services",
      reason: "Maintenance & services for your property",
      priority: 80,
      actionRoute: "/app/services",
    });
  }

  // 4. Role-based opportunities
  const { data: driverProfile } = await supabase
    .from("driver_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (driverProfile) {
    recs.push({
      vertical: "send",
      title: "Earn as a Driver",
      reason: "High demand in your area — start delivering",
      priority: 75,
      actionRoute: "/app/driver",
    });
  }

  return recs
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8);
}

function getVerticalTitle(v: ServiceVertical): string {
  const titles: Record<ServiceVertical, string> = {
    food: "Order Food", shops: "Shop Now", property: "Find a Home",
    taxi: "Book a Ride", send: "Send a Package", travel: "Plan Travel",
    grocery: "Get Groceries", services: "Book Services",
  };
  return titles[v] ?? v;
}

function getVerticalRoute(v: ServiceVertical): string {
  return `/app/${v}`;
}
