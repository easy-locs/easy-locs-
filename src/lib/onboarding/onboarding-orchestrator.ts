/**
 * Onboarding Orchestrator — Master pipeline coordinator.
 * Runs the full vertical-aware multi-source onboarding sequence.
 */
import { getPolicy } from "./source-policy.engine";
import { CONNECTOR_REGISTRY } from "./connectors/index";
import { groupEntities } from "./entity-resolution.engine";
import { mergeEntityRecords } from "./field-merge.engine";
import { fillMissingWithWebFallback } from "./web-fallback.engine";
import { scoreOnboardingQuality } from "./onboarding-quality.engine";
import { evaluatePublishGate } from "./publish-gate.engine";
import type {
  CanonicalOnboardingRecord,
  SourceEntityRecord,
  Vertical,
} from "./types";

export interface OnboardingRequest {
  vertical: Vertical;
  name?: string;
  city?: string;
  district?: string;
  country?: string;
  website?: string;
  phone?: string;
  query?: string;
}

export interface OnboardingPipelineResult {
  canonical: CanonicalOnboardingRecord[];
  publish: Array<{
    entityId: string;
    allowed: boolean;
    targetVisibility: "draft" | "public";
    reasons: string[];
    qualityScore: number;
  }>;
}

export async function runOnboardingPipeline(
  input: OnboardingRequest,
): Promise<OnboardingPipelineResult> {
  const policy = getPolicy(input.vertical);

  const primaryConnectors = CONNECTOR_REGISTRY.filter((c) =>
    (policy.allowedSources as string[]).includes(c.source),
  );

  const rawRecords: SourceEntityRecord[] = [];

  for (const connector of primaryConnectors) {
    const rows = await connector.search({
      vertical: input.vertical,
      query: input.query,
      name: input.name,
      city: input.city,
      district: input.district,
      country: input.country,
      website: input.website,
      phone: input.phone,
    });
    rawRecords.push(...rows);
  }

  const grouped = groupEntities(rawRecords);
  const canonicalResults: CanonicalOnboardingRecord[] = [];

  for (const group of grouped) {
    const mergedInitial = mergeEntityRecords(input.vertical, group);

    let completedGroup = [...group];

    if (mergedInitial.missingFields.length > 0) {
      const fallbackRows = await fillMissingWithWebFallback(input.vertical, {
        name: mergedInitial.canonicalName,
        city: mergedInitial.city,
        district: mergedInitial.district,
        country: mergedInitial.country,
        website: mergedInitial.website,
        phone: mergedInitial.phone,
      });
      completedGroup = [...completedGroup, ...fallbackRows];
    }

    const mergedFinal = mergeEntityRecords(input.vertical, completedGroup);
    canonicalResults.push(mergedFinal);
  }

  const publish = canonicalResults.map((record) => {
    const quality = scoreOnboardingQuality(record);
    const gate = evaluatePublishGate(record, quality);

    return {
      entityId: record.entityId,
      allowed: gate.allowed,
      targetVisibility: gate.targetVisibility,
      reasons: gate.reasons,
      qualityScore: quality.score,
    };
  });

  return { canonical: canonicalResults, publish };
}
