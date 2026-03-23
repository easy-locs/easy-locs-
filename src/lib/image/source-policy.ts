/**
 * Source Policy Layer
 * Controls how imported media/data is displayed based on source rules.
 */

export type SourcePolicy = {
  /** Whether attribution must be shown to users */
  requiresAttribution: boolean;
  /** Attribution text if required */
  attributionText?: string;
  /** Whether media from this source is safe for primary display */
  mediaSafeForDisplay: boolean;
  /** Whether data can be used as-is or needs verification */
  dataReliability: "trusted" | "verify" | "untrusted";
  /** Display label (never shows "scraped") */
  displayLabel: string;
};

const SOURCE_POLICIES: Record<string, SourcePolicy> = {
  onboarding: {
    requiresAttribution: false,
    mediaSafeForDisplay: true,
    dataReliability: "trusted",
    displayLabel: "Verified owner",
  },
  manual: {
    requiresAttribution: false,
    mediaSafeForDisplay: true,
    dataReliability: "trusted",
    displayLabel: "Verified",
  },
  internal_seed: {
    requiresAttribution: false,
    mediaSafeForDisplay: true,
    dataReliability: "trusted",
    displayLabel: "Platform verified",
  },
  google: {
    requiresAttribution: true,
    attributionText: "Business information from Google",
    mediaSafeForDisplay: false, // Google images not safe for primary cover
    dataReliability: "verify",
    displayLabel: "Business listing",
  },
  aggregator: {
    requiresAttribution: false,
    mediaSafeForDisplay: false,
    dataReliability: "untrusted",
    displayLabel: "Imported listing",
  },
  import_ai: {
    requiresAttribution: false,
    mediaSafeForDisplay: true, // AI-generated images are ours
    dataReliability: "verify",
    displayLabel: "AI-enhanced",
  },
  system: {
    requiresAttribution: false,
    mediaSafeForDisplay: true,
    dataReliability: "trusted",
    displayLabel: "",
  },
};

/**
 * Get display policy for a given source type.
 */
export function getSourcePolicy(sourceType?: string | null): SourcePolicy {
  return SOURCE_POLICIES[sourceType || "system"] || SOURCE_POLICIES.system;
}

/**
 * Check if imported photo is safe for primary display (cover).
 */
export function isMediaSafeForCover(sourceType?: string | null): boolean {
  return getSourcePolicy(sourceType).mediaSafeForDisplay;
}

/**
 * Get attribution text if required by source policy.
 * Returns null if no attribution needed.
 */
export function getRequiredAttribution(sourceType?: string | null): string | null {
  const policy = getSourcePolicy(sourceType);
  return policy.requiresAttribution ? (policy.attributionText || null) : null;
}
