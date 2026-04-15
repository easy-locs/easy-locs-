/**
 * taxonomy.vertical.infer — Infers vertical from available signals.
 * ONE thing: determine business vertical.
 */
import type { TaxonomyInference } from "../contracts";
import type { Vertical } from "../../types";

const SIGNALS: Array<{ patterns: RegExp[]; vertical: Vertical; label: string }> = [
  { vertical: "food", label: "menu keywords", patterns: [/menu|dish|appetizer|main course|dessert|pizza|burger|sushi|shawarma|biryani|cuisine|chef|dine/i] },
  { vertical: "food", label: "restaurant keywords", patterns: [/restaurant|cafe|bakery|bistro|brasserie|grill|kitchen|eatery/i] },
  { vertical: "hotel", label: "hotel keywords", patterns: [/hotel|resort|hostel|suite|room type|check.?in|check.?out|amenities|booking/i] },
  { vertical: "grocery", label: "grocery keywords", patterns: [/grocery|supermarket|minimart|hypermarket|fresh|organic/i] },
  { vertical: "services", label: "service keywords", patterns: [/repair|cleaning|laundry|plumber|electrician|mechanic|handyman/i] },
  { vertical: "property", label: "property keywords", patterns: [/property|villa|apartment|real.?estate|rent|lease|bedroom|sqft|sq\.?m/i] },
  { vertical: "stay", label: "stay keywords", patterns: [/airbnb|vacation.?rental|holiday.?home|guest.?house|lodge|accommodation|bed.?and.?breakfast/i] },
  { vertical: "healthcare", label: "healthcare keywords", patterns: [/hospital|clinic|doctor|physician|dentist|pharmacy|medical|health.?care|diagnostic/i] },
  { vertical: "beauty", label: "beauty keywords", patterns: [/salon|spa|skincare|cosmetics|beauty|nail|hair.?style|massage|facial|waxing/i] },
  { vertical: "shops", label: "shops keywords", patterns: [/boutique|store|mall|fashion|apparel|clothing|accessories|jewel/i] },
  { vertical: "retail", label: "retail keywords", patterns: [/retail|shop|department.?store|outlet|wholesale|merchandise/i] },
  { vertical: "mobility", label: "mobility keywords", patterns: [/taxi|ride|transport|car.?rental|chauffeur|shuttle|limousine|bike.?share|scooter/i] },
  { vertical: "experiences", label: "experiences keywords", patterns: [/tour|activity|adventure|museum|attraction|excursion|safari|theme.?park|sightseeing/i] },
  { vertical: "utility", label: "utility keywords", patterns: [/electricity|water|internet|telecom|broadband|fiber|gas|utility|provider/i] },
  { vertical: "education", label: "education keywords", patterns: [/school|university|training|course|academy|college|tutor|e.?learning|certification/i] },
  { vertical: "finance", label: "finance keywords", patterns: [/bank|insurance|exchange|fintech|loan|mortgage|investment|credit|payment/i] },
  { vertical: "delivery", label: "delivery keywords", patterns: [/courier|logistics|shipping|express|parcel|freight|warehouse|fulfillment/i] },
  { vertical: "events", label: "events keywords", patterns: [/concert|festival|wedding|conference|exhibition|gala|seminar|workshop|trade.?show/i] },
  { vertical: "flight", label: "flight keywords", patterns: [/airline|airport|boarding|ticket|flight|aviation|charter|passenger/i] },
];

export function inferVertical(
  text: string,
  categories: string[],
  menuCount: number,
  roomCount: number,
  serviceCount: number,
  productCount: number,
): TaxonomyInference {
  const combined = [text, ...categories].join(" ");
  const signals: string[] = [];
  const scores: Record<Vertical, number> = {
    food: 0, grocery: 0, hotel: 0, stay: 0, services: 0, property: 0,
    healthcare: 0, beauty: 0, shops: 0, retail: 0, mobility: 0, experiences: 0,
    utility: 0, education: 0, finance: 0, delivery: 0, events: 0, flight: 0,
  };

  for (const s of SIGNALS) {
    for (const p of s.patterns) {
      if (p.test(combined)) {
        scores[s.vertical] += 1;
        signals.push(s.label);
      }
    }
  }

  // Catalog-based scoring
  if (menuCount > 0) { scores.food += 2; signals.push(`${menuCount} menu items`); }
  if (roomCount > 0) { scores.hotel += 2; signals.push(`${roomCount} rooms`); }
  if (serviceCount > 0) { scores.services += 2; signals.push(`${serviceCount} services`); }
  if (productCount > 0) { scores.grocery += 1; signals.push(`${productCount} products`); }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestVertical, bestScore] = sorted[0] as [Vertical, number];
  const totalSignals = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalSignals > 0 ? Math.min(0.95, bestScore / totalSignals + 0.3) : 0.3;

  if (bestScore === 0) {
    return {
      vertical: "services",
      confidence: 0.1,
      signals: ["no_signal_detected"],
    };
  }

  if (bestScore === 1 && totalSignals > 1) {
    return {
      vertical: bestVertical,
      confidence: Math.min(0.4, confidence),
      signals: [...signals, "low_signal_strength"],
    };
  }

  return {
    vertical: bestVertical,
    confidence,
    signals,
  };
}
