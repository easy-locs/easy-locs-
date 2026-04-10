import type { Vertical } from "@/lib/taxonomy/world-class-taxonomy";

export interface VerticalMatch {
  vertical: Vertical;
  confidence: number;
  matchedToken: string;
}

const VERTICAL_KEYWORDS: Record<Vertical, string[]> = {
  food: ["restaurant", "café", "cafe", "bakery", "boulangerie", "fast food", "pizza", "sushi", "grill", "bistro", "shawarma", "burger", "chicken"],
  grocery: ["supermarket", "market", "grocery", "épicerie", "minimarket", "provisions", "organic"],
  shops: ["shop", "store", "boutique", "mall", "fashion", "clothing", "electronics", "jewelry", "perfume"],
  services: ["garage", "mechanic", "plumber", "electrician", "repair", "cleaning", "laundry", "salon", "spa", "barber", "handyman"],
  property: ["apartment", "villa", "townhouse", "penthouse", "property", "real estate", "buy", "rent", "lease", "for sale", "off-plan", "offplan", "developer", "warehouse", "land", "commercial space", "office space"],
  stay: ["hotel", "resort", "hostel", "motel", "check-in", "check-out", "booking", "room", "per night", "holiday rental", "serviced apartment", "short stay", "vacation rental"],
  healthcare: ["pharmacy", "clinic", "hospital", "doctor", "dentist", "laboratory", "optician"],
  mobility: ["delivery", "courier", "transport", "taxi", "car", "moto", "vehicle", "moving"],
  experiences: ["cinema", "theater", "club", "bar", "lounge", "museum", "tour", "activity", "event", "flight"],
};

export function classifyVertical(query: string): VerticalMatch | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  let bestMatch: VerticalMatch | null = null;

  for (const [vertical, keywords] of Object.entries(VERTICAL_KEYWORDS)) {
    for (const kw of keywords) {
      if (q.includes(kw)) {
        const confidence = kw.length / Math.max(q.length, 1);
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            vertical: vertical as Vertical,
            confidence: Math.min(confidence + 0.4, 1),
            matchedToken: kw,
          };
        }
      }
    }
  }

  return bestMatch;
}
