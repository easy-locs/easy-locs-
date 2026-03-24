/**
 * Source Priority Engine
 * Defines trusted sources per vertical with confidence scores.
 * Extends existing source-hygiene.ts — no duplication.
 */

// ── Trusted sources per vertical ──

export interface TrustedSource {
  key: string;
  label: string;
  confidence: number;
  parser: string; // parser module key
}

const FOOD_SOURCES: TrustedSource[] = [
  { key: "deliveroo", label: "Deliveroo", confidence: 95, parser: "deliveroo" },
  { key: "talabat", label: "Talabat", confidence: 90, parser: "talabat" },
  { key: "careem", label: "Careem", confidence: 90, parser: "careem" },
  { key: "zomato", label: "Zomato", confidence: 85, parser: "zomato" },
  { key: "google_maps", label: "Google Maps", confidence: 80, parser: "google" },
  { key: "manual", label: "Manual Entry", confidence: 100, parser: "manual" },
  { key: "onboarding", label: "Owner Onboarded", confidence: 100, parser: "manual" },
];

const HOTEL_SOURCES: TrustedSource[] = [
  { key: "booking", label: "Booking.com", confidence: 95, parser: "booking" },
  { key: "agoda", label: "Agoda", confidence: 90, parser: "agoda" },
  { key: "expedia", label: "Expedia", confidence: 90, parser: "expedia" },
  { key: "google_maps", label: "Google Maps", confidence: 80, parser: "google" },
  { key: "manual", label: "Manual Entry", confidence: 100, parser: "manual" },
  { key: "onboarding", label: "Owner Onboarded", confidence: 100, parser: "manual" },
];

const SERVICE_SOURCES: TrustedSource[] = [
  { key: "google_maps", label: "Google Maps", confidence: 85, parser: "google" },
  { key: "google_business", label: "Google Business", confidence: 85, parser: "google" },
  { key: "yelp", label: "Yelp", confidence: 75, parser: "yelp" },
  { key: "manual", label: "Manual Entry", confidence: 100, parser: "manual" },
  { key: "onboarding", label: "Owner Onboarded", confidence: 100, parser: "manual" },
];

const GENERIC_SOURCES: TrustedSource[] = [
  { key: "google_maps", label: "Google Maps", confidence: 80, parser: "google" },
  { key: "manual", label: "Manual Entry", confidence: 100, parser: "manual" },
  { key: "onboarding", label: "Owner Onboarded", confidence: 100, parser: "manual" },
  { key: "import_ai", label: "AI Import", confidence: 60, parser: "generic" },
  { key: "aggregator", label: "Aggregator", confidence: 50, parser: "generic" },
];

const VERTICAL_SOURCES: Record<string, TrustedSource[]> = {
  food: FOOD_SOURCES,
  grocery: [...FOOD_SOURCES.filter(s => ["deliveroo", "talabat", "careem", "google_maps", "manual", "onboarding"].includes(s.key))],
  property: HOTEL_SOURCES,
  services: SERVICE_SOURCES,
  healthcare: SERVICE_SOURCES,
  shops: GENERIC_SOURCES,
  mobility: GENERIC_SOURCES,
  experiences: HOTEL_SOURCES,
};

// ── Minimum confidence threshold ──
const MIN_CONFIDENCE_THRESHOLD = 50;

/**
 * Get trusted sources for a vertical, sorted by confidence descending.
 */
export function getTrustedSources(vertical: string): TrustedSource[] {
  return (VERTICAL_SOURCES[vertical] || GENERIC_SOURCES)
    .slice()
    .sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get confidence score for a source within a vertical.
 * Returns 0 if source is unknown for this vertical.
 */
export function getSourceConfidence(vertical: string, sourceKey: string): number {
  const sources = VERTICAL_SOURCES[vertical] || GENERIC_SOURCES;
  const found = sources.find(s => s.key === sourceKey);
  return found?.confidence ?? 0;
}

/**
 * Check if a source is trusted enough for a given vertical.
 */
export function isSourceTrusted(vertical: string, sourceKey: string): boolean {
  return getSourceConfidence(vertical, sourceKey) >= MIN_CONFIDENCE_THRESHOLD;
}

/**
 * Validate source before ingestion. Returns rejection reason or null if OK.
 */
export function validateSource(vertical: string, sourceKey: string): { accepted: boolean; confidence: number; reason: string | null } {
  const confidence = getSourceConfidence(vertical, sourceKey);
  
  if (confidence === 0) {
    return { accepted: false, confidence: 0, reason: `Unknown source "${sourceKey}" for vertical "${vertical}"` };
  }
  
  if (confidence < MIN_CONFIDENCE_THRESHOLD) {
    return { accepted: false, confidence, reason: `Source "${sourceKey}" confidence ${confidence} below threshold ${MIN_CONFIDENCE_THRESHOLD}` };
  }
  
  return { accepted: true, confidence, reason: null };
}

/**
 * Get the parser key for a source within a vertical.
 */
export function getParserKey(vertical: string, sourceKey: string): string | null {
  const sources = VERTICAL_SOURCES[vertical] || GENERIC_SOURCES;
  return sources.find(s => s.key === sourceKey)?.parser ?? null;
}

/**
 * Pick best source from multiple available sources for a vertical.
 */
export function pickBestSource(vertical: string, availableSources: string[]): string | null {
  const ranked = getTrustedSources(vertical);
  for (const source of ranked) {
    if (availableSources.includes(source.key)) return source.key;
  }
  return null;
}
