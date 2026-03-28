/**
 * output.preview.build — Builds human-readable preview of pipeline results.
 * ONE thing: serialize entities for UI display.
 */
import type { PipelinePreview, AuditTrace, GovernanceLayerOutput, QualityReport } from "../contracts";
import type { CanonicalOnboardingRecord } from "../../types";

export function buildPreview(params: {
  canonical: CanonicalOnboardingRecord[];
  governance: GovernanceLayerOutput[];
  quality: QualityReport[];
  trace: AuditTrace;
}): PipelinePreview {
  return {
    entities: params.canonical.map((entity, i) => ({
      name: entity.canonicalName,
      vertical: entity.vertical,
      address: entity.address,
      city: entity.city,
      country: entity.country,
      qualityScore: params.quality[i]?.globalScore ?? 0,
      publishAllowed: params.governance[i]?.publishDecision.allowed ?? false,
      visibility: params.governance[i]?.visibilityMode ?? "hidden",
      menuCount: entity.menuItems.length,
      roomCount: entity.hotelInventory.length,
      serviceCount: entity.serviceItems.length,
      productCount: 0,
      photoCount: entity.photos.length,
      missingFields: entity.missingFields,
      warnings: params.quality[i]?.warnings ?? [],
    })),
    trace: params.trace,
  };
}
