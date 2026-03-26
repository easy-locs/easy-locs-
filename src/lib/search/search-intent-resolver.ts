/**
 * Search Intent Resolver — Classifies query shape before ranking.
 * Detects: local ambiguous, airport, saved shortcut, explicit foreign, landmark, etc.
 */

export interface SearchIntent {
  type: "local_place" | "airport" | "saved_shortcut" | "landmark" | "explicit_foreign" | "merchant_place" | "generic";
  isExplicitForeign: boolean;
  isAirportQuery: boolean;
  isSavedShortcut: boolean;
  isAmbiguousShort: boolean;
  inferredCountryCode?: string;
}

// Known airport codes/aliases
const AIRPORT_ALIASES: Record<string, string> = {
  dxb: "AE", "dubai airport": "AE", "dubai international": "AE",
  auh: "AE", "abu dhabi airport": "AE",
  shj: "AE", "sharjah airport": "AE",
  jfk: "US", lax: "US", lhr: "GB", cdg: "FR", nrt: "JP",
  sin: "SG", hkg: "HK", bkk: "TH", ist: "TR",
};

// Explicit foreign indicators
const FOREIGN_INDICATORS = [
  "usa", "united states", "new york", "london", "paris", "tokyo",
  "singapore", "california", "texas", "chicago", "los angeles",
  "san francisco", "seattle", "boston", "florida", "germany", "france",
];

// Saved shortcut keywords
const SAVED_SHORTCUTS = ["home", "work", "office", "school", "gym", "maison", "bureau", "travail"];

// Ambiguous short queries that MUST default to local
const AMBIGUOUS_SHORT = [
  "marina", "downtown", "mall", "airport", "tower", "terminal",
  "hotel", "hospital", "station", "market", "park", "beach",
  "mosque", "church", "school", "university", "metro", "bus",
  "port", "harbour", "harbor", "garden", "plaza", "center",
  "centre", "village", "heights", "springs", "hills", "bay",
  "creek", "lake", "island", "gate", "square", "boulevard",
];

export function resolveSearchIntent(query: string, contextType?: string): SearchIntent {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);

  // Airport detection
  const airportKey = Object.keys(AIRPORT_ALIASES).find(k => q.includes(k));
  if (airportKey || q.includes("terminal") || q.includes("airport")) {
    return {
      type: "airport",
      isExplicitForeign: false,
      isAirportQuery: true,
      isSavedShortcut: false,
      isAmbiguousShort: false,
      inferredCountryCode: airportKey ? AIRPORT_ALIASES[airportKey] : undefined,
    };
  }

  // Saved shortcut
  if (SAVED_SHORTCUTS.includes(q)) {
    return {
      type: "saved_shortcut",
      isExplicitForeign: false,
      isAirportQuery: false,
      isSavedShortcut: true,
      isAmbiguousShort: false,
    };
  }

  // Explicit foreign
  const hasForeign = FOREIGN_INDICATORS.some(f => q.includes(f));
  if (hasForeign) {
    return {
      type: "explicit_foreign",
      isExplicitForeign: true,
      isAirportQuery: false,
      isSavedShortcut: false,
      isAmbiguousShort: false,
    };
  }

  // Ambiguous short (local default)
  const isShort = words.length <= 2;
  const matchesAmbiguous = AMBIGUOUS_SHORT.some(a => q.includes(a));
  if (isShort && matchesAmbiguous) {
    return {
      type: "local_place",
      isExplicitForeign: false,
      isAirportQuery: false,
      isSavedShortcut: false,
      isAmbiguousShort: true,
    };
  }

  return {
    type: "generic",
    isExplicitForeign: false,
    isAirportQuery: false,
    isSavedShortcut: false,
    isAmbiguousShort: isShort,
  };
}
