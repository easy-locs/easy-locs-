import { DataQualityEngine } from "../engine-base";
import type { EntityFinding, ExecutionMode, TrustLevel, SurfaceVisibility } from "../types";
import { FALLBACK_STORIES } from "@/data/fallback-stories";
import { FALLBACK_PROPERTIES } from "@/data/fallback-properties";
import { FALLBACK_HOTELS } from "@/data/fallback-hotels";
import { FALLBACK_RESTAURANTS } from "@/data/fallback-restaurants";
import { FALLBACK_SHOPS, FALLBACK_GROCERY } from "@/data/fallback-shops";
import { FALLBACK_SERVICES } from "@/data/fallback-services";
import { isQuarantined } from "../quarantine";

const qualityScores = new Map<string, number>();
const trustLevels = new Map<string, TrustLevel>();
const surfaceStates = new Map<string, SurfaceVisibility>();

export function getEntityQualityScore(entityId: string): number {
  return qualityScores.get(entityId) ?? 100;
}

export function getEntityTrustLevel(entityId: string): TrustLevel {
  return trustLevels.get(entityId) ?? "medium";
}

export function getEntitySurfaceVisibility(entityId: string): SurfaceVisibility {
  return surfaceStates.get(entityId) ?? "visible";
}

export function isSurfaceReady(entityId: string, minScore: number = 50): boolean {
  if (isQuarantined(entityId)) return false;
  const score = getEntityQualityScore(entityId);
  const visibility = getEntitySurfaceVisibility(entityId);
  return score >= minScore && visibility === "visible";
}

export class DataQualityScoringEngine extends DataQualityEngine {
  constructor() {
    super("DataQualityScoringEngine", "Assign confidence/quality scores, trust levels, and surface readiness per entity", { priority: 6 });
  }

  scan(_mode: ExecutionMode): EntityFinding[] {
    const findings: EntityFinding[] = [];

    const allEntities = [
      ...FALLBACK_STORIES.map((s) => ({ id: s.id, source: "FALLBACK_STORIES", vertical: s.vertical, category: s.categoryKey, subcategory: s.subcategoryKey, entityType: s.entityType, title: s.title, media: s.mediaUrl, hasCoords: false, hasSlug: false, fields: { id: s.id, title: s.title, vertical: s.vertical, mediaUrl: s.mediaUrl, entityId: s.entityId } })),
      ...FALLBACK_PROPERTIES.map((p) => ({ id: p.id, source: "FALLBACK_PROPERTIES", vertical: p.vertical, category: "property", subcategory: p.subcategory, entityType: "property", title: p.title, media: p.image, hasCoords: true, hasSlug: !!p.slug, fields: { id: p.id, title: p.title, vertical: p.vertical, image: p.image, city: p.city } })),
      ...FALLBACK_HOTELS.map((h) => ({ id: h.id, source: "FALLBACK_HOTELS", vertical: h.vertical === "hotel" ? "stay" : h.vertical, category: h.category, subcategory: h.subcategory, entityType: "stay", title: h.name, media: h.banner_url, hasCoords: true, hasSlug: !!h.slug, fields: { id: h.id, name: h.name, vertical: h.vertical, banner_url: h.banner_url, city: h.city } })),
      ...FALLBACK_RESTAURANTS.map((r) => ({ id: r.id, source: "FALLBACK_RESTAURANTS", vertical: r.vertical, category: r.category, subcategory: r.subcategory, entityType: "merchant", title: r.name, media: r.banner_url, hasCoords: true, hasSlug: !!r.slug, fields: { id: r.id, name: r.name, vertical: r.vertical, banner_url: r.banner_url, city: r.city } })),
      ...FALLBACK_SHOPS.map((s) => ({ id: s.id, source: "FALLBACK_SHOPS", vertical: s.vertical, category: s.category, subcategory: s.subcategory, entityType: "merchant", title: s.name, media: s.banner_url, hasCoords: true, hasSlug: !!s.slug, fields: { id: s.id, name: s.name, vertical: s.vertical, banner_url: s.banner_url } })),
      ...FALLBACK_GROCERY.map((g) => ({ id: g.id, source: "FALLBACK_GROCERY", vertical: g.vertical, category: g.category, subcategory: g.subcategory, entityType: "merchant", title: g.name, media: g.banner_url, hasCoords: true, hasSlug: !!g.slug, fields: { id: g.id, name: g.name, vertical: g.vertical, banner_url: g.banner_url } })),
      ...FALLBACK_SERVICES.map((s) => ({ id: s.id, source: "FALLBACK_SERVICES", vertical: s.vertical, category: s.category, subcategory: s.subcategory, entityType: "provider", title: s.name, media: s.banner_url, hasCoords: true, hasSlug: !!s.slug, fields: { id: s.id, name: s.name, vertical: s.vertical, banner_url: s.banner_url } })),
    ];

    for (const entity of allEntities) {
      let score = 100;
      const issues: string[] = [];

      if (isQuarantined(entity.id)) {
        score = 0;
        issues.push("quarantined");
      }

      if (!entity.media || entity.media.trim() === "") {
        score -= 30;
        issues.push("missing_media");
      }

      if (!entity.subcategory) {
        score -= 15;
        issues.push("missing_subcategory");
      }

      const fieldValues = Object.values(entity.fields);
      const emptyFields = fieldValues.filter((v) => v === undefined || v === null || v === "").length;
      score -= emptyFields * 10;
      if (emptyFields > 0) issues.push(`${emptyFields}_empty_fields`);

      if (!entity.hasCoords && entity.source !== "FALLBACK_STORIES") {
        score -= 5;
      }

      score = Math.max(0, Math.min(100, score));

      let trustLevel: TrustLevel;
      if (score >= 90) trustLevel = "high";
      else if (score >= 70) trustLevel = "medium";
      else if (score >= 40) trustLevel = "low";
      else trustLevel = "untrusted";

      if (isQuarantined(entity.id)) trustLevel = "quarantined";

      let visibility: SurfaceVisibility = "visible";
      if (isQuarantined(entity.id)) visibility = "quarantined";
      else if (score < 30) visibility = "excluded";
      else if (score < 50) visibility = "downgraded";

      qualityScores.set(entity.id, score);
      trustLevels.set(entity.id, trustLevel);
      surfaceStates.set(entity.id, visibility);

      if (score < 70 || issues.length > 0) {
        findings.push({
          entityId: entity.id,
          source: entity.source,
          vertical: entity.vertical,
          category: entity.category,
          subcategory: entity.subcategory,
          entityType: entity.entityType,
          title: entity.title,
          mediaSummary: entity.media ? "present" : "NONE",
          classification: score < 30 ? "INVALID" : score < 50 ? "SUSPICIOUS" : "VALID_WITH_WARNINGS",
          issues: issues.map((issue) => this.makeIssue("source_quality", score < 50 ? "high" : "medium", "LOW_QUALITY_SCORE", `Quality score: ${score}/100 (${issue})`, score < 30 ? "QUARANTINE" : "REVIEW_NEEDED", undefined, undefined, undefined, "LOW_CONFIDENCE")),
          qualityScore: score,
          trustLevel,
          surfaceVisibility: visibility,
        });
      }
    }

    return findings;
  }

  classify(findings: EntityFinding[]): EntityFinding[] {
    return findings;
  }
}
