/**
 * Vertical Classifier Engine — DEPRECATED FACADE.
 * ================================================
 * Delegates to the canonical classifier at src/lib/import-engine/classifier.
 * DO NOT add logic here. Import from "@/lib/import-engine" directly.
 */
import { classifyVertical as canonicalClassify, type ClassificationInput, type ClassificationResult } from "@/lib/import-engine";
import type { OnboardingVertical } from "./source-policy.engine";

export interface VerticalClassificationInput {
  businessName: string;
  sourceCategory?: string | null;
  sourceType?: string | null;
  tags?: string[];
  url?: string | null;
}

export interface VerticalClassificationResult {
  vertical: OnboardingVertical;
  confidence: number;
  reason: string;
}

export function classifyVertical(input: VerticalClassificationInput): VerticalClassificationResult {
  const result = canonicalClassify({
    businessName: input.businessName,
    sourceCategory: input.sourceCategory,
    sourceType: input.sourceType,
    tags: input.tags,
    url: input.url,
  });
  return {
    vertical: result.vertical as OnboardingVertical,
    confidence: result.confidence,
    reason: result.reason,
  };
}
