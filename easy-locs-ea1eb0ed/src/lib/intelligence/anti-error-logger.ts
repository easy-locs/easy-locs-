import type { ValidationFailure } from "./types";

type LogFamily =
  | "validation_failure"
  | "feed_rejection"
  | "media_rejection"
  | "broken_cta"
  | "broken_route"
  | "low_quality_entity"
  | "story_publication_block"
  | "ranking_anomaly";

interface LogEntry extends ValidationFailure {
  family: LogFamily;
}

const LOG_BUFFER: LogEntry[] = [];
const MAX_BUFFER = 500;

const FAMILY_COUNTERS: Record<LogFamily, number> = {
  validation_failure: 0,
  feed_rejection: 0,
  media_rejection: 0,
  broken_cta: 0,
  broken_route: 0,
  low_quality_entity: 0,
  story_publication_block: 0,
  ranking_anomaly: 0,
};

export function logValidationFailure(failure: Omit<ValidationFailure, "createdAt">, family: LogFamily = "validation_failure") {
  const entry: LogEntry = {
    ...failure,
    createdAt: Date.now(),
    family,
  };

  LOG_BUFFER.push(entry);
  if (LOG_BUFFER.length > MAX_BUFFER) {
    LOG_BUFFER.shift();
  }

  FAMILY_COUNTERS[family]++;

  if (import.meta.env.DEV) {
    const level = failure.blockingLevel === "critical" ? "error" : failure.blockingLevel === "warning" ? "warn" : "log";
    console[level](`[anti-error] ${family}:`, {
      entity: failure.entityId,
      type: failure.issueType,
      reason: failure.reason,
    });
  }
}

export function logFeedRejection(entityId: string, feedKey: string, reason: string) {
  logValidationFailure(
    { entityId, entityType: "entity", domain: feedKey, issueType: "feed_purity_violation", blockingLevel: "warning", reason },
    "feed_rejection"
  );
}

export function logMediaRejection(entityId: string, mediaUrl: string, reason: string) {
  logValidationFailure(
    { entityId, entityType: "media", domain: "media", issueType: "media_quality_failure", blockingLevel: "warning", reason },
    "media_rejection"
  );
}

export function logBrokenCTA(entityId: string, ctaType: string, reason: string) {
  logValidationFailure(
    { entityId, entityType: "cta", domain: "routing", issueType: "broken_cta", blockingLevel: "critical", reason },
    "broken_cta"
  );
}

export function logBrokenRoute(path: string, source: string, reason: string) {
  logValidationFailure(
    { entityId: path, entityType: "route", domain: "routing", issueType: "broken_route", blockingLevel: "critical", reason },
    "broken_route"
  );
}

export function logLowQualityEntity(entityId: string, vertical: string, score: number) {
  logValidationFailure(
    { entityId, entityType: "entity", domain: vertical, issueType: "low_quality", blockingLevel: "info", reason: `Score: ${score}/100` },
    "low_quality_entity"
  );
}

export function logStoryPublicationBlock(storyId: string, reason: string) {
  logValidationFailure(
    { entityId: storyId, entityType: "story", domain: "stories", issueType: "publication_blocked", blockingLevel: "warning", reason },
    "story_publication_block"
  );
}

export function logRankingAnomaly(entityId: string, expected: number, actual: number) {
  logValidationFailure(
    { entityId, entityType: "entity", domain: "ranking", issueType: "score_anomaly", blockingLevel: "info", reason: `Expected ~${expected}, got ${actual}` },
    "ranking_anomaly"
  );
}

export function getRecentFailures(family?: LogFamily, limit = 50): ValidationFailure[] {
  const filtered = family ? LOG_BUFFER.filter((f) => f.family === family) : LOG_BUFFER;
  return filtered.slice(-limit);
}

export function getFailureCounts(): Record<LogFamily, number> {
  return { ...FAMILY_COUNTERS };
}

export function getAntiErrorReport(): { total: number; critical: number; warnings: number; families: Record<LogFamily, number> } {
  const critical = LOG_BUFFER.filter((f) => f.blockingLevel === "critical").length;
  const warnings = LOG_BUFFER.filter((f) => f.blockingLevel === "warning").length;
  return { total: LOG_BUFFER.length, critical, warnings, families: { ...FAMILY_COUNTERS } };
}
