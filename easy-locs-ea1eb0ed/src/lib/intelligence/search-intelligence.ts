import { detectIntent } from "@/lib/intent/intent-engine";
import { resolveRoute } from "@/lib/intent/domain-router";
import type { IntentContext, CanonicalEntityType, EntityVertical } from "@/lib/intent/intent-types";
import type { SearchRankResult, RankedEntity, UserContext, ConfidenceBucket } from "./types";

const STOP_WORDS = new Set(["the", "a", "an", "in", "on", "at", "to", "for", "of", "and", "or", "is", "it", "my", "me", "i", "near", "find", "show", "get"]);

function normalizeQuery(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .join(" ");
}

const QUERY_INTENT_PATTERNS: [RegExp, string][] = [
  [/\b(buy|purchase|invest)\b.*\b(apartment|villa|house|property|penthouse|land|office)\b/, "buy_property"],
  [/\b(rent|lease|let)\b.*\b(apartment|villa|house|flat|studio|room)\b/, "rent_property"],
  [/\b(offplan|project|developer|new\s*build)\b/, "project_property"],
  [/\b(hotel|resort|stay|airbnb|holiday\s*rental|serviced\s*apartment)\b/, "stay_booking"],
  [/\b(order|deliver|food|eat|restaurant|pizza|burger|sushi|kebab)\b/, "food_order"],
  [/\b(grocery|supermarket|fruits|vegetables|milk|bread|eggs)\b/, "grocery_order"],
  [/\b(plumber|electrician|cleaning|repair|handyman|salon|barber|spa)\b/, "service_request"],
  [/\b(taxi|ride|driver|cab|uber|careem)\b/, "ride_request"],
  [/\b(send\s*money|transfer|pay\s*someone|topup|top\s*up)\b/, "wallet_transfer"],
  [/\b(help|support|complaint|issue|problem)\b/, "support_request"],
];

function detectQueryIntent(normalized: string): { intent: string; confidence: number } | null {
  for (const [pattern, intent] of QUERY_INTENT_PATTERNS) {
    if (pattern.test(normalized)) {
      return { intent, confidence: 0.85 };
    }
  }
  return null;
}

interface SearchCandidate {
  entityId: string;
  entityType: string;
  vertical: string;
  name: string;
  category?: string;
  subcategory?: string;
  city?: string;
  rating?: number;
  distance?: number;
}

function computeTextRelevance(candidate: SearchCandidate, tokens: string[]): number {
  const hay = `${candidate.name} ${candidate.category ?? ""} ${candidate.subcategory ?? ""} ${candidate.city ?? ""}`.toLowerCase();
  let matchCount = 0;
  for (const token of tokens) {
    if (hay.includes(token)) matchCount++;
  }
  if (tokens.length === 0) return 0;
  return matchCount / tokens.length;
}

function confidenceFromScore(score: number): ConfidenceBucket {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  if (score >= 25) return "low";
  return "none";
}

export function executeSearchIntelligence(
  query: string,
  candidates: SearchCandidate[],
  ctx: UserContext
): SearchRankResult {
  const normalized = normalizeQuery(query);
  const tokens = normalized.split(/\s+/);

  const queryIntent = detectQueryIntent(normalized);

  const INTENT_VERTICAL_MAP: Record<string, { vertical: EntityVertical; entityType: CanonicalEntityType }> = {
    buy_property: { vertical: "property" as EntityVertical, entityType: "property" as CanonicalEntityType },
    rent_property: { vertical: "property" as EntityVertical, entityType: "property" as CanonicalEntityType },
    project_property: { vertical: "property" as EntityVertical, entityType: "property" as CanonicalEntityType },
    stay_booking: { vertical: "stay" as EntityVertical, entityType: "stay" as CanonicalEntityType },
    food_order: { vertical: "food" as EntityVertical, entityType: "merchant" as CanonicalEntityType },
    grocery_order: { vertical: "grocery" as EntityVertical, entityType: "merchant" as CanonicalEntityType },
    service_request: { vertical: "services" as EntityVertical, entityType: "service" as CanonicalEntityType },
    ride_request: { vertical: "mobility" as EntityVertical, entityType: "driver" as CanonicalEntityType },
    wallet_transfer: { vertical: "shops" as EntityVertical, entityType: "merchant" as CanonicalEntityType },
    support_request: { vertical: "services" as EntityVertical, entityType: "merchant" as CanonicalEntityType },
  };

  let directRoute: string | undefined;
  if (queryIntent && queryIntent.confidence >= 0.8) {
    const mapping = INTENT_VERTICAL_MAP[queryIntent.intent];
    const intentCtx: IntentContext = {
      entityId: "",
      entityType: mapping?.entityType ?? ("merchant" as CanonicalEntityType),
      vertical: mapping?.vertical ?? ("" as EntityVertical),
      searchQuery: normalized,
      intentHint: queryIntent.intent,
      surface: "search",
    };
    const resolved = detectIntent(intentCtx);
    const route = resolveRoute(resolved);
    if (route.action === "navigate" && route.path && route.path !== "/") {
      directRoute = route.path;
    }
  }

  const ranked: RankedEntity[] = candidates
    .map((candidate) => {
      let score = 0;

      const textRelevance = computeTextRelevance(candidate, tokens);
      score += textRelevance * 40;

      if (queryIntent) {
        const intentVertical: Record<string, string> = {
          buy_property: "property", rent_property: "property", project_property: "property",
          stay_booking: "stay", food_order: "food", grocery_order: "grocery",
          service_request: "services", ride_request: "mobility",
        };
        if (intentVertical[queryIntent.intent] === candidate.vertical) {
          score += 25;
        }
      }

      if (candidate.rating) score += Math.min(candidate.rating * 2, 10);
      if (candidate.distance !== undefined && candidate.distance < 5) {
        score += (5 - candidate.distance) * 3;
      }

      if (ctx.recentVerticals?.includes(candidate.vertical)) score += 5;

      return {
        entityId: candidate.entityId,
        entityType: candidate.entityType,
        vertical: candidate.vertical,
        rankScore: Math.round(Math.min(score, 100)),
        rankReason: textRelevance > 0.5 ? "text_match" : queryIntent ? "intent_match" : "available",
        confidenceBucket: confidenceFromScore(score),
        placementPriority: 0,
        signals: [],
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 20)
    .map((e, i) => ({ ...e, placementPriority: i + 1 }));

  return {
    query,
    normalizedQuery: normalized,
    intent: queryIntent?.intent ?? "unknown",
    confidenceBucket: queryIntent ? confidenceFromScore(queryIntent.confidence * 100) : "low",
    results: ranked,
    directRoute: queryIntent && queryIntent.confidence >= 0.8 ? directRoute : undefined,
    totalCandidates: candidates.length,
  };
}
