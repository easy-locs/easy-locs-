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
  items: any[]
): NormalizationResult[] {
  return items.map(item => normalizeFromSource(sourceKey, vertical, item));
}
