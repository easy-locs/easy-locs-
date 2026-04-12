import { DataQualityEngine } from "../engine-base";
import type { EntityFinding, ExecutionMode, RemediationEntry, ProtectedSurface, SurfaceProtectionRule } from "../types";
import { isQuarantined, getQuarantineList } from "../quarantine";
import { getEntityQualityScore, getEntitySurfaceVisibility } from "./data-quality-scoring-engine";
import { engineRegistry } from "../engine-registry";

const SURFACE_RULES: SurfaceProtectionRule[] = [
  { surface: "dashboard_cards", excludeQuarantined: true, excludeInvalid: true, excludeDuplicates: true, excludeBrokenReferences: true, excludeBrokenMedia: true, excludeLegacyShadow: true, excludeLowTrust: true, minQualityScore: 50 },
  { surface: "stories", excludeQuarantined: true, excludeInvalid: true, excludeDuplicates: true, excludeBrokenReferences: true, excludeBrokenMedia: true, excludeLegacyShadow: true, excludeLowTrust: true, minQualityScore: 40 },
  { surface: "carousels", excludeQuarantined: true, excludeInvalid: true, excludeDuplicates: true, excludeBrokenReferences: true, excludeBrokenMedia: true, excludeLegacyShadow: true, excludeLowTrust: true, minQualityScore: 50 },
  { surface: "featured_sections", excludeQuarantined: true, excludeInvalid: true, excludeDuplicates: true, excludeBrokenReferences: true, excludeBrokenMedia: true, excludeLegacyShadow: true, excludeLowTrust: true, minQualityScore: 60 },
  { surface: "category_pages", excludeQuarantined: true, excludeInvalid: true, excludeDuplicates: true, excludeBrokenReferences: true, excludeBrokenMedia: false, excludeLegacyShadow: true, excludeLowTrust: false, minQualityScore: 30 },
  { surface: "search_results", excludeQuarantined: true, excludeInvalid: true, excludeDuplicates: true, excludeBrokenReferences: true, excludeBrokenMedia: false, excludeLegacyShadow: true, excludeLowTrust: false, minQualityScore: 20 },
  { surface: "discovery_cards", excludeQuarantined: true, excludeInvalid: true, excludeDuplicates: true, excludeBrokenReferences: true, excludeBrokenMedia: true, excludeLegacyShadow: true, excludeLowTrust: true, minQualityScore: 50 },
  { surface: "recommendation_feed", excludeQuarantined: true, excludeInvalid: true, excludeDuplicates: true, excludeBrokenReferences: true, excludeBrokenMedia: true, excludeLegacyShadow: true, excludeLowTrust: true, minQualityScore: 60 },
  { surface: "marketplace_listings", excludeQuarantined: true, excludeInvalid: true, excludeDuplicates: true, excludeBrokenReferences: true, excludeBrokenMedia: false, excludeLegacyShadow: true, excludeLowTrust: false, minQualityScore: 30 },
  { surface: "vertical_hubs", excludeQuarantined: true, excludeInvalid: true, excludeDuplicates: true, excludeBrokenReferences: true, excludeBrokenMedia: false, excludeLegacyShadow: true, excludeLowTrust: false, minQualityScore: 30 },
];

export function getSurfaceRules(): readonly SurfaceProtectionRule[] {
  return SURFACE_RULES;
}

export function getRuleForSurface(surface: ProtectedSurface): SurfaceProtectionRule | undefined {
  return SURFACE_RULES.find((r) => r.surface === surface);
}

const suppressedFromSurface = new Set<string>();

export function isSuppressedFromSurface(entityId: string): boolean {
  return suppressedFromSurface.has(entityId);
}

export function resetSurfaceSuppressions(): void {
  suppressedFromSurface.clear();
}

export function shouldShowOnSurface(entityId: string, surface: ProtectedSurface): boolean {
  if (isQuarantined(entityId)) return false;
  if (suppressedFromSurface.has(entityId)) return false;

  const rule = getRuleForSurface(surface);
  if (!rule) return true;

  const visibility = getEntitySurfaceVisibility(entityId);
  if (visibility === "quarantined" || visibility === "excluded") return false;

  if (rule.minQualityScore) {
    const score = getEntityQualityScore(entityId);
    if (score < rule.minQualityScore) return false;
  }

  return true;
}

export class LiveSurfaceSanitizerEngine extends DataQualityEngine {
  constructor() {
    super("LiveSurfaceSanitizerEngine", "Protect dashboard, stories, feeds, cards, carousels, category pages, and discovery/search surfaces from bad data", { priority: 5 });
  }

  scan(_mode: ExecutionMode): EntityFinding[] {
    const allFindings = engineRegistry.getAllFindings();
    const surfaceViolations: EntityFinding[] = [];

    for (const f of allFindings) {
      const shouldSuppress =
        f.classification === "INVALID" ||
        f.classification === "CROSS_VERTICAL_CONTAMINATION" ||
        f.classification === "BROKEN_MEDIA" ||
        f.classification === "BROKEN_REFERENCE" ||
        f.classification === "ORPHAN" ||
        f.classification === "LEGACY_SHADOW" ||
        f.classification === "DUPLICATE" ||
        f.classification === "QUARANTINED";

      if (shouldSuppress) {
        surfaceViolations.push({
          ...f,
          decisionTier: "SUPPRESS_FROM_SURFACE",
          surfaceVisibility: "suppressed",
        });
      }
    }

    return surfaceViolations;
  }

  classify(findings: EntityFinding[]): EntityFinding[] {
    return findings;
  }

  remediate(findings: EntityFinding[], mode: ExecutionMode): RemediationEntry[] {
    if (mode === "DRY_RUN") return [];
    const remediations: RemediationEntry[] = [];
    const now = new Date().toISOString();

    for (const f of findings) {
      suppressedFromSurface.add(f.entityId);
      remediations.push({
        entityId: f.entityId,
        source: f.source,
        action: "suppressed",
        beforeState: "visible",
        afterState: "suppressed_from_all_surfaces",
        reason: `Surface protection: ${f.classification} — ${f.issues.map((i) => i.code).join(", ")}`,
        confidence: "high",
        timestamp: now,
        engineName: this.name,
        decisionTier: "SUPPRESS_FROM_SURFACE",
      });
    }

    return remediations;
  }
}
