export interface RankSignal {
  name: string;
  value: number;
  weight: number;
  source: string;
}

export type ConfidenceBucket = "high" | "medium" | "low" | "none";

export interface RankedEntity {
  entityId: string;
  entityType: string;
  vertical: string;
  rankScore: number;
  rankReason: string;
  confidenceBucket: ConfidenceBucket;
  placementPriority: number;
  signals: RankSignal[];
}

export interface StoryRankResult {
  storyId: string;
  score: number;
  placement: number;
  suppress: boolean;
  reason: string;
}

export interface FeedAssemblyResult {
  feedKey: string;
  entities: RankedEntity[];
  totalCandidates: number;
  filtered: number;
  assembledAt: number;
}

export interface DashboardModule {
  id: string;
  component: string;
  priority: number;
  visible: boolean;
  reason: string;
}

export type RadarMode = "food" | "utility" | "property" | "stay" | "mobility" | "services" | "discovery";

export interface RadarModeResult {
  mode: RadarMode;
  filters: Record<string, string>;
  reason: string;
  confidence: number;
}

export interface ValidationFailure {
  entityId: string;
  entityType: string;
  domain: string;
  issueType: string;
  blockingLevel: "critical" | "warning" | "info";
  reason: string;
  createdAt: number;
}

export interface SearchRankResult {
  query: string;
  normalizedQuery: string;
  intent: string;
  confidenceBucket: ConfidenceBucket;
  results: RankedEntity[];
  directRoute?: string;
  totalCandidates: number;
}

export interface UserContext {
  userId?: string;
  location?: { lat: number; lng: number };
  city?: string;
  country?: string;
  currency?: string;
  language?: string;
  recentVerticals?: string[];
  recentSearches?: string[];
  activeIntent?: string;
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
  sessionStart?: number;
}
