/**
 * Publish Gate — Final validation before an entity becomes visible.
 * Blocks publication if data is incoherent or insufficient.
 */
import type { CanonicalEntity, QualityReport, PublishDecision, Vertical } from "../types";

// ─── Mandatory fields per vertical for publication ───
const PUBLISH_REQUIREMENTS: Record<Vertical, string[]> = {
  food: ["canonicalName", "address", "lat", "lng", "phone"],
  grocery: ["canonicalName", "address", "lat", "lng"],
  hotel: ["canonicalName", "address", "lat", "lng"],
  services: ["canonicalName", "address", "lat", "lng", "phone"],
  property: ["canonicalName", "address", "lat", "lng"],
};

// ─── Incoherence checks ───
function detectIncoherences(entity: CanonicalEntity): string[] {
  const issues: string[] = [];

  // GPS out of range
  if (entity.lat != null && (entity.lat < -90 || entity.lat > 90)) {
    issues.push("Invalid latitude");
  }
  if (entity.lng != null && (entity.lng < -180 || entity.lng > 180)) {
    issues.push("Invalid longitude");
  }

  // Rating out of range
  if (entity.rating != null && (entity.rating < 0 || entity.rating > 5)) {
    issues.push("Invalid rating (must be 0-5)");
  }

  // Taxonomy incomplete
  if (entity.taxonomy.confidence < 30) {
    issues.push("Low taxonomy confidence");
  }

  // Name too short or suspicious
  if (entity.canonicalName && entity.canonicalName.length < 2) {
    issues.push("Name too short");
  }

  // Vertical-specific: food/grocery must have menu
  if ((entity.vertical === "food" || entity.vertical === "grocery") && entity.menuItems.length === 0) {
    issues.push("No menu items for food/grocery entity");
  }

  // Hotel must have photos
  if (entity.vertical === "hotel" && entity.photos.length === 0) {
    issues.push("No photos for hotel entity");
  }

  return issues;
}

function isFieldPresent(entity: CanonicalEntity, field: string): boolean {
  const val = (entity as any)[field];
  if (val == null || val === "") return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
}

/**
 * Evaluate whether an entity can be published.
 */
export function evaluatePublishGate(entity: CanonicalEntity, quality: QualityReport): PublishDecision {
  const reasons: string[] = [];

  // Check required fields
  const required = PUBLISH_REQUIREMENTS[entity.vertical] ?? [];
  const missingRequired = required.filter(f => !isFieldPresent(entity, f));
  if (missingRequired.length > 0) {
    reasons.push(`Missing required: ${missingRequired.join(", ")}`);
  }

  // Check incoherences
  const incoherences = detectIncoherences(entity);
  reasons.push(...incoherences);

  // Quality gate
  if (quality.score < 40) {
    reasons.push(`Quality too low: ${quality.score}/100`);
  }

  const allowed = reasons.length === 0 && quality.readyToPublish;

  return {
    allowed,
    targetStatus: allowed ? "ready" : "draft",
    reasons,
    qualityScore: quality.score,
  };
}
