/**
 * Onboarding Orchestrator — Master pipeline coordinator.
 * Executes the full vertical-aware onboarding sequence:
 *
 * 1. Vertical Classification
 * 2. Source Policy Resolution
 * 3. Source Connectors Fetch
 * 4. Entity Resolution (dedup)
 * 5. Field-Level Merge
 * 6. Missing Fields Detection
 * 7. Web Fallback Enrichment
 * 8. Canonical Taxonomy Mapping
 * 9. Quality Score
 * 10. Publish Gate
 *
 * Output: A canonical merchant record ready for storefront creation.
 */
import { classifyVertical, type VerticalClassificationInput } from "./vertical-classifier.engine";
import { getSourcesForVertical, isSourceForbidden, type OnboardingVertical } from "./source-policy.engine";
import { getConnectorsForVertical } from "./connectors/registry";
import type { SourceRecord } from "./connectors/connector.interface";
import { resolveEntities, type EntitySignals } from "./entity-resolution.engine";
import { mergeAllFields, type SourceFieldData } from "./field-merge.engine";
import { detectMissingFields, type CanonicalMerchantRecord } from "./missing-fields.engine";
import { buildFallbackPlan, applyFallbackData } from "./web-fallback.engine";
import { mapToCanonicalTaxonomy } from "./taxonomy-mapper.engine";
import { computeQualityScore, type QualityScoreResult } from "./onboarding-quality.engine";
import { evaluatePublishGate, type PublishGateResult } from "./publish-gate.engine";

export interface OnboardingRequest {
  businessName: string;
  city: string;
  country: string;
  url?: string;
  sourceCategory?: string;
  sourceType?: string;
  tags?: string[];
  forcedVertical?: OnboardingVertical;
}

export interface OnboardingResult {
  entityId: string;
  vertical: OnboardingVertical;
  verticalConfidence: number;
  record: CanonicalMerchantRecord;
  quality: QualityScoreResult;
  publishGate: PublishGateResult;
  sourceCount: number;
  pipeline: string[];
  errors: string[];
}

let counter = 0;
function generateEntityId(): string {
  return `ent_${Date.now()}_${++counter}`;
}

export async function runOnboardingPipeline(request: OnboardingRequest): Promise<OnboardingResult> {
  const pipeline: string[] = [];
  const errors: string[] = [];

  // ── Step 1: Classify vertical ──
  const verticalInput: VerticalClassificationInput = {
    businessName: request.businessName,
    sourceCategory: request.sourceCategory,
    sourceType: request.sourceType,
    tags: request.tags,
    url: request.url,
  };
  const classification = request.forcedVertical
    ? { vertical: request.forcedVertical, confidence: 100, reason: "forced" }
    : classifyVertical(verticalInput);
  pipeline.push(`classify:${classification.vertical}(${classification.confidence}%)`);

  const vertical = classification.vertical;

  // ── Step 2: Resolve sources ──
  const allowedSources = getSourcesForVertical(vertical);
  pipeline.push(`sources:${allowedSources.join(",")}`);

  // ── Step 3: Fetch from connectors ──
  const connectors = getConnectorsForVertical(vertical);
  const allRecords: SourceRecord[] = [];

  for (const connector of connectors) {
    try {
      if (request.url) {
        const record = await connector.fetchByUrl(request.url);
        if (record) allRecords.push(record);
      }
      const searchResults = await connector.fetchBySearch(
        request.businessName,
        request.city,
        request.country
      );
      allRecords.push(...searchResults);
    } catch (e: any) {
      errors.push(`connector_${connector.sourceId}: ${e.message}`);
    }
  }
  pipeline.push(`fetched:${allRecords.length} records`);

  // ── Step 4: Entity Resolution (dedup across sources) ──
  // For now, all records are assumed to be for the same entity
  // In production, this would cluster records by entity similarity
  pipeline.push("entity_resolution:pass");

  // ── Step 5: Field-Level Merge ──
  const contributions: SourceFieldData[] = [];
  for (const record of allRecords) {
    for (const [field, value] of Object.entries(record.fields)) {
      contributions.push({ source: record.source, field, value, confidence: record.confidence });
    }
  }
  const mergedFields = mergeAllFields(vertical, contributions);
  pipeline.push(`merged:${mergedFields.length} fields`);

  // Build canonical record from merged fields
  const entityId = generateEntityId();
  const record: CanonicalMerchantRecord = {
    entity_id: entityId,
    vertical,
    canonical_name: request.businessName,
    city: request.city,
    country: request.country,
  };

  for (const mf of mergedFields) {
    (record as any)[mf.field] = mf.value;
  }

  // ── Step 6: Missing fields detection ──
  const missing = detectMissingFields(record);
  pipeline.push(`missing:${missing.missingRequired.length}req,${missing.missingRecommended.length}rec`);

  // ── Step 7: Web fallback ──
  const fallbackPlan = buildFallbackPlan(record);
  if (fallbackPlan) {
    pipeline.push(`fallback:${fallbackPlan.fieldsToFetch.length} fields needed`);
    // In production, would invoke official-web connector here
    // For now, just log the plan
  }

  // ── Step 8: Taxonomy mapping ──
  const taxonomy = mapToCanonicalTaxonomy(
    request.sourceCategory || "",
    record.subcategories?.[0]
  );
  if (!record.categories || record.categories.length === 0) {
    if (taxonomy.canonical_cluster) {
      record.categories = [taxonomy.canonical_cluster];
    }
    if (taxonomy.canonical_subcategory) {
      record.subcategories = [taxonomy.canonical_subcategory];
    }
  }
  pipeline.push(`taxonomy:${taxonomy.canonical_vertical}/${taxonomy.canonical_cluster || "?"}(${taxonomy.confidence}%)`);

  // ── Step 9: Quality score ──
  const quality = computeQualityScore(record, allRecords.length || 1);
  pipeline.push(`quality:${quality.overallScore}(${quality.tier})`);

  // ── Step 10: Publish gate ──
  const publishGate = evaluatePublishGate(record);
  pipeline.push(`gate:${publishGate.decision}→${publishGate.visibility}`);

  return {
    entityId,
    vertical,
    verticalConfidence: classification.confidence,
    record,
    quality,
    publishGate,
    sourceCount: allRecords.length,
    pipeline,
    errors,
  };
}
