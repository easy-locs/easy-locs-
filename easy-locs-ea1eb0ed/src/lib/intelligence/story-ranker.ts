import type { StoryRankResult, UserContext, RankSignal } from "./types";

interface StoryCandidate {
  id: string;
  entityId: string;
  entityType: string;
  vertical: string;
  feedKey?: string;
  categoryKey?: string;
  subcategoryKey?: string;
  mediaUrl?: string;
  engagement?: { views: number; clicks: number; completions: number; saves: number; shares: number };
  createdAt?: number;
  quality?: number;
}

const SIGNAL_WEIGHTS: Record<string, number> = {
  intentMatch: 0.25,
  feedPurity: 0.15,
  mediaQuality: 0.12,
  entityCompleteness: 0.10,
  locationRelevance: 0.10,
  engagement: 0.08,
  completionRate: 0.06,
  ctr: 0.05,
  freshness: 0.05,
  domainPriority: 0.04,
};

function computeIntentMatch(story: StoryCandidate, ctx: UserContext): number {
  if (!ctx.activeIntent) return 0.3;
  const intentVerticalMap: Record<string, string[]> = {
    buy_property: ["property"],
    rent_property: ["property"],
    project_property: ["property"],
    stay_booking: ["stay"],
    food_order: ["food"],
    grocery_order: ["grocery"],
    service_request: ["services"],
    ride_request: ["mobility"],
    wallet_transfer: [],
    support_request: [],
  };
  const allowed = intentVerticalMap[ctx.activeIntent];
  if (!allowed) return 0.3;
  return allowed.includes(story.vertical) ? 1.0 : 0.1;
}

function computeFeedPurity(story: StoryCandidate): number {
  if (!story.feedKey) return 0.5;
  if (!story.vertical) return 0.2;
  return 1.0;
}

function computeMediaQuality(story: StoryCandidate): number {
  if (!story.mediaUrl) return 0.1;
  if (story.mediaUrl.includes("placeholder")) return 0.2;
  return story.quality ?? 0.7;
}

function computeEngagement(story: StoryCandidate): number {
  if (!story.engagement) return 0.3;
  const { views, clicks, completions } = story.engagement;
  if (views === 0) return 0.3;
  const ctr = clicks / Math.max(views, 1);
  const completionRate = completions / Math.max(views, 1);
  return Math.min(ctr * 5 + completionRate * 3, 1.0);
}

function computeFreshness(story: StoryCandidate): number {
  if (!story.createdAt) return 0.5;
  const ageHours = (Date.now() - story.createdAt) / (1000 * 60 * 60);
  if (ageHours < 1) return 1.0;
  if (ageHours < 6) return 0.9;
  if (ageHours < 24) return 0.7;
  if (ageHours < 72) return 0.5;
  if (ageHours < 168) return 0.3;
  return 0.1;
}

export function rankStories(
  stories: StoryCandidate[],
  ctx: UserContext
): StoryRankResult[] {
  return stories
    .map((story, index) => {
      const signals: RankSignal[] = [
        { name: "intentMatch", value: computeIntentMatch(story, ctx), weight: SIGNAL_WEIGHTS.intentMatch, source: "user_context" },
        { name: "feedPurity", value: computeFeedPurity(story), weight: SIGNAL_WEIGHTS.feedPurity, source: "taxonomy" },
        { name: "mediaQuality", value: computeMediaQuality(story), weight: SIGNAL_WEIGHTS.mediaQuality, source: "entity" },
        { name: "engagement", value: computeEngagement(story), weight: SIGNAL_WEIGHTS.engagement, source: "analytics" },
        { name: "freshness", value: computeFreshness(story), weight: SIGNAL_WEIGHTS.freshness, source: "temporal" },
      ];

      const score = signals.reduce((sum, s) => sum + s.value * s.weight, 0);
      const normalizedScore = Math.min(score / 0.75, 1.0);
      const suppress = normalizedScore < 0.15;

      return {
        storyId: story.id,
        score: Math.round(normalizedScore * 100),
        placement: 0,
        suppress,
        reason: suppress
          ? `Low quality: ${signals.find(s => s.value < 0.2)?.name ?? "overall"}`
          : signals.sort((a, b) => b.value * b.weight - a.value * a.weight)[0]?.name ?? "default",
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((result, i) => ({ ...result, placement: i + 1 }));
}
