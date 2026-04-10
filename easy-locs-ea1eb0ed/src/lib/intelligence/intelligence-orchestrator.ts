import { rankStories } from "./story-ranker";
import { assembleFeed, getAvailableFeeds } from "./feed-assembler";
import { rankDashboardModules, getVisibleModules } from "./dashboard-intelligence";
import { resolveRadarMode, getRadarFiltersForQuery } from "./radar-intelligence";
import { executeSearchIntelligence } from "./search-intelligence";
import { getAntiErrorReport, getFailureCounts, logValidationFailure } from "./anti-error-logger";
import type {
  UserContext,
  StoryRankResult,
  FeedAssemblyResult,
  DashboardModule,
  RadarModeResult,
  SearchRankResult,
} from "./types";

export class IntelligenceOrchestrator {
  private ctx: UserContext;

  constructor(ctx: UserContext) {
    this.ctx = ctx;
  }

  updateContext(partial: Partial<UserContext>) {
    this.ctx = { ...this.ctx, ...partial };
  }

  getContext(): UserContext {
    return { ...this.ctx };
  }

  rankStories(stories: Parameters<typeof rankStories>[0]): StoryRankResult[] {
    return rankStories(stories, this.ctx);
  }

  assembleFeed(feedKey: string, candidates: Parameters<typeof assembleFeed>[1], limit?: number): FeedAssemblyResult {
    return assembleFeed(feedKey, candidates, this.ctx, limit);
  }

  rankDashboardModules(extra?: { isAuthenticated?: boolean; isBusiness?: boolean }): DashboardModule[] {
    return rankDashboardModules({ ...this.ctx, ...extra });
  }

  getVisibleDashboardModules(extra?: { isAuthenticated?: boolean; isBusiness?: boolean }): DashboardModule[] {
    return getVisibleModules({ ...this.ctx, ...extra });
  }

  resolveRadarMode(): RadarModeResult {
    return resolveRadarMode(this.ctx);
  }

  getRadarFiltersForQuery(query: string): RadarModeResult {
    return getRadarFiltersForQuery(query);
  }

  executeSearch(query: string, candidates: Parameters<typeof executeSearchIntelligence>[1]): SearchRankResult {
    return executeSearchIntelligence(query, candidates, this.ctx);
  }

  getHealthReport() {
    return {
      ...getAntiErrorReport(),
      availableFeeds: getAvailableFeeds(),
      context: this.ctx,
    };
  }

  getFailureCounts() {
    return getFailureCounts();
  }
}

let _instance: IntelligenceOrchestrator | null = null;

export function getIntelligenceOrchestrator(): IntelligenceOrchestrator {
  if (!_instance) {
    _instance = new IntelligenceOrchestrator({
      currency: "AED",
      language: "en",
      timeOfDay: resolveTimeOfDay(),
    });
  }
  return _instance;
}

export function initIntelligence(ctx: UserContext): IntelligenceOrchestrator {
  _instance = new IntelligenceOrchestrator(ctx);

  if (import.meta.env.DEV) {
    console.log("[intelligence] Orchestrator initialized", {
      city: ctx.city,
      currency: ctx.currency,
      timeOfDay: ctx.timeOfDay,
      activeIntent: ctx.activeIntent,
    });
  }

  return _instance;
}

function resolveTimeOfDay(): UserContext["timeOfDay"] {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

export { rankStories } from "./story-ranker";
export { assembleFeed, getAvailableFeeds } from "./feed-assembler";
export { rankDashboardModules, getVisibleModules } from "./dashboard-intelligence";
export { resolveRadarMode, getRadarFiltersForQuery } from "./radar-intelligence";
export { executeSearchIntelligence } from "./search-intelligence";
export {
  logValidationFailure,
  logFeedRejection,
  logMediaRejection,
  logBrokenCTA,
  logBrokenRoute,
  logLowQualityEntity,
  logStoryPublicationBlock,
  logRankingAnomaly,
  getRecentFailures,
  getAntiErrorReport,
} from "./anti-error-logger";
export type {
  UserContext,
  RankedEntity,
  StoryRankResult,
  FeedAssemblyResult,
  DashboardModule,
  RadarMode,
  RadarModeResult,
  SearchRankResult,
  ValidationFailure,
  ConfidenceBucket,
} from "./types";
