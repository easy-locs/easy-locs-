/**
 * content-governance-engine — Governs all content quality: titles, descriptions, stories, media.
 * Prevents fake/low-quality/misleading content from being published.
 */

import { reportAnomaly } from "./anomaly-detector";
import { reportHealth } from "./health-aggregator";

export interface ContentViolation {
  entityId: string;
  field: string;
  type: "empty" | "too_short" | "too_long" | "duplicate" | "placeholder" | "misleading" | "low_quality" | "profanity";
  detail: string;
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: string;
}

const PLACEHOLDER_PATTERNS = [
  /^test$/i, /^lorem ipsum/i, /^placeholder/i, /^sample/i, /^example/i,
  /^todo$/i, /^tbd$/i, /^n\/a$/i, /^null$/i, /^undefined$/i,
  /^asdf/i, /^qwerty/i, /^xxx/i, /^coming soon$/i,
];

const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 200;
const MIN_DESCRIPTION_LENGTH = 15;
const MAX_DESCRIPTION_LENGTH = 5000;

export function validateTitle(entityId: string, title: string): ContentViolation[] {
  const violations: ContentViolation[] = [];
  const now = new Date().toISOString();

  if (!title || title.trim().length === 0) {
    violations.push({ entityId, field: "title", type: "empty", detail: "Title is empty", severity: "high", detectedAt: now });
    return violations;
  }

  const trimmed = title.trim();
  if (trimmed.length < MIN_TITLE_LENGTH) {
    violations.push({ entityId, field: "title", type: "too_short", detail: `Title "${trimmed}" is too short (${trimmed.length} chars, min ${MIN_TITLE_LENGTH})`, severity: "medium", detectedAt: now });
  }
  if (trimmed.length > MAX_TITLE_LENGTH) {
    violations.push({ entityId, field: "title", type: "too_long", detail: `Title exceeds ${MAX_TITLE_LENGTH} chars`, severity: "low", detectedAt: now });
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(trimmed)) {
      violations.push({ entityId, field: "title", type: "placeholder", detail: `Title "${trimmed}" appears to be placeholder text`, severity: "critical", detectedAt: now });
      break;
    }
  }

  return violations;
}

export function validateDescription(entityId: string, description: string): ContentViolation[] {
  const violations: ContentViolation[] = [];
  const now = new Date().toISOString();

  if (!description || description.trim().length === 0) {
    violations.push({ entityId, field: "description", type: "empty", detail: "Description is empty", severity: "medium", detectedAt: now });
    return violations;
  }

  const trimmed = description.trim();
  if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
    violations.push({ entityId, field: "description", type: "too_short", detail: `Description too short (${trimmed.length} chars, min ${MIN_DESCRIPTION_LENGTH})`, severity: "low", detectedAt: now });
  }
  if (trimmed.length > MAX_DESCRIPTION_LENGTH) {
    violations.push({ entityId, field: "description", type: "too_long", detail: `Description exceeds ${MAX_DESCRIPTION_LENGTH} chars`, severity: "low", detectedAt: now });
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(trimmed)) {
      violations.push({ entityId, field: "description", type: "placeholder", detail: `Description appears to be placeholder text`, severity: "high", detectedAt: now });
      break;
    }
  }

  return violations;
}

export function validateMediaUrls(entityId: string, urls: string[]): ContentViolation[] {
  const violations: ContentViolation[] = [];
  const now = new Date().toISOString();

  if (!urls || urls.length === 0) {
    violations.push({ entityId, field: "media", type: "empty", detail: "No media URLs provided", severity: "medium", detectedAt: now });
    return violations;
  }

  const uniqueUrls = new Set(urls);
  if (uniqueUrls.size < urls.length) {
    violations.push({
      entityId, field: "media", type: "duplicate",
      detail: `${urls.length - uniqueUrls.size} duplicate media URLs detected`,
      severity: "high", detectedAt: now,
    });
  }

  for (const url of urls) {
    if (!url || url.trim().length === 0) {
      violations.push({ entityId, field: "media", type: "empty", detail: "Empty media URL", severity: "high", detectedAt: now });
    } else if (url.includes("placeholder") || url.includes("via.placeholder")) {
      violations.push({ entityId, field: "media", type: "placeholder", detail: `Placeholder image detected: ${url}`, severity: "critical", detectedAt: now });
    }
  }

  return violations;
}

export function validateEntity(entity: {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  images?: string[];
  mediaUrls?: string[];
}): ContentViolation[] {
  const all: ContentViolation[] = [];
  const title = entity.title || entity.name || "";
  all.push(...validateTitle(entity.id, title));
  if (entity.description) all.push(...validateDescription(entity.id, entity.description));
  const media = entity.images || entity.mediaUrls || [];
  if (media.length > 0) all.push(...validateMediaUrls(entity.id, media));
  return all;
}

export function runContentGovernance(entities: Array<{
  id: string;
  name?: string;
  title?: string;
  description?: string;
  images?: string[];
}>): { total: number; clean: number; withViolations: number; criticalCount: number } {
  let withViolations = 0;
  let criticalCount = 0;

  for (const entity of entities) {
    const violations = validateEntity(entity);
    if (violations.length > 0) withViolations++;
    criticalCount += violations.filter(v => v.severity === "critical").length;

    for (const v of violations.filter(v => v.severity === "critical" || v.severity === "high")) {
      reportAnomaly("architecture_violation", "content-governance",
        `[${entity.id}] ${v.field}: ${v.detail}`, v.severity === "critical" ? "critical" : "high");
    }
  }

  const clean = entities.length - withViolations;

  reportHealth(
    "content-governance",
    criticalCount > 0 ? "degraded" : "ok",
    undefined,
    criticalCount > 0 ? `${criticalCount} critical content violations` : undefined
  );

  console.log(`[content-governance] ${entities.length} entities scanned — ${clean} clean, ${withViolations} with violations, ${criticalCount} critical`);
  return { total: entities.length, clean, withViolations, criticalCount };
}
