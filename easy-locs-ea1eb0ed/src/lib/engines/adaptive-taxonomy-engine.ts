/**
 * Adaptive Taxonomy Engine
 * Classifies raw entities into canonical paths using the classification engine.
 * Routes through: classification-engine → canonical-registry → canonical path
 */
import { classifyBusiness, type ClassificationInput, type ClassificationResult } from "@/lib/taxonomy/classification-engine";
import { mapRawToCanonical, type MappingResult } from "@/services/canonical/mapping-engine";

export interface AdaptiveTaxonomyInput {
  name: string;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  address?: string | null;
  tags?: string[] | null;
}

export interface AdaptiveTaxonomyOutput {
  canonicalPath: string;
  vertical: string;
  category: string;
  subcategory: string | null;
  confidenceScore: number;
  reviewRequired: boolean;
  source: "alias" | "inference" | "classification" | "fallback";
}

export interface AdaptiveTaxonomyBatchResult {
  status: "ok" | "partial" | "error";
  results: Array<{ input: AdaptiveTaxonomyInput; output: AdaptiveTaxonomyOutput | null; error?: string }>;
  classified: number;
  skipped: number;
  durationMs: number;
}

function mappingToOutput(m: MappingResult): AdaptiveTaxonomyOutput {
  return {
    canonicalPath: m.canonicalPath,
    vertical: m.vertical,
    category: m.category,
    subcategory: m.canonicalSubtype ?? m.canonicalType ?? null,
    confidenceScore: m.confidenceScore,
    reviewRequired: m.reviewRequired,
    source: m.ambiguityFlags.length === 0 ? "alias" : "inference",
  };
}

function classificationToOutput(c: ClassificationResult): AdaptiveTaxonomyOutput {
  const path = [
    c.canonical_vertical,
    c.canonical_cluster ?? "general",
    c.canonical_subcategory ?? "unknown",
  ].filter(Boolean).join(".");

  return {
    canonicalPath: path,
    vertical: c.canonical_vertical,
    category: c.canonical_cluster ?? "general",
    subcategory: c.canonical_subcategory,
    confidenceScore: c.confidence_score / 100,
    reviewRequired: c.requires_review,
    source: "classification",
  };
}

export async function classifySingleEntity(input: AdaptiveTaxonomyInput): Promise<AdaptiveTaxonomyOutput | null> {
  try {
    const mapping = mapRawToCanonical(
      input.name,
      input.category ?? null,
      input.subcategory ?? null,
      input.description ?? null,
      input.address ?? null,
    );

    if (mapping && mapping.confidenceBand !== "rejected") {
      return mappingToOutput(mapping);
    }
  } catch {}

  try {
    const classInput: ClassificationInput = {
      businessName: input.name,
      sourceCategory: input.category,
      sourceSubcategory: input.subcategory,
      description: input.description,
      tags: input.tags,
      address: input.address,
    };
    const classification = classifyBusiness(classInput);
    if (classification && classification.confidence_score >= 30) {
      return classificationToOutput(classification);
    }
  } catch {}

  return null;
}

export async function runAdaptiveTaxonomy(
  inputs: AdaptiveTaxonomyInput[],
): Promise<AdaptiveTaxonomyBatchResult> {
  const start = Date.now();
  const results: AdaptiveTaxonomyBatchResult["results"] = [];
  let classified = 0;
  let skipped = 0;

  for (const input of inputs) {
    try {
      const output = await classifySingleEntity(input);
      results.push({ input, output });
      if (output) classified++;
      else skipped++;
    } catch (err) {
      results.push({ input, output: null, error: err instanceof Error ? err.message : String(err) });
      skipped++;
    }
  }

  return {
    status: skipped === 0 ? "ok" : classified > 0 ? "partial" : "error",
    results,
    classified,
    skipped,
    durationMs: Date.now() - start,
  };
}

export async function runAdaptiveTaxonomyEngine(
  inputs: AdaptiveTaxonomyInput[],
): Promise<AdaptiveTaxonomyBatchResult> {
  return runAdaptiveTaxonomy(inputs);
}
