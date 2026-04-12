import { DataQualityEngine } from "../engine-base";
import type { EntityFinding, EntityIssue, ExecutionMode, RemediationEntry } from "../types";
import { FALLBACK_STORIES } from "@/data/fallback-stories";
import { FALLBACK_PROPERTIES } from "@/data/fallback-properties";
import { FALLBACK_HOTELS } from "@/data/fallback-hotels";
import { FALLBACK_RESTAURANTS } from "@/data/fallback-restaurants";
import { FALLBACK_SHOPS, FALLBACK_GROCERY } from "@/data/fallback-shops";
import { FALLBACK_SERVICES } from "@/data/fallback-services";

interface EntityRef {
  id: string;
  source: string;
  vertical: string;
  category: string;
  subcategory: string;
  entityType: string;
  title: string;
  slug?: string;
  media: string;
}

export class DuplicateShadowEngine extends DataQualityEngine {
  constructor() {
    super("DuplicateShadowEngine", "Detect exact/semantic duplicates, legacy/mock/shadow data leakage", { priority: 3 });
  }

  scan(_mode: ExecutionMode): EntityFinding[] {
    const findings: EntityFinding[] = [];
    const allEntities: EntityRef[] = this.collectAllEntities();

    const idMap = new Map<string, EntityRef[]>();
    const slugMap = new Map<string, EntityRef[]>();
    const titleMap = new Map<string, EntityRef[]>();

    for (const e of allEntities) {
      const idGroup = idMap.get(e.id) ?? [];
      idGroup.push(e);
      idMap.set(e.id, idGroup);

      if (e.slug) {
        const slugGroup = slugMap.get(e.slug) ?? [];
        slugGroup.push(e);
        slugMap.set(e.slug, slugGroup);
      }

      const normTitle = e.title.toLowerCase().trim();
      const titleGroup = titleMap.get(normTitle) ?? [];
      titleGroup.push(e);
      titleMap.set(normTitle, titleGroup);
    }

    for (const [id, group] of idMap) {
      if (group.length > 1) {
        for (const e of group) {
          findings.push({
            entityId: e.id,
            source: e.source,
            vertical: e.vertical,
            category: e.category,
            subcategory: e.subcategory,
            entityType: e.entityType,
            title: e.title,
            mediaSummary: e.media,
            classification: "DUPLICATE",
            issues: [this.makeIssue("uniqueness", "high", "DUPLICATE_ID", `ID "${id}" appears in ${group.map((g) => g.source).join(", ")}`, "SAFE_AUTOFIX", "id", undefined, undefined, "DUPLICATE_EXACT")],
          });
        }
      }
    }

    for (const [slug, group] of slugMap) {
      if (group.length > 1) {
        const uniqueIds = new Set(group.map((g) => g.id));
        if (uniqueIds.size > 1) {
          for (const e of group) {
            findings.push({
              entityId: e.id,
              source: e.source,
              vertical: e.vertical,
              category: e.category,
              subcategory: e.subcategory,
              entityType: e.entityType,
              title: e.title,
              mediaSummary: e.media,
              classification: "DUPLICATE",
              issues: [this.makeIssue("uniqueness", "medium", "DUPLICATE_SLUG", `Slug "${slug}" shared across entities`, "REVIEW_NEEDED", "slug", undefined, undefined, "DUPLICATE_SEMANTIC")],
            });
          }
        }
      }
    }

    for (const [normTitle, group] of titleMap) {
      if (group.length > 1) {
        const uniqueIds = new Set(group.map((g) => g.id));
        if (uniqueIds.size > 1) {
          for (const e of group) {
            findings.push({
              entityId: e.id,
              source: e.source,
              vertical: e.vertical,
              category: e.category,
              subcategory: e.subcategory,
              entityType: e.entityType,
              title: e.title,
              mediaSummary: e.media,
              classification: "SUSPICIOUS",
              issues: [this.makeIssue("uniqueness", "low", "NEAR_DUPLICATE_TITLE", `Semantic duplicate: title "${normTitle}" used by ${group.length} entities`, "REVIEW_NEEDED", "title", undefined, undefined, "DUPLICATE_SEMANTIC")],
            });
          }
        }
      }
    }

    this.detectMockLeakage(allEntities, findings);

    return findings;
  }

  classify(findings: EntityFinding[]): EntityFinding[] {
    for (const f of findings) {
      const hasExactDupe = f.issues.some((i) => i.reasonCode === "DUPLICATE_EXACT");
      const hasMock = f.issues.some((i) => i.reasonCode === "MOCK_LEAKAGE" || i.reasonCode === "LEGACY_SHADOW");

      if (hasExactDupe) {
        f.classification = "DUPLICATE";
        f.decisionTier = "SAFE_AUTOFIX";
      } else if (hasMock) {
        f.classification = "LEGACY_SHADOW";
        f.decisionTier = "SUPPRESS_FROM_SURFACE";
      } else {
        f.classification = "SUSPICIOUS";
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
      if (f.decisionTier === "SAFE_AUTOFIX" && f.classification === "DUPLICATE") {
        remediations.push({
          entityId: f.entityId,
          source: f.source,
          action: "suppressed",
          beforeState: "visible",
          afterState: "suppressed_duplicate",
          reason: "Exact duplicate detected and suppressed",
          confidence: "high",
          timestamp: now,
          engineName: this.name,
          decisionTier: "SAFE_AUTOFIX",
          playbook: "exact_duplicate_suppress",
        });
      } else if (f.classification === "LEGACY_SHADOW") {
        remediations.push({
          entityId: f.entityId,
          source: f.source,
          action: "suppressed",
          beforeState: "visible",
          afterState: "suppressed_legacy",
          reason: "Legacy/mock data detected and suppressed from live surfaces",
          confidence: "high",
          timestamp: now,
          engineName: this.name,
          decisionTier: "SUPPRESS_FROM_SURFACE",
          playbook: "legacy_mock_suppress",
        });
      }
    }
    return remediations;
  }

  private detectMockLeakage(entities: EntityRef[], findings: EntityFinding[]): void {
    const mockIndicators = ["test", "demo", "sample", "example", "dummy", "mock", "placeholder", "lorem", "fake"];

    for (const e of entities) {
      const titleLower = e.title.toLowerCase();
      const matched = mockIndicators.filter((ind) => titleLower.includes(ind));
      if (matched.length > 0) {
        findings.push({
          entityId: e.id,
          source: e.source,
          vertical: e.vertical,
          category: e.category,
          subcategory: e.subcategory,
          entityType: e.entityType,
          title: e.title,
          mediaSummary: e.media,
          classification: "LEGACY_SHADOW",
          issues: [this.makeIssue("source_quality", "high", "MOCK_LEAKAGE", `Title contains mock/test indicators: ${matched.join(", ")}`, "SUPPRESS_FROM_SURFACE", "title", undefined, e.title, "MOCK_LEAKAGE")],
        });
      }
    }
  }

  private collectAllEntities(): EntityRef[] {
    const refs: EntityRef[] = [];
    for (const s of FALLBACK_STORIES) refs.push({ id: s.id, source: "FALLBACK_STORIES", vertical: s.vertical, category: s.categoryKey, subcategory: s.subcategoryKey, entityType: s.entityType, title: s.title, media: s.mediaUrl ? "present" : "NONE" });
    for (const p of FALLBACK_PROPERTIES) refs.push({ id: p.id, source: "FALLBACK_PROPERTIES", vertical: p.vertical, category: "property", subcategory: p.subcategory, entityType: "property", title: p.title, slug: p.slug, media: p.image ? "present" : "NONE" });
    for (const h of FALLBACK_HOTELS) refs.push({ id: h.id, source: "FALLBACK_HOTELS", vertical: h.vertical === "hotel" ? "stay" : h.vertical, category: h.category, subcategory: h.subcategory, entityType: "stay", title: h.name, slug: h.slug, media: h.banner_url ? "present" : "NONE" });
    for (const r of FALLBACK_RESTAURANTS) refs.push({ id: r.id, source: "FALLBACK_RESTAURANTS", vertical: r.vertical, category: r.category, subcategory: r.subcategory, entityType: "merchant", title: r.name, slug: r.slug, media: r.banner_url ? "present" : "NONE" });
    for (const s of FALLBACK_SHOPS) refs.push({ id: s.id, source: "FALLBACK_SHOPS", vertical: s.vertical, category: s.category, subcategory: s.subcategory, entityType: "merchant", title: s.name, slug: s.slug, media: s.banner_url ? "present" : "NONE" });
    for (const g of FALLBACK_GROCERY) refs.push({ id: g.id, source: "FALLBACK_GROCERY", vertical: g.vertical, category: g.category, subcategory: g.subcategory, entityType: "merchant", title: g.name, slug: g.slug, media: g.banner_url ? "present" : "NONE" });
    for (const s of FALLBACK_SERVICES) refs.push({ id: s.id, source: "FALLBACK_SERVICES", vertical: s.vertical, category: s.category, subcategory: s.subcategory, entityType: "provider", title: s.name, slug: s.slug, media: s.banner_url ? "present" : "NONE" });
    return refs;
  }
}
