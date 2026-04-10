export {
  IntelligenceOrchestrator,
  getIntelligenceOrchestrator,
  initIntelligence,
  rankStories,
  assembleFeed,
  getAvailableFeeds,
  rankDashboardModules,
  getVisibleModules,
  resolveRadarMode,
  getRadarFiltersForQuery,
  executeSearchIntelligence,
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
} from "./intelligence-orchestrator";

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

export { bootIntelligenceLayer } from "./intelligence-boot";
