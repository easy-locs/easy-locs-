import type { MediaValidationResult, EntityQualityReport, StoryValidationResult, FeedValidationResult } from "./types";

type LogEntry = {
  category: "media_validation" | "media_mismatch" | "low_quality_entity" | "blocked_story" | "feed_rejection" | "fallback_usage";
  entityId: string;
  mediaId?: string;
  reason: string;
  severity: "critical" | "warning" | "info";
  timestamp: number;
  details?: Record<string, unknown>;
};

const VALIDATION_LOG: LogEntry[] = [];
const MAX_LOG = 1000;

const CATEGORY_COUNTERS: Record<string, number> = {
  media_validation: 0,
  media_mismatch: 0,
  low_quality_entity: 0,
  blocked_story: 0,
  feed_rejection: 0,
  fallback_usage: 0,
};

function pushLog(entry: LogEntry) {
  VALIDATION_LOG.push(entry);
  if (VALIDATION_LOG.length > MAX_LOG) VALIDATION_LOG.shift();
  CATEGORY_COUNTERS[entry.category] = (CATEGORY_COUNTERS[entry.category] ?? 0) + 1;

  if (import.meta.env.DEV && entry.severity === "critical") {
    console.warn(`[validation:${entry.category}] ${entry.reason}`, entry.entityId);
  }
}

export function logMediaValidation(entityId: string, result: MediaValidationResult) {
  if (!result.valid) {
    pushLog({
      category: "media_validation",
      entityId,
      mediaId: result.imageUrl,
      reason: result.blockReason ?? "Image validation failed",
      severity: "critical",
      timestamp: Date.now(),
      details: { issues: result.issues, qualityScore: result.qualityScore },
    });
  }

  if (result.mismatch) {
    pushLog({
      category: "media_mismatch",
      entityId,
      mediaId: result.imageUrl,
      reason: `Expected ${result.expectedFamily}, detected ${result.detectedFamily}`,
      severity: "critical",
      timestamp: Date.now(),
      details: { expected: result.expectedFamily, detected: result.detectedFamily },
    });
  }
}

export function logLowQualityEntity(report: EntityQualityReport) {
  if (report.tier === "hidden" || report.tier === "limited") {
    pushLog({
      category: "low_quality_entity",
      entityId: report.entityId,
      reason: `Entity quality ${report.score}/100 — tier: ${report.tier}`,
      severity: report.tier === "hidden" ? "critical" : "warning",
      timestamp: Date.now(),
      details: { score: report.score, tier: report.tier, issues: report.issues, dimensions: report.dimensions },
    });
  }
}

export function logBlockedStory(storyId: string, entityId: string, result: StoryValidationResult) {
  if (result.blockPublish) {
    pushLog({
      category: "blocked_story",
      entityId,
      reason: `Story ${storyId} blocked — ${result.issues.filter((i) => i.severity === "critical").map((i) => i.detail).join("; ")}`,
      severity: "critical",
      timestamp: Date.now(),
      details: { storyId, issues: result.issues },
    });
  }
}

export function logFeedRejection(result: FeedValidationResult) {
  if (!result.accepted) {
    pushLog({
      category: "feed_rejection",
      entityId: result.entityId,
      reason: result.rejectReason ?? "Unknown rejection",
      severity: "warning",
      timestamp: Date.now(),
      details: { feedKey: result.feedKey, checks: result.checks },
    });
  }
}

export function logFallbackUsage(entityId: string, vertical: string, fallbackUrl: string) {
  pushLog({
    category: "fallback_usage",
    entityId,
    reason: `Fallback image used for ${vertical} entity`,
    severity: "info",
    timestamp: Date.now(),
    details: { vertical, fallbackUrl },
  });
}

export function getValidationLogs(category?: string, limit = 100): LogEntry[] {
  const filtered = category ? VALIDATION_LOG.filter((e) => e.category === category) : VALIDATION_LOG;
  return filtered.slice(-limit);
}

export function getValidationCounters(): Record<string, number> {
  return { ...CATEGORY_COUNTERS };
}

export function getValidationReport(): {
  totalLogs: number;
  counters: Record<string, number>;
  recentCritical: LogEntry[];
  recentWarnings: LogEntry[];
} {
  return {
    totalLogs: VALIDATION_LOG.length,
    counters: { ...CATEGORY_COUNTERS },
    recentCritical: VALIDATION_LOG.filter((e) => e.severity === "critical").slice(-20),
    recentWarnings: VALIDATION_LOG.filter((e) => e.severity === "warning").slice(-20),
  };
}

export function clearValidationLogs() {
  VALIDATION_LOG.length = 0;
  for (const key of Object.keys(CATEGORY_COUNTERS)) {
    CATEGORY_COUNTERS[key] = 0;
  }
}
