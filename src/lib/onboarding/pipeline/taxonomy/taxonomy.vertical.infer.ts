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
  { vertical: "services", label: "service keywords", patterns: [/salon|spa|clinic|gym|fitness|repair|cleaning|laundry|plumber|electrician/i] },
  { vertical: "property", label: "property keywords", patterns: [/property|villa|apartment|real.?estate|rent|lease|bedroom|sqft|sq\.?m/i] },
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
  const scores: Record<Vertical, number> = { food: 0, grocery: 0, hotel: 0, services: 0, property: 0 };

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

  return {
    vertical: bestScore > 0 ? bestVertical : "food",
    confidence,
    signals,
  };
}
