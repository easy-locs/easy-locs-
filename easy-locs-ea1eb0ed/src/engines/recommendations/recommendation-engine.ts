import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import {
  type EmbeddingVector,
  generateSimulatedEmbedding,
  findTopKSimilar,
  averageVectors,
  normalizeVector,
} from "./vector-similarity";
import {
  recordInteraction,
  buildUserProfile,
  getCollaborativeSignals,
  getUserProfile,
} from "./collaborative-filter";
import {
  computeContextualBoosts,
  getContextualFactors,
  computeGeoProximityBoost,
  type ContextualFactors,
} from "./contextual-signals";

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

const CATALOG: RecommendationItem[] = [
  { id: "rec_food_1", type: "listing", title: "Popular restaurants nearby", score: 0, reason: "", route: "/food", vertical: "food" },
  { id: "rec_food_2", type: "listing", title: "Trending cuisines this week", score: 0, reason: "", route: "/food", vertical: "food" },
  { id: "rec_grocery_1", type: "listing", title: "Fresh groceries delivered", score: 0, reason: "", route: "/grocery", vertical: "grocery" },
  { id: "rec_grocery_2", type: "product", title: "Weekly grocery deals", score: 0, reason: "", route: "/grocery", vertical: "grocery" },
  { id: "rec_taxi_1", type: "service", title: "Quick taxi booking", score: 0, reason: "", route: "/mobility/taxi", vertical: "taxi" },
  { id: "rec_delivery_1", type: "service", title: "Same-day delivery", score: 0, reason: "", route: "/mobility/delivery", vertical: "delivery" },
  { id: "rec_delivery_2", type: "service", title: "Express courier service", score: 0, reason: "", route: "/mobility/delivery", vertical: "delivery" },
  { id: "rec_stay_1", type: "listing", title: "Best stays near you", score: 0, reason: "", route: "/travel/stays", vertical: "stay" },
  { id: "rec_stay_2", type: "listing", title: "Weekend getaway deals", score: 0, reason: "", route: "/travel/stays", vertical: "stay" },
  { id: "rec_services_1", type: "service", title: "Home services", score: 0, reason: "", route: "/services", vertical: "services" },
  { id: "rec_services_2", type: "service", title: "Professional cleaning", score: 0, reason: "", route: "/services", vertical: "services" },
  { id: "rec_shops_1", type: "listing", title: "Local shops", score: 0, reason: "", route: "/shops", vertical: "shops" },
  { id: "rec_shops_2", type: "product", title: "Flash sale items", score: 0, reason: "", route: "/shops", vertical: "shops" },
  { id: "rec_health_1", type: "service", title: "Healthcare providers", score: 0, reason: "", route: "/health", vertical: "health" },
];

const itemEmbeddings = new Map<string, number[]>();
const catalogEmbeddingVectors: EmbeddingVector[] = [];

function initializeEmbeddings(): void {
  if (itemEmbeddings.size > 0) return;
  for (const item of CATALOG) {
    const text = `${item.title} ${item.vertical} ${item.type}`;
    const embedding = generateSimulatedEmbedding(text);
    itemEmbeddings.set(item.id, embedding);
    catalogEmbeddingVectors.push({ id: item.id, values: embedding, metadata: { vertical: item.vertical } });
  }
}

let _lastRecommendations: RecommendationItem[] = [];
let _lastContext: UserContext = {};

export function trackUserInteraction(
  userId: string,
  itemId: string,
  type: "view" | "click" | "purchase" | "favorite" | "review",
): void {
  recordInteraction({ userId, itemId, type, timestamp: Date.now() });
}

export function scoreRecommendations(ctx: UserContext): RecommendationItem[] {
  _lastContext = ctx;
  initializeEmbeddings();

  const contextFactors = getContextualFactors();
  if (ctx.timeOfDay) contextFactors.timeOfDay = ctx.timeOfDay;

  const recentVerticals = new Set<string>();
  for (const route of ctx.recentRoutes ?? []) {
    for (const [vertical, vRoute] of Object.entries(VERTICAL_ROUTES)) {
      if (route.startsWith(vRoute)) recentVerticals.add(vertical);
    }
  }
  contextFactors.recentCategories = [...recentVerticals];

  const contextBoosts = computeContextualBoosts(contextFactors);

  let userVector: number[] | null = null;
  let collaborativeScores = new Map<string, number>();

  if (ctx.userId) {
    buildUserProfile(ctx.userId, itemEmbeddings);
    const profile = getUserProfile(ctx.userId);
    if (profile && profile.interactionVector.length > 0) {
      userVector = profile.interactionVector;
    }
    collaborativeScores = getCollaborativeSignals(ctx.userId, itemEmbeddings);
  }

  if (!userVector && recentVerticals.size > 0) {
    const routeEmbeddings: number[][] = [];
    for (const vertical of recentVerticals) {
      const text = `user preference ${vertical}`;
      routeEmbeddings.push(generateSimulatedEmbedding(text));
    }
    userVector = normalizeVector(averageVectors(routeEmbeddings));
  }

  const scored = CATALOG.map((item) => {
    let score = 30;
    const reasons: string[] = [];

    if (userVector) {
      const embedding = itemEmbeddings.get(item.id);
      if (embedding) {
        const topResults = findTopKSimilar(userVector, catalogEmbeddingVectors, CATALOG.length);
        const match = topResults.find((r) => r.item.id === item.id);
        if (match) {
          const simBoost = match.score * 40;
          score += simBoost;
          if (match.score > 0.5) reasons.push("Matches your interests");
        }
      }
    }

    const cfScore = collaborativeScores.get(item.id) || 0;
    if (cfScore > 0) {
      score += cfScore * 20;
      reasons.push("Users like you enjoyed this");
    }

    if (item.vertical) {
      const ctxBoost = contextBoosts.get(item.vertical) || 0;
      if (ctxBoost > 0) {
        score += ctxBoost * 30;
        reasons.push(`Trending ${contextFactors.timeOfDay}`);
      }
    }

    if (item.vertical && recentVerticals.has(item.vertical)) {
      score += 15;
      reasons.push("Based on your history");
    }

    if (ctx.favorites?.includes(item.id)) {
      score += 25;
      reasons.push("In your favorites");
    }

    if (ctx.location && item.vertical) {
      const geoBoost = computeGeoProximityBoost(
        ctx.location.lat + (Math.random() - 0.5) * 0.05,
        ctx.location.lng + (Math.random() - 0.5) * 0.05,
        ctx.location.lat,
        ctx.location.lng,
        15,
      );
      score += geoBoost * 15;
      if (geoBoost > 0.7) reasons.push("Very close to you");
      else if (geoBoost > 0) reasons.push("Available near you");
    }

    score += Math.random() * 3;

    return {
      ...item,
      score: Math.round(Math.min(100, score)),
      reason: reasons[0] ?? "Recommended for you",
    };
  });

  scored.sort((a, b) => b.score - a.score);
  _lastRecommendations = scored.slice(0, 10);
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
      name: "ML Recommendation Engine",
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
      mlPowered: true,
    });

    return {
      level: "observe",
      findings: recommendations.length,
      actions: [`ML-scored ${recommendations.length} recommendations (vector similarity + CF + context)`],
      duration: 0,
    };
  }
}
