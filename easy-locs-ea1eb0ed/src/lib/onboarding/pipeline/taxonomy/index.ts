/**
 * Taxonomy Layer barrel.
 * Uses LLM-powered classification as primary engine with rule-based fallback.
 */
import type { TaxonomyLayerOutput } from "../contracts";
import type { Vertical } from "../../types";
import { inferVertical } from "./taxonomy.vertical.infer";
import { mapCategory } from "./taxonomy.category.map";

export { inferVertical } from "./taxonomy.vertical.infer";
export { mapCategory } from "./taxonomy.category.map";

export function runTaxonomyLayer(params: {
  hintVertical: Vertical;
  text: string;
  categories: string[];
  subcategories: string[];
  menuCount: number;
  roomCount: number;
  serviceCount: number;
  productCount: number;
  businessName?: string;
  description?: string;
}): TaxonomyLayerOutput {
  const inference = inferVertical(
    params.text,
    params.categories,
    params.menuCount,
    params.roomCount,
    params.serviceCount,
    params.productCount,
  );

  const vertical = inference.confidence > 0.6 ? inference.vertical : params.hintVertical;
  const mapping = mapCategory(vertical, params.categories, params.subcategories);

  return { inference, mapping };
}

/**
 * Async LLM-first taxonomy layer.
 * Architecture: LLM is PRIMARY, rule-based is FALLBACK.
 * 1. If businessName is known, tries the LLM classifier via Edge Function.
 * 2. If LLM succeeds AND returns a confident result (≥ 50%), uses LLM output.
 * 3. Falls back to synchronous rule-based runTaxonomyLayer only when LLM is
 *    unavailable, times out, or returns a non-confident result.
 */
export async function runTaxonomyLayerWithLLM(params: {
  hintVertical: Vertical;
  text: string;
  categories: string[];
  subcategories: string[];
  menuCount: number;
  roomCount: number;
  serviceCount: number;
  productCount: number;
  businessName?: string;
  description?: string;
  address?: string;
}): Promise<TaxonomyLayerOutput> {
  if (params.businessName) {
    try {
      const { classifyBusinessWithLLM } = await import("@/lib/taxonomy/classification-engine");
      const llmResult = await classifyBusinessWithLLM({
        businessName: params.businessName,
        sourceCategory: params.categories[0] ?? null,
        sourceSubcategory: params.subcategories[0] ?? null,
        description: params.description ?? null,
        address: params.address ?? null,
        useLLM: true,
      });

      const llmConfidence = llmResult.confidence_score / 100;

      if (llmConfidence >= 0.5) {
        // Run mapping so that the boundary guard and cluster validation can
        // evaluate the LLM-proposed subcategory. The guarded mapping.confidence
        // is the authoritative value — do NOT overwrite it with raw llmConfidence.
        // If the LLM returns an unknown subcategory, guardSubcategory will cap
        // mapping.confidence at ≤ 0.35, keeping the entity below the publish gate.
        const mapping = mapCategory(
          llmResult.canonical_vertical,
          params.categories,
          llmResult.canonical_subcategory
            ? [llmResult.canonical_subcategory, ...params.subcategories]
            : params.subcategories,
        );

        // mapping.subcategory is already the guarded result — mapCategory ran the LLM
        // subcategory through guardSubcategory (we prepended it to the subcategories
        // array above). Do NOT overwrite with the raw LLM value; that would bypass
        // the boundary guard and let unknown subcategories leak through as raw keys.
        return {
          inference: {
            vertical: llmResult.canonical_vertical,
            confidence: llmConfidence,
            signals: llmResult.source_signals_used,
          },
          mapping: {
            ...mapping,
            // Use guarded value only — raw LLM subcategory is rejected here if unknown.
            subcategory: mapping.subcategory,
            // Keep guarded confidence — do NOT use raw llmConfidence here.
            confidence: mapping.confidence,
          },
        };
      }
    } catch {
      // LLM unavailable — fall through to rule-based
    }
  }

  return runTaxonomyLayer(params);
}
