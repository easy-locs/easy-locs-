/**
 * taxonomy-guard — Strict runtime taxonomy enforcement.
 * Ensures every entity has ONE vertical, ONE type, ONE path.
 * Prevents cross-vertical contamination at runtime.
 * Reports violations to anomaly-detector and health-aggregator.
 */

import { reportAnomaly } from "./anomaly-detector";
import { reportHealth } from "./health-aggregator";
import {
  CANONICAL_VERTICALS,
  isCanonicalVertical,
  type CanonicalVertical,
} from "@/domains/shared/canonical-types";

const VERTICAL_SET = new Set<string>(CANONICAL_VERTICALS);

export const VERTICAL_ENTITY_TYPES: Partial<Record<CanonicalVertical, string[]>> = {
  food: ["restaurant", "cafe", "bakery", "fast_food", "cloud_kitchen", "food_truck"],
  grocery: ["supermarket", "mini_mart", "organic_store", "wholesale", "hypermarket"],
  hotel: ["hotel", "serviced_apartment", "boutique_hotel", "apart_hotel", "resort"],
  service: ["salon", "barber", "spa", "cleaning", "laundry", "plumbing", "electrical", "ac_repair"],
  services: ["salon", "barber", "spa", "cleaning", "laundry", "plumbing", "electrical", "ac_repair", "car_wash", "car_repair", "handyman", "pest_control", "movers", "tailoring", "tutoring", "legal", "fitness"],
  property: ["rent", "sale", "short_stay", "commercial_lease", "villa", "apartment", "office"],
  flight: ["domestic", "international", "charter", "cargo"],
  ride: ["taxi", "chauffeur", "ride_hailing", "bike_rental"],
  delivery: ["food_delivery", "grocery_delivery", "parcel", "courier", "express"],
  retail: ["fashion", "electronics", "jewelry", "general"],
  shops: ["fashion", "electronics", "jewelry", "footwear", "home_decor", "perfume", "toys", "sports", "books", "general"],
  healthcare: ["hospital", "clinic", "dental", "pharmacy", "lab", "optical", "physiotherapy"],
  events: ["concert", "conference", "exhibition", "sports_event", "festival"],
  experiences: ["theme_park", "museum", "concert", "desert_safari", "water_sports", "tour", "cinema", "event"],
  education: ["school", "university", "tutoring", "online_course", "training"],
  beauty: ["salon", "spa", "barber", "nail_salon", "skincare"],
  mobility: ["taxi", "chauffeur", "rental", "bus", "metro", "ride_hailing", "bike_rental"],
  stay: ["hotel", "serviced_apartment", "boutique_hotel", "apart_hotel", "holiday_rental", "short_stay"],
  utility: ["atm", "fuel", "pharmacy", "parking", "ev_charger", "post_office", "bank"],
  finance: ["bank", "insurance", "investment", "money_transfer", "crypto_exchange"],
};

const FORBIDDEN_CROSS_ASSIGNMENTS: Record<string, CanonicalVertical[]> = {
  restaurant: ["shops", "property", "mobility"],
  hotel: ["food", "shops", "mobility"],
  taxi: ["food", "stay", "property"],
  apartment: ["food", "stay", "shops"],
};

export interface TaxonomyViolation {
  entityId: string;
  entityName: string;
  violation: "invalid_vertical" | "mixed_vertical" | "wrong_type" | "cross_contamination" | "missing_vertical" | "missing_type";
  detail: string;
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: string;
}

let violations: TaxonomyViolation[] = [];
const MAX_VIOLATIONS = 500;

export function validateEntity(entity: {
  id: string;
  name?: string;
  vertical?: string;
  type?: string;
  category?: string;
}): TaxonomyViolation[] {
  const found: TaxonomyViolation[] = [];
  const now = new Date().toISOString();
  const name = entity.name || entity.id;

  if (!entity.vertical) {
    found.push({
      entityId: entity.id,
      entityName: name,
      violation: "missing_vertical",
      detail: `Entity "${name}" has no vertical assigned`,
      severity: "critical",
      detectedAt: now,
    });
    return found;
  }

  if (!VERTICAL_SET.has(entity.vertical)) {
    found.push({
      entityId: entity.id,
      entityName: name,
      violation: "invalid_vertical",
      detail: `Entity "${name}" has invalid vertical "${entity.vertical}" — not in canonical set`,
      severity: "critical",
      detectedAt: now,
    });
    return found;
  }

  const vertical = entity.vertical;
  if (!isCanonicalVertical(vertical)) return found;
  const allowedTypes = VERTICAL_ENTITY_TYPES[vertical];

  if (entity.type && allowedTypes && !allowedTypes.includes(entity.type)) {
    found.push({
      entityId: entity.id,
      entityName: name,
      violation: "wrong_type",
      detail: `Entity "${name}" has type "${entity.type}" which is not valid for vertical "${vertical}"`,
      severity: "high",
      detectedAt: now,
    });
  }

  if (entity.type && FORBIDDEN_CROSS_ASSIGNMENTS[entity.type]) {
    const forbidden = FORBIDDEN_CROSS_ASSIGNMENTS[entity.type];
    if (forbidden.includes(vertical)) {
      found.push({
        entityId: entity.id,
        entityName: name,
        violation: "cross_contamination",
        detail: `Entity "${name}" type "${entity.type}" is forbidden in vertical "${vertical}"`,
        severity: "critical",
        detectedAt: now,
      });
    }
  }

  return found;
}

export function validateEntityBatch(entities: Array<{
  id: string;
  name?: string;
  vertical?: string;
  type?: string;
  category?: string;
}>): TaxonomyViolation[] {
  const allViolations: TaxonomyViolation[] = [];
  for (const entity of entities) {
    allViolations.push(...validateEntity(entity));
  }

  violations = [...allViolations, ...violations].slice(0, MAX_VIOLATIONS);

  if (allViolations.length > 0) {
    const critical = allViolations.filter(v => v.severity === "critical").length;
    const high = allViolations.filter(v => v.severity === "high").length;

    for (const v of allViolations.filter(v => v.severity === "critical")) {
      reportAnomaly("architecture_violation", "taxonomy-guard", v.detail, "critical", {
        entityId: v.entityId,
        violation: v.violation,
      });
    }

    reportHealth(
      "taxonomy-guard",
      critical > 0 ? "degraded" : "ok",
      undefined,
      critical > 0 ? `${critical} critical, ${high} high taxonomy violations` : undefined
    );
  } else {
    reportHealth("taxonomy-guard", "ok");
  }

  return allViolations;
}

export function isValidVertical(v: string): v is CanonicalVertical {
  return VERTICAL_SET.has(v);
}

export function getVerticalForType(type: string): CanonicalVertical | null {
  for (const [vertical, types] of Object.entries(VERTICAL_ENTITY_TYPES)) {
    if (isCanonicalVertical(vertical) && types.includes(type)) return vertical;
  }
  return null;
}

export function getTaxonomyViolations(): TaxonomyViolation[] {
  return [...violations];
}

export function clearTaxonomyViolations(): void {
  violations = [];
}

export function runTaxonomyGuard(): { total: number; clean: number; violations: number; critical: number } {
  const violationCount = violations.length;
  const criticalCount = violations.filter(v => v.severity === "critical").length;

  reportHealth(
    "taxonomy-guard",
    criticalCount > 0 ? "degraded" : "ok",
    undefined,
    violationCount > 0 ? `${violationCount} taxonomy violations (${criticalCount} critical)` : undefined
  );

  console.log(`[taxonomy-guard] Taxonomy enforcement active — ${CANONICAL_VERTICALS.length} canonical verticals locked${violationCount > 0 ? `, ${violationCount} violations tracked` : ""}`);
  return { total: violationCount, clean: 0, violations: violationCount, critical: criticalCount };
}
