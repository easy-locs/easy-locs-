export type SearchIntent =
  | "browse"
  | "lookup"
  | "category"
  | "location"
  | "mixed"
  | "buy_intent"
  | "rent_intent"
  | "stay_intent"
  | "project_intent"
  | "food_intent"
  | "grocery_intent"
  | "utility_intent"
  | "taxi_intent"
  | "wallet_intent"
  | "support_intent";

export interface IntentClassification {
  intent: SearchIntent;
  confidence: number;
  signals: string[];
}

const LOCATION_MARKERS = [
  "near", "in", "at", "around", "close to", "nearby", "à", "au", "dans",
  "quartier", "zone", "district", "centre", "center",
];

const CATEGORY_MARKERS = [
  "restaurant", "café", "cafe", "hotel", "shop", "store", "market",
  "pharmacy", "salon", "gym", "bar", "boutique", "supermarket",
  "bakery", "clinic", "spa", "garage", "school",
];

const DOMAIN_INTENT_RULES: { intent: SearchIntent; keywords: string[] }[] = [
  { intent: "buy_intent", keywords: ["buy", "for sale", "purchase", "own", "sale apartment", "sale villa", "buy apartment", "buy villa", "buy townhouse", "buy penthouse"] },
  { intent: "rent_intent", keywords: ["rent", "rental", "lease", "monthly rent", "yearly rent", "furnished", "unfurnished", "rent apartment", "rent villa"] },
  { intent: "project_intent", keywords: ["off-plan", "offplan", "off plan", "developer", "new project", "new launch", "investment property", "developer project"] },
  { intent: "stay_intent", keywords: ["hotel", "resort", "check-in", "check-out", "booking", "per night", "room", "stay", "hostel", "holiday rental", "vacation rental", "serviced apartment"] },
  { intent: "food_intent", keywords: ["pizza", "shawarma", "burger", "sushi", "restaurant", "food", "cafe", "bakery", "bistro", "grill", "lebanese", "indian", "chinese", "thai", "korean"] },
  { intent: "grocery_intent", keywords: ["grocery", "supermarket", "kinder", "tomato", "apple", "fries", "vegetables", "fruits", "organic"] },
  { intent: "utility_intent", keywords: ["atm", "cash withdrawal", "fuel", "petrol", "gas station"] },
  { intent: "taxi_intent", keywords: ["taxi", "ride", "cab", "driver"] },
  { intent: "wallet_intent", keywords: ["send money", "transfer", "pay user", "wallet"] },
  { intent: "support_intent", keywords: ["refund", "help", "support", "dispute", "complaint"] },
];

export function classifyIntent(query: string): IntentClassification {
  const q = query.trim().toLowerCase();

  if (!q) return { intent: "browse", confidence: 1, signals: ["empty_query"] };

  const signals: string[] = [];
  let locationScore = 0;
  let categoryScore = 0;

  for (const rule of DOMAIN_INTENT_RULES) {
    for (const kw of rule.keywords) {
      if (q.includes(kw)) {
        signals.push(`domain:${kw}`);
        return {
          intent: rule.intent,
          confidence: Math.min(0.7 + (kw.length / q.length) * 0.3, 1),
          signals: [...signals, `matched:${rule.intent}`],
        };
      }
    }
  }

  for (const marker of LOCATION_MARKERS) {
    if (q.includes(marker)) {
      locationScore++;
      signals.push(`loc:${marker}`);
    }
  }

  for (const marker of CATEGORY_MARKERS) {
    if (q.includes(marker)) {
      categoryScore++;
      signals.push(`cat:${marker}`);
    }
  }

  if (locationScore > 0 && categoryScore > 0) {
    return { intent: "mixed", confidence: 0.8, signals };
  }
  if (locationScore > 0) {
    return { intent: "location", confidence: 0.7 + Math.min(locationScore * 0.1, 0.3), signals };
  }
  if (categoryScore > 0) {
    return { intent: "category", confidence: 0.7 + Math.min(categoryScore * 0.1, 0.3), signals };
  }

  return { intent: "lookup", confidence: 0.5, signals: ["no_markers"] };
}
