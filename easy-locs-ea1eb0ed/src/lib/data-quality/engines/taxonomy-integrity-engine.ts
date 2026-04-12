import { DataQualityEngine } from "../engine-base";
import type { EntityFinding, EntityIssue, ExecutionMode, RemediationEntry } from "../types";
import { quarantineEntity } from "../quarantine";
import { CATEGORY_TREE } from "@/lib/taxonomy/category-tree";
import { CANONICAL_VERTICALS, isCanonicalVertical } from "@/domains/shared/canonical-types";
import { FALLBACK_STORIES } from "@/data/fallback-stories";
import { FALLBACK_PROPERTIES } from "@/data/fallback-properties";
import { FALLBACK_HOTELS } from "@/data/fallback-hotels";
import { FALLBACK_RESTAURANTS } from "@/data/fallback-restaurants";
import { FALLBACK_SHOPS, FALLBACK_GROCERY } from "@/data/fallback-shops";
import { FALLBACK_SERVICES } from "@/data/fallback-services";

const verticalSubcategoryMap = new Map<string, Set<string>>();
const verticalCategoryMap = new Map<string, string>();

for (const cat of CATEGORY_TREE) {
  verticalCategoryMap.set(cat.key, cat.vertical);
  const existing = verticalSubcategoryMap.get(cat.vertical) ?? new Set<string>();
  for (const sub of cat.subcategories) {
    existing.add(sub.value);
  }
  verticalSubcategoryMap.set(cat.vertical, existing);
}

const VERTICAL_ALLOWED_ENTITY_TYPES: Record<string, string[]> = {
  property: ["property"],
  stay: ["stay"],
  food: ["merchant", "product"],
  grocery: ["merchant", "product"],
  utility: ["atm", "fuel", "service", "parking", "pharmacy", "hospital"],
  mobility: ["driver", "fleet", "vehicle"],
  shops: ["merchant", "product"],
  services: ["merchant", "provider"],
  healthcare: ["merchant", "service"],
  experiences: ["merchant", "service"],
  hotel: ["stay"],
  beauty: ["merchant", "provider"],
  education: ["merchant", "provider"],
  retail: ["merchant", "product"],
  ride: ["driver", "fleet", "vehicle"],
  delivery: ["driver", "fleet"],
  finance: ["service"],
  service: ["merchant", "provider"],
  flight: ["flight"],
  events: ["merchant", "service"],
};

export class TaxonomyIntegrityEngine extends DataQualityEngine {
  constructor() {
    super("TaxonomyIntegrityEngine", "Validate entities against canonical vertical/category/subcategory/entity-type rules", { priority: 1 });
  }

  scan(_mode: ExecutionMode): EntityFinding[] {
    const findings: EntityFinding[] = [];
    const now = new Date().toISOString();

    for (const story of FALLBACK_STORIES) {
      const issues = this.validateTaxonomy(story.vertical, story.categoryKey, story.subcategoryKey, story.entityType);
      if (issues.length > 0) {
        findings.push(this.makeFinding(story.id, "FALLBACK_STORIES", story.vertical, story.categoryKey, story.subcategoryKey, story.entityType, story.title, story.mediaUrl, issues));
      }
    }

    for (const prop of FALLBACK_PROPERTIES) {
      const issues = this.validateTaxonomy(prop.vertical, "property", prop.subcategory, "property");
      if (issues.length > 0) {
        findings.push(this.makeFinding(prop.id, "FALLBACK_PROPERTIES", prop.vertical, "property", prop.subcategory, "property", prop.title, prop.image, issues));
      }
    }

    for (const hotel of FALLBACK_HOTELS) {
      const issues = this.validateTaxonomy(hotel.vertical, hotel.category, hotel.subcategory, "stay");
      if (hotel.vertical !== "stay" && hotel.vertical !== "hotel") {
        issues.push(this.makeIssue("vertical_integrity", "high", "WRONG_VERTICAL", `Hotel has vertical "${hotel.vertical}" instead of "stay"`, "SAFE_AUTOFIX", "vertical", "stay", hotel.vertical, "WRONG_VERTICAL"));
      }
      if (issues.length > 0) {
        findings.push(this.makeFinding(hotel.id, "FALLBACK_HOTELS", hotel.vertical, hotel.category, hotel.subcategory, "stay", hotel.name, hotel.banner_url, issues));
      }
    }

    for (const rest of FALLBACK_RESTAURANTS) {
      const issues = this.validateTaxonomy(rest.vertical, rest.category, rest.subcategory, "merchant");
      if (issues.length > 0) {
        findings.push(this.makeFinding(rest.id, "FALLBACK_RESTAURANTS", rest.vertical, rest.category, rest.subcategory, "merchant", rest.name, rest.banner_url, issues));
      }
    }

    const shopSources: [any[], string, string][] = [
      [FALLBACK_SHOPS, "FALLBACK_SHOPS", "shops"],
      [FALLBACK_GROCERY, "FALLBACK_GROCERY", "grocery"],
    ];
    for (const [entities, source, expectedVertical] of shopSources) {
      for (const e of entities) {
        const issues = this.validateTaxonomy(e.vertical, e.category, e.subcategory, "merchant");
        if (e.vertical !== expectedVertical) {
          issues.push(this.makeIssue("vertical_integrity", "high", "WRONG_VERTICAL", `Entity in ${source} has vertical "${e.vertical}" instead of "${expectedVertical}"`, "SAFE_AUTOFIX", "vertical", expectedVertical, e.vertical, "WRONG_VERTICAL"));
        }
        if (issues.length > 0) {
          findings.push(this.makeFinding(e.id, source, e.vertical, e.category, e.subcategory, "merchant", e.name, e.banner_url, issues));
        }
      }
    }

    for (const svc of FALLBACK_SERVICES) {
      const issues = this.validateTaxonomy(svc.vertical, svc.category, svc.subcategory, "provider");
      if (issues.length > 0) {
        findings.push(this.makeFinding(svc.id, "FALLBACK_SERVICES", svc.vertical, svc.category, svc.subcategory, "provider", svc.name, svc.banner_url, issues));
      }
    }

    return findings;
  }

  classify(findings: EntityFinding[]): EntityFinding[] {
    for (const f of findings) {
      const hasCrossVertical = f.issues.some((i) => i.reasonCode === "CROSS_VERTICAL_CONTAMINATION" || i.reasonCode === "ENTITY_TYPE_MISMATCH");
      const hasWrongVertical = f.issues.some((i) => i.reasonCode === "WRONG_VERTICAL");
      const hasInvalidSub = f.issues.some((i) => i.reasonCode === "INVALID_SUBCATEGORY");

      if (hasCrossVertical) {
        f.classification = "CROSS_VERTICAL_CONTAMINATION";
        f.decisionTier = "QUARANTINE";
      } else if (hasWrongVertical) {
        f.classification = "MISCLASSIFIED";
        f.decisionTier = "SAFE_AUTOFIX";
      } else if (hasInvalidSub) {
        f.classification = "VALID_WITH_WARNINGS";
        f.decisionTier = "REVIEW_NEEDED";
      } else {
        f.classification = "VALID_WITH_WARNINGS";
        f.decisionTier = "IGNORE_WITH_REASON";
      }
    }
    return findings;
  }

  remediate(findings: EntityFinding[], mode: ExecutionMode): RemediationEntry[] {
    if (mode === "DRY_RUN") return [];
    const remediations: RemediationEntry[] = [];
    const now = new Date().toISOString();

    for (const f of findings) {
      if (f.decisionTier === "QUARANTINE") {
        quarantineEntity({
          entityId: f.entityId,
          source: f.source,
          vertical: f.vertical,
          title: f.title,
          classification: f.classification,
          reasonCodes: f.issues.map((i) => i.code),
          quarantinedAt: now,
          reviewable: true,
          quarantinedBy: this.name,
          visibilityEffect: "quarantined",
          restorable: true,
        });
        remediations.push({
          entityId: f.entityId,
          source: f.source,
          action: "quarantined",
          beforeState: f.classification,
          afterState: "QUARANTINED",
          reason: "Cross-vertical contamination detected",
          confidence: "high",
          timestamp: now,
          engineName: this.name,
          decisionTier: "QUARANTINE",
          playbook: "wrong_taxonomy_remap",
        });
      }
    }
    return remediations;
  }

  private validateTaxonomy(vertical: string, category: string, subcategory: string, entityType: string): EntityIssue[] {
    const issues: EntityIssue[] = [];

    if (!vertical) {
      issues.push(this.makeIssue("vertical_integrity", "critical", "MISSING_VERTICAL", "No vertical assigned", "QUARANTINE", "vertical", undefined, undefined, "WRONG_VERTICAL"));
    } else if (!isCanonicalVertical(vertical)) {
      issues.push(this.makeIssue("vertical_integrity", "critical", "WRONG_VERTICAL", `Vertical "${vertical}" is not canonical`, "QUARANTINE", "vertical", CANONICAL_VERTICALS.join(", "), vertical, "WRONG_VERTICAL"));
    }

    if (subcategory && vertical) {
      const allowedSubs = verticalSubcategoryMap.get(vertical);
      if (allowedSubs && !allowedSubs.has(subcategory)) {
        issues.push(this.makeIssue("taxonomy_integrity", "high", "INVALID_SUBCATEGORY", `Subcategory "${subcategory}" not valid for vertical "${vertical}"`, "REVIEW_NEEDED", "subcategory", undefined, subcategory, "INVALID_SUBCATEGORY"));
      }
    }

    if (entityType && vertical) {
      const allowed = VERTICAL_ALLOWED_ENTITY_TYPES[vertical];
      if (allowed && !allowed.includes(entityType)) {
        issues.push(this.makeIssue("cross_vertical", "critical", "ENTITY_TYPE_MISMATCH", `Entity type "${entityType}" not allowed in vertical "${vertical}"`, "QUARANTINE", "entityType", allowed.join(", "), entityType, "ENTITY_TYPE_MISMATCH"));
      }
    }

    if (vertical && category && vertical !== category && category !== "property" && category !== "stay") {
      const catVertical = verticalCategoryMap.get(category);
      if (catVertical && catVertical !== vertical) {
        issues.push(this.makeIssue("taxonomy_integrity", "high", "CATEGORY_VERTICAL_MISMATCH", `Category "${category}" belongs to vertical "${catVertical}" but entity is in "${vertical}"`, "REVIEW_NEEDED", "category", catVertical, vertical, "CATEGORY_VERTICAL_MISMATCH"));
      }
    }

    return issues;
  }

  private makeFinding(entityId: string, source: string, vertical: string, category: string, subcategory: string, entityType: string, title: string, media: string | undefined, issues: EntityIssue[]): EntityFinding {
    return {
      entityId,
      source,
      vertical,
      category,
      subcategory,
      entityType,
      title,
      mediaSummary: media ? (media.startsWith("data:") ? "SVG data URI" : media.slice(0, 80)) : "NONE",
      classification: "VALID_WITH_WARNINGS",
      issues,
    };
  }
}
