/**
 * input.query.classify — Classifies the raw input intent.
 * ONE thing: determine if input is URL import, name search, phone lookup, or ambiguous.
 */
import type { QueryClassification, QueryIntent } from "../contracts";
import type { Vertical } from "../../types";

const VERTICAL_SIGNALS: Record<string, Vertical> = {
  restaurant: "food", pizza: "food", burger: "food", sushi: "food", cafe: "food",
  bakery: "food", coffee: "food", shawarma: "food", biryani: "food",
  hotel: "hotel", resort: "hotel", hostel: "hotel", motel: "hotel",
  salon: "services", spa: "services", clinic: "services", gym: "services",
  grocery: "grocery", supermarket: "grocery", minimart: "grocery",
  property: "property", villa: "property", apartment: "property",
};

const CITY_SIGNALS: Record<string, string> = {
  dubai: "Dubai", "abu dhabi": "Abu Dhabi", sharjah: "Sharjah",
  riyadh: "Riyadh", jeddah: "Jeddah", paris: "Paris",
  london: "London", cairo: "Cairo", casablanca: "Casablanca",
  istanbul: "Istanbul", doha: "Doha", muscat: "Muscat",
  kuwait: "Kuwait City", bahrain: "Manama", amman: "Amman",
};

const COUNTRY_SIGNALS: Record<string, string> = {
  uae: "AE", emirates: "AE", dubai: "AE",
  ksa: "SA", "saudi arabia": "SA", saudi: "SA",
  france: "FR", uk: "GB", egypt: "EG",
  morocco: "MA", turkey: "TR", qatar: "QA",
  oman: "OM", kuwait: "KW", bahrain: "BH", jordan: "JO",
};

export function classifyQuery(raw: string, hintVertical?: Vertical): QueryClassification {
  const q = raw.trim().toLowerCase();

  // Intent detection
  let intent: QueryIntent = "ambiguous";
  let confidence = 0.3;

  if (/^https?:\/\//i.test(raw) || /\.[a-z]{2,}(\/|$)/i.test(q)) {
    intent = "url_import";
    confidence = 0.95;
  } else if (/^\+?\d[\d\s()-]{7,}$/.test(q)) {
    intent = "phone_lookup";
    confidence = 0.9;
  } else if (q.length > 2) {
    intent = "name_search";
    confidence = 0.7;
  }

  // Vertical detection from text
  let detectedVertical: Vertical | null = hintVertical ?? null;
  if (!detectedVertical) {
    for (const [signal, v] of Object.entries(VERTICAL_SIGNALS)) {
      if (q.includes(signal)) { detectedVertical = v; break; }
    }
  }

  // City detection
  let detectedCity: string | null = null;
  for (const [signal, city] of Object.entries(CITY_SIGNALS)) {
    if (q.includes(signal)) { detectedCity = city; break; }
  }

  // Country detection
  let detectedCountry: string | null = null;
  for (const [signal, code] of Object.entries(COUNTRY_SIGNALS)) {
    if (q.includes(signal)) { detectedCountry = code; break; }
  }

  // Language hint from script
  let languageHint: string | null = null;
  if (/[\u0600-\u06FF]/.test(raw)) languageHint = "ar";
  else if (/[\u00C0-\u017F]/.test(raw)) languageHint = "fr";
  else languageHint = "en";

  return {
    intent,
    confidence,
    detectedVertical,
    detectedCity,
    detectedCountry,
    languageHint,
  };
}
