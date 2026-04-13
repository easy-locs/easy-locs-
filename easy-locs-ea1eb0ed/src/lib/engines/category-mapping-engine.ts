/**
 * Category Mapping Engine
 * Batch-remaps entities from raw/legacy categories to canonical taxonomy paths.
 * Uses canonical-registry and mapping-engine under the hood.
 */
import { mapRawToCanonical } from "@/services/canonical/mapping-engine";

export interface CategoryMappingInput {
  name: string;
  category?: string | null;
  subcategory?: string | null;
  description?: string | null;
  address?: string | null;
}

export interface CategoryMappingOutput {
  canonicalPath: string;
  vertical: string;
  category: string;
  subcategory: string | null;
  confidenceScore: number;
  reviewRequired: boolean;
  confidenceBand: "high" | "medium" | "low" | "rejected";
  ambiguityFlags: string[];
}

export interface MappingResult {
  status: "ok" | "partial" | "error";
  results: Array<{ input: CategoryMappingInput; output: CategoryMappingOutput | null; error?: string }>;
  mapped: number;
  skipped: number;
  durationMs: number;
}

function mapSingle(input: CategoryMappingInput): CategoryMappingOutput | null {
  const m = mapRawToCanonical(
    input.name,
    input.category ?? null,
    input.subcategory ?? null,
    input.description ?? null,
    input.address ?? null,
  );

  if (!m || m.confidenceBand === "rejected") return null;

  return {
    canonicalPath: m.canonicalPath,
    vertical: m.vertical,
    category: m.category,
    subcategory: m.canonicalSubtype ?? m.canonicalType ?? null,
    confidenceScore: m.confidenceScore,
    reviewRequired: m.reviewRequired,
    confidenceBand: m.confidenceBand as "high" | "medium" | "low" | "rejected",
    ambiguityFlags: m.ambiguityFlags,
  };
}

export async function runCategoryMapping(
  inputs: CategoryMappingInput[],
  minConfidence = 0.3,
): Promise<MappingResult> {
  const start = Date.now();
  const results: MappingResult["results"] = [];
  let mapped = 0;
  let skipped = 0;

  for (const input of inputs) {
    try {
      const output = mapSingle(input);
      if (output && output.confidenceScore >= minConfidence) {
        results.push({ input, output });
        mapped++;
      } else {
        results.push({ input, output: null });
        skipped++;
      }
    } catch (err) {
      results.push({ input, output: null, error: err instanceof Error ? err.message : String(err) });
      skipped++;
    }
  }

  return {
    status: skipped === 0 ? "ok" : mapped > 0 ? "partial" : "error",
    results,
    mapped,
    skipped,
    durationMs: Date.now() - start,
  };
}

export async function runCategoryMappingSync(
  inputs: CategoryMappingInput[],
  minConfidence = 0.3,
): Promise<MappingResult> {
  return runCategoryMapping(inputs, minConfidence);
}
