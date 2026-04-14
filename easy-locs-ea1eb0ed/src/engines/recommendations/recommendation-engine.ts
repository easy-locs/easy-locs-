import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { reportHealth } from "@/lib/runtime/health-aggregator";

export interface RecommendationItem {
  id: string;
  type: "listing" | "service" | "product";
  title: string;
  score: number;
  reason: string;
  route: string;
  vertical?: string;
}

interface UserContext {
  userId?: string;
  recentRoutes?: string[];
  favorites?: string[];
  location?: { lat: number; lng: number };
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
}

const VERTICAL_ROUTES: Record<string, string> = {
  food: "/food",
  grocery: "/grocery",
  taxi: "/mobility/taxi",
  delivery: "/mobility/delivery",
  stay: "/travel/stays",
  services: "/services",
  shops: "/shops",
  health: "/health",
};

const TIME_VERTICALS: Record<string, string[]> = {
  morning: ["food", "grocery", "taxi"],
  afternoon: ["shops", "services", "grocery"],
  evening: ["food", "stay", "delivery"],
  night: ["food", "delivery"],
};

const CATALOG: RecommendationItem[] = [
  { id: "rec_food_1", type: "listing", title: "Popular restaurants nearby", score: 0, reason: "", route: "/food", vertical: "food" },
  { id: "rec_grocery_1", type: "listing", title: "Fresh groceries delivered", score: 0, reason: "", route: "/grocery", vertical: "grocery" },
  { id: "rec_taxi_1", type: "service", title: "Quick taxi booking", score: 0, reason: "", route: "/mobility/taxi", vertical: "taxi" },
  { id: "rec_delivery_1", type: "service", title: "Same-day delivery", score: 0, reason: "", route: "/mobility/delivery", vertical: "delivery" },
  { id: "rec_stay_1", type: "listing", title: "Best stays near you", score: 0, reason: "", route: "/travel/stays", vertical: "stay" },
  { id: "rec_services_1", type: "service", title: "Home services", score: 0, reason: "", route: "/services", vertical: "services" },
  { id: "rec_shops_1", type: "listing", title: "Local shops", score: 0, reason: "", route: "/shops", vertical: "shops" },
  { id: "rec_health_1", type: "service", title: "Healthcare providers", score: 0, reason: "", route: "/health", vertical: "health" },
];

let _lastRecommendations: RecommendationItem[] = [];
let _lastContext: UserContext = {};

export function scoreRecommendations(ctx: UserContext): RecommendationItem[] {
  _lastContext = ctx;
  const timeOfDay = ctx.timeOfDay ?? getTimeOfDay();
  const preferred = TIME_VERTICALS[timeOfDay] ?? [];
  const recentVerticals = new Set<string>();

  for (const route of ctx.recentRoutes ?? []) {
    for (const [vertical, vRoute] of Object.entries(VERTICAL_ROUTES)) {
      if (route.startsWith(vRoute)) recentVerticals.add(vertical);
    }
  }

  const scored = CATALOG.map(item => {
    let score = 50;
    const reasons: string[] = [];

    if (item.vertical && preferred.includes(item.vertical)) {
      score += 30;
      reasons.push(`Popular in ${timeOfDay}`);
    }

    if (item.vertical && recentVerticals.has(item.vertical)) {
      score += 25;
      reasons.push("Based on your history");
    }

    if (ctx.favorites?.includes(item.id)) {
      score += 40;
      reasons.push("In your favorites");
    }

    if (ctx.location) {
      score += 10;
      if (!reasons.length) reasons.push("Available near you");
    }

    score += Math.random() * 5;

    return {
      ...item,
      score: Math.round(score),
      reason: reasons[0] ?? "Recommended for you",
    };
  });

  scored.sort((a, b) => b.score - a.score);
  _lastRecommendations = scored.slice(0, 8);
  return _lastRecommendations;
}

export function getRecommendations(): RecommendationItem[] {
  return _lastRecommendations;
}

function getTimeOfDay(): UserContext["timeOfDay"] {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export class RecommendationEngine extends BaseEngine {
  constructor() {
    super({
      id: "recommendation-engine",
      name: "Recommendation Engine",
      category: "recommendations",
      domain: "discovery",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const ctx: UserContext = {
      timeOfDay: getTimeOfDay(),
      ..._lastContext,
    };

    const recommendations = scoreRecommendations(ctx);
    reportHealth("recommendation-engine", "ok", 15);

    this.emit("updated", {
      count: recommendations.length,
      topScore: recommendations[0]?.score ?? 0,
      timeOfDay: ctx.timeOfDay,
    });

    return {
      level: "observe",
      findings: recommendations.length,
      actions: [`Scored ${recommendations.length} recommendations`],
      duration: 0,
    };
  }
}
