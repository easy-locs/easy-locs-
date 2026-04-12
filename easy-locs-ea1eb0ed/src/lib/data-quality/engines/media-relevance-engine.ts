import { DataQualityEngine } from "../engine-base";
import type { EntityFinding, EntityIssue, ExecutionMode, RemediationEntry } from "../types";
import { quarantineEntity } from "../quarantine";
import { FALLBACK_STORIES } from "@/data/fallback-stories";
import { FALLBACK_PROPERTIES } from "@/data/fallback-properties";
import { FALLBACK_HOTELS } from "@/data/fallback-hotels";
import { FALLBACK_RESTAURANTS } from "@/data/fallback-restaurants";
import { FALLBACK_SHOPS, FALLBACK_GROCERY } from "@/data/fallback-shops";
import { FALLBACK_SERVICES } from "@/data/fallback-services";

export class MediaRelevanceEngine extends DataQualityEngine {
  constructor() {
    super("MediaRelevanceEngine", "Validate media-family alignment, detect broken/placeholder/cross-vertical media", { priority: 2 });
  }

  scan(_mode: ExecutionMode): EntityFinding[] {
    const findings: EntityFinding[] = [];

    const allEntities = [
      ...FALLBACK_STORIES.map((s) => ({ id: s.id, source: "FALLBACK_STORIES", vertical: s.vertical, category: s.categoryKey, subcategory: s.subcategoryKey, entityType: s.entityType, title: s.title, media: [s.mediaUrl] })),
      ...FALLBACK_PROPERTIES.map((p) => ({ id: p.id, source: "FALLBACK_PROPERTIES", vertical: p.vertical, category: "property", subcategory: p.subcategory, entityType: "property", title: p.title, media: [p.image] })),
      ...FALLBACK_HOTELS.map((h) => ({ id: h.id, source: "FALLBACK_HOTELS", vertical: h.vertical === "hotel" ? "stay" : h.vertical, category: h.category, subcategory: h.subcategory, entityType: "stay", title: h.name, media: [h.banner_url, ...h.room_types.map((r: any) => r.image)] })),
      ...FALLBACK_RESTAURANTS.map((r) => ({ id: r.id, source: "FALLBACK_RESTAURANTS", vertical: r.vertical, category: r.category, subcategory: r.subcategory, entityType: "merchant", title: r.name, media: [r.banner_url, r.logo_url] })),
      ...FALLBACK_SHOPS.map((s) => ({ id: s.id, source: "FALLBACK_SHOPS", vertical: s.vertical, category: s.category, subcategory: s.subcategory, entityType: "merchant", title: s.name, media: [s.banner_url, s.logo_url] })),
      ...FALLBACK_GROCERY.map((g) => ({ id: g.id, source: "FALLBACK_GROCERY", vertical: g.vertical, category: g.category, subcategory: g.subcategory, entityType: "merchant", title: g.name, media: [g.banner_url, g.logo_url] })),
      ...FALLBACK_SERVICES.map((s) => ({ id: s.id, source: "FALLBACK_SERVICES", vertical: s.vertical, category: s.category, subcategory: s.subcategory, entityType: "provider", title: s.name, media: [s.banner_url, s.logo_url] })),
    ];

    for (const entity of allEntities) {
      const issues = this.validateMediaSet(entity.media, entity.title, entity.vertical);
      if (issues.length > 0) {
        findings.push({
          entityId: entity.id,
          source: entity.source,
          vertical: entity.vertical,
          category: entity.category,
          subcategory: entity.subcategory,
          entityType: entity.entityType,
          title: entity.title,
          mediaSummary: this.summarizeMedia(entity.media),
          classification: "VALID_WITH_WARNINGS",
          issues,
        });
      }
    }

    return findings;
  }

  classify(findings: EntityFinding[]): EntityFinding[] {
    for (const f of findings) {
      const hasCriticalMedia = f.issues.some((i) => i.severity === "critical" && i.category === "media_integrity");
      const hasPlaceholder = f.issues.some((i) => i.reasonCode === "PLACEHOLDER_MEDIA");
      const hasBroken = f.issues.some((i) => i.reasonCode === "BROKEN_MEDIA" || i.reasonCode === "MISSING_MEDIA");

      if (hasCriticalMedia || hasBroken) {
        f.classification = "BROKEN_MEDIA";
        f.decisionTier = "SUPPRESS_FROM_SURFACE";
      } else if (hasPlaceholder) {
        f.classification = "SUSPICIOUS";
        f.decisionTier = "SUPPRESS_FROM_SURFACE";
      } else {
        f.classification = "VALID_WITH_WARNINGS";
        f.decisionTier = "REVIEW_NEEDED";
      }
    }
    return findings;
  }

  remediate(findings: EntityFinding[], mode: ExecutionMode): RemediationEntry[] {
    if (mode === "DRY_RUN") return [];
    const remediations: RemediationEntry[] = [];
    const now = new Date().toISOString();

    for (const f of findings) {
      if (f.decisionTier === "SUPPRESS_FROM_SURFACE" && (mode === "SAFE_AUTO" || mode === "QUARANTINE_PROTECT")) {
        remediations.push({
          entityId: f.entityId,
          source: f.source,
          action: "suppressed",
          beforeState: "visible",
          afterState: "suppressed",
          reason: `Media issues: ${f.issues.map((i) => i.code).join(", ")}`,
          confidence: "high",
          timestamp: now,
          engineName: this.name,
          decisionTier: "SUPPRESS_FROM_SURFACE",
          playbook: "broken_media_suppress",
        });
      }
    }
    return remediations;
  }

  private validateMediaSet(urls: (string | undefined)[], title: string, vertical: string): EntityIssue[] {
    const issues: EntityIssue[] = [];

    for (const url of urls) {
      if (!url || url.trim() === "") {
        issues.push(this.makeIssue("media_integrity", "critical", "MISSING_MEDIA", `No media URL for "${title}"`, "SUPPRESS_FROM_SURFACE", "mediaUrl", undefined, undefined, "MISSING_MEDIA"));
        continue;
      }

      if (url.includes("placeholder") || url.includes("dummy") || url.includes("lorem") || url.includes("test_image")) {
        issues.push(this.makeIssue("media_integrity", "high", "PLACEHOLDER_MEDIA", "Placeholder/dummy media detected", "SUPPRESS_FROM_SURFACE", "mediaUrl", undefined, url.slice(0, 60), "PLACEHOLDER_MEDIA"));
      }

      if (url.startsWith("data:image/svg+xml")) continue;

      if (!url.startsWith("http") && !url.startsWith("data:") && !url.startsWith("/")) {
        issues.push(this.makeIssue("media_integrity", "high", "INVALID_MEDIA_URL", `Invalid media URL format`, "REVIEW_NEEDED", "mediaUrl", undefined, url.slice(0, 60), "BROKEN_MEDIA"));
      }
    }

    return issues;
  }

  private summarizeMedia(urls: (string | undefined)[]): string {
    const valid = urls.filter((u) => u && u.trim() !== "");
    const svgCount = valid.filter((u) => u!.startsWith("data:image/svg+xml")).length;
    const httpCount = valid.filter((u) => u!.startsWith("http")).length;
    return `${valid.length} media (${svgCount} SVG, ${httpCount} HTTP)`;
  }
}
