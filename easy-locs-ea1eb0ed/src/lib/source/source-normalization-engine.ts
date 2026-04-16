/**
 * Source Normalization Engine
 * Routes raw data through the correct parser based on source key.
 * Produces canonical format for all downstream engines.
 */
import type { CanonicalShopData } from "./parsers/canonical-format";
import { parseDeliverooData } from "./parsers/deliveroo-parser";
import { parseTalabatData } from "./parsers/talabat-parser";
import { parseCareemData } from "./parsers/careem-parser";
import { parseGoogleData } from "./parsers/google-parser";
import { parseBookingData } from "./parsers/booking-parser";
import { parseGenericData } from "./parsers/generic-parser";
import { validateSource, getSourceConfidence } from "./source-priority-engine";

export interface NormalizationResult {
  accepted: boolean;
  data: CanonicalShopData | null;
  source_key: string;
  confidence: number;
  rejection_reason: string | null;
  warnings: string[];
}

const PARSER_MAP: Record<string, (raw: any) => CanonicalShopData> = {
  deliveroo: parseDeliverooData,
  talabat: parseTalabatData,
  careem: parseCareemData,
  google_maps: parseGoogleData,
  google_business: parseGoogleData,
  google: parseGoogleData,
  booking: parseBookingData,
};

/**
 * Normalize raw data from any source into canonical format.
 * Validates source trust before parsing.
 */
export function normalizeFromSource(
  sourceKey: string,
  vertical: string,
  rawData: any
): NormalizationResult {
  const warnings: string[] = [];

  // 1. Validate source trust
  const validation = validateSource(vertical, sourceKey);
  if (!validation.accepted) {
    return {
      accepted: false,
      data: null,
      source_key: sourceKey,
      confidence: validation.confidence,
      rejection_reason: validation.reason,
      warnings: [],
    };
  }

  // 2. Parse through dedicated parser
  let data: CanonicalShopData;
  try {
    const parser = PARSER_MAP[sourceKey];
    if (parser) {
      data = parser(rawData);
    } else {
      data = parseGenericData(rawData, sourceKey);
      warnings.push(`No dedicated parser for "${sourceKey}", used generic parser`);
    }
  } catch (err: any) {
    return {
      accepted: false,
      data: null,
      source_key: sourceKey,
      confidence: validation.confidence,
      rejection_reason: `Parser error: ${err.message}`,
      warnings: [],
    };
  }

  // 3. Basic validation
  if (!data.name || data.name.trim().length < 2) {
    return {
      accepted: false,
      data: null,
      source_key: sourceKey,
      confidence: validation.confidence,
      rejection_reason: "Missing or invalid entity name",
      warnings,
    };
  }

  // 4. Enrich with confidence
  const confidence = getSourceConfidence(vertical, sourceKey);

  return {
    accepted: true,
    data,
    source_key: sourceKey,
    confidence,
    rejection_reason: null,
    warnings,
  };
}

/**
 * Normalize a batch of items from the same source.
 */
export function normalizeBatch(
  sourceKey: string,
  vertical: string,
  items: unknown[]
): NormalizationResult[] {
  return items.map(item => normalizeFromSource(sourceKey, vertical, item));
}

/**
 * Normalize a batch of records using the data-normalize Web Worker.
 * Offloads field mapping, deduplication, and validation to a background thread.
 * Falls back to synchronous processing if workers are unavailable.
 */
export async function normalizeBatchWorker(
  records: Record<string, unknown>[],
  options: {
    fieldMap: Record<string, string>;
    deduplicateKey?: string;
    requiredFields?: string[];
  }
): Promise<{
  normalized: Record<string, unknown>[];
  invalid: Array<{ record: Record<string, unknown>; missingFields: string[] }>;
  stats: { transformedCount: number; duplicatesRemoved: number };
}> {
  try {
    if (typeof Worker === "undefined") throw new Error("no workers");
    const { getDataNormalizePool } = await import("@/workers/index");
    const pool = getDataNormalizePool();

    const normalizeResult = await pool.exec("normalizeFields", {
      records,
      fieldMap: options.fieldMap,
      trimStrings: true,
      lowercaseKeys: false,
    });

    let deduped = normalizeResult.records;
    let duplicatesRemoved = 0;
    if (options.deduplicateKey) {
      const dedupResult = await pool.exec("deduplicate", {
        records: deduped,
        keyField: options.deduplicateKey,
        strategy: "last",
      });
      deduped = dedupResult.records;
      duplicatesRemoved = dedupResult.duplicatesRemoved;
    }

    let valid = deduped;
    let invalid: Array<{ record: Record<string, unknown>; missingFields: string[] }> = [];
    if (options.requiredFields?.length) {
      const validateResult = await pool.exec("validate", {
        records: deduped,
        requiredFields: options.requiredFields,
      });
      valid = validateResult.valid;
      invalid = validateResult.invalid;
    }

    return {
      normalized: valid,
      invalid,
      stats: {
        transformedCount: normalizeResult.transformedCount,
        duplicatesRemoved,
      },
    };
  } catch {
    return {
      normalized: records,
      invalid: [],
      stats: { transformedCount: 0, duplicatesRemoved: 0 },
    };
  }
}
