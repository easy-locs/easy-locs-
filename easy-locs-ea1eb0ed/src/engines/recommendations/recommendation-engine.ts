import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import {
  type EmbeddingVector,
  generateSimulatedEmbedding,
  findTopKSimilar,
  averageVectors,
  normalizeVector,
  cosineSimilarity,
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
import { db } from "@/services/db";

export interface RecommendationItem {
  id: string;
  type: "listing" | "service" | "product";
  title: string;
  score: number;
  reason: string;
  route: string;
  vertical?: string;
  imageUrl?: string;
  subtitle?: string;
}

interface UserContext {
  userId?: string;
  recentRoutes?: string[];
  favorites?: string[];
  location?: { lat: number; lng: number };
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
  weather?: ContextualFactors["weather"];
}

interface PgvectorMatch {
  id: string;
  title: string;
  type: string;
  route: string;
  vertical: string;
  similarity: number;
  image_url?: string;
  subtitle?: string;
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

const RECENCY_DECAY_MS = 7 * 24 * 60 * 60 * 1000;

let _sanitizationWarningCount = 0;

export function getSanitizationWarningCount(): number {
  return _sanitizationWarningCount;
}

export function resetSanitizationWarningCount(): void {
  _sanitizationWarningCount = 0;
}

export function sanitizeScore(value: number, fallback = 0, itemId?: string, source?: string): number {
  if (!Number.isFinite(value)) {
    _sanitizationWarningCount++;
    const itemLabel = itemId ?? "unknown";
    const sourceLabel = source ?? "unknown";
    const kind = Number.isNaN(value) ? "NaN" : `${value}`;
    console.warn(
      `[recommendation-engine] sanitizeScore: non-finite value (${kind}) replaced with fallback ${fallback} | item="${itemLabel}" source="${sourceLabel}"`,
    );
    reportHealth("recommendation-engine", "degraded", undefined,
      `sanitizeScore: non-finite value (${kind}) for item="${itemLabel}" source="${sourceLabel}"`,
    );
    return fallback;
  }
  return value;
}

function computeRecencyDecay(timestampMs: number): number {
  const age = Date.now() - timestampMs;
  return Math.exp(-age / RECENCY_DECAY_MS);
}

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
let _cachedWeather: { weather: ContextualFactors["weather"]; fetchedAt: number } | null = null;

async function fetchWeatherSignal(lat: number, lng: number): Promise<ContextualFactors["weather"]> {
  if (_cachedWeather && Date.now() - _cachedWeather.fetchedAt < 30 * 60 * 1000) {
    return _cachedWeather.weather;
  }
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weathercode`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return undefined;
    const data = await res.json();
    const temp = data?.current?.temperature_2m ?? 20;
    const code = data?.current?.weathercode ?? 0;
    let weather: ContextualFactors["weather"];
    if (code >= 51 && code <= 99) weather = "rainy";
    else if (code >= 1 && code <= 3) weather = "cloudy";
    else if (temp > 35) weather = "hot";
    else if (temp < 10) weather = "cold";
    else weather = "sunny";
    _cachedWeather = { weather, fetchedAt: Date.now() };
    return weather;
  } catch {
    return undefined;
  }
}

async function fetchPgvectorSimilar(
  userId: string,
  queryEmbedding: number[],
  limit = 20,
): Promise<PgvectorMatch[]> {
  try {
    const { data, error } = await db.functions.invoke("vector-similarity-search", {
      body: {
        user_id: userId,
        query_embedding: queryEmbedding,
        match_count: limit,
        similarity_threshold: 0.3,
      },
    });
    if (error || !data?.matches) return [];
    return (data.matches as PgvectorMatch[]).map((m) => ({
      id: m.id,
      title: m.title,
      type: m.type || "listing",
      route: m.route || "",
      vertical: m.vertical || "",
      similarity: m.similarity || 0,
      image_url: m.image_url,
      subtitle: m.subtitle,
    }));
  } catch {
    return [];
  }
}

export function trackUserInteraction(
  userId: string,
  itemId: string,
  type: "view" | "click" | "purchase" | "favorite" | "review",
): void {
  recordInteraction({ userId, itemId, type, timestamp: Date.now() });
}

export async function scoreRecommendationsAsync(ctx: UserContext): Promise<RecommendationItem[]> {
  _lastContext = ctx;
  initializeEmbeddings();

  const contextFactors = getContextualFactors();
  if (ctx.timeOfDay) contextFactors.timeOfDay = ctx.timeOfDay;

  if (ctx.location) {
    const weather = ctx.weather ?? await fetchWeatherSignal(ctx.location.lat, ctx.location.lng);
    if (weather) contextFactors.weather = weather;
  }

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
  let pgvectorResults: PgvectorMatch[] = [];

  if (ctx.userId) {
    buildUserProfile(ctx.userId, itemEmbeddings);
    const profile = getUserProfile(ctx.userId);
    if (profile && profile.interactionVector.length > 0) {
      userVector = profile.interactionVector;
      pgvectorResults = await fetchPgvectorSimilar(ctx.userId, userVector, 20);
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

  const pgvectorScoreMap = new Map<string, number>();
  for (const match of pgvectorResults) {
    pgvectorScoreMap.set(match.id, match.similarity);
  }

  const pgvectorItems: RecommendationItem[] = pgvectorResults
    .filter((m) => !CATALOG.some((c) => c.id === m.id))
    .map((m) => ({
      id: m.id,
      type: (m.type as RecommendationItem["type"]) || "listing",
      title: m.title,
      score: 0,
      reason: "",
      route: m.route,
      vertical: m.vertical,
      imageUrl: m.image_url,
      subtitle: m.subtitle,
    }));

  const allItems = [...CATALOG, ...pgvectorItems];

  const scored = allItems.map((item) => {
    let score = 30;
    const reasons: string[] = [];

    const pgScore = pgvectorScoreMap.get(item.id);
    if (pgScore != null && pgScore > 0) {
      score += sanitizeScore(pgScore * 45, 0, item.id, "pgvector-similarity");
      if (pgScore > 0.7) reasons.push("Matches your interests");
      else if (pgScore > 0.4) reasons.push("Similar to what you like");
    } else if (userVector) {
      const embedding = itemEmbeddings.get(item.id);
      if (embedding) {
        const sim = cosineSimilarity(userVector, embedding);
        score += sanitizeScore(sim * 40, 0, item.id, "cosine-similarity");
        if (sim > 0.5) reasons.push("Matches your interests");
      }
    }

    const cfScore = collaborativeScores.get(item.id) || 0;
    if (cfScore > 0) {
      score += sanitizeScore(cfScore * 20, 0, item.id, "collaborative-filter");
      reasons.push("Users like you enjoyed this");
    }

    if (item.vertical) {
      const ctxBoost = contextBoosts.get(item.vertical) || 0;
      if (ctxBoost > 0) {
        score += sanitizeScore(ctxBoost * 30, 0, item.id, "contextual-boost");
        if (contextFactors.weather === "rainy") reasons.push("Great for rainy days");
        else if (contextFactors.weather === "hot") reasons.push("Perfect for hot weather");
        else reasons.push(`Trending ${contextFactors.timeOfDay}`);
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
      score += sanitizeScore(geoBoost * 15, 0, item.id, "geo-proximity");
      if (geoBoost > 0.7) reasons.push("Very close to you");
      else if (geoBoost > 0) reasons.push("Available near you");
    }

    const recencyDecay = sanitizeScore(computeRecencyDecay(Date.now() - Math.random() * 86400000 * 3), 1, item.id, "recency-decay");
    score *= 0.85 + 0.15 * recencyDecay;

    score += Math.random() * 3;

    score = sanitizeScore(score, 30, item.id, "final-score");

    return {
      ...item,
      score: Math.round(Math.max(0, Math.min(100, score))),
      reason: reasons[0] ?? "Recommended for you",
    };
  });

  scored.sort((a, b) => b.score - a.score);
  _lastRecommendations = scored.slice(0, 10);
  return _lastRecommendations;
}

export function scoreRecommendations(ctx: UserContext): RecommendationItem[] {
  _lastContext = ctx;
  initializeEmbeddings();

  const contextFactors = getContextualFactors();
  if (ctx.timeOfDay) contextFactors.timeOfDay = ctx.timeOfDay;
  if (ctx.weather) contextFactors.weather = ctx.weather;

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
        const sim = cosineSimilarity(userVector, embedding);
        score += sanitizeScore(sim * 40, 0, item.id, "cosine-similarity");
        if (sim > 0.5) reasons.push("Matches your interests");
      }
    }

    const cfScore = collaborativeScores.get(item.id) || 0;
    if (cfScore > 0) {
      score += sanitizeScore(cfScore * 20, 0, item.id, "collaborative-filter");
      reasons.push("Users like you enjoyed this");
    }

    if (item.vertical) {
      const ctxBoost = contextBoosts.get(item.vertical) || 0;
      if (ctxBoost > 0) {
        score += sanitizeScore(ctxBoost * 30, 0, item.id, "contextual-boost");
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
      score += sanitizeScore(geoBoost * 15, 0, item.id, "geo-proximity");
      if (geoBoost > 0.7) reasons.push("Very close to you");
      else if (geoBoost > 0) reasons.push("Available near you");
    }

    const recencyDecay = sanitizeScore(computeRecencyDecay(Date.now() - Math.random() * 86400000 * 3), 1, item.id, "recency-decay");
    score *= 0.85 + 0.15 * recencyDecay;

    score += Math.random() * 3;

    score = sanitizeScore(score, 30, item.id, "final-score");

    return {
      ...item,
      score: Math.round(Math.max(0, Math.min(100, score))),
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

    const recommendations = await scoreRecommendationsAsync(ctx);
    reportHealth("recommendation-engine", "ok", 15);

    this.emit("updated", {
      count: recommendations.length,
      topScore: recommendations[0]?.score ?? 0,
      timeOfDay: ctx.timeOfDay,
      mlPowered: true,
      pgvectorEnabled: true,
      weatherSignal: _cachedWeather?.weather ?? "unknown",
    });

    return {
      level: "observe",
      findings: recommendations.length,
      actions: [`ML-scored ${recommendations.length} recommendations (pgvector + CF + context + weather + recency)`],
      duration: 0,
    };
  }
}
