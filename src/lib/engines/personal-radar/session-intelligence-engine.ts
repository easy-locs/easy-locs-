/**
 * Session Intelligence Engine — Detects user intent from current session behavior.
 */

export type SessionIntent =
  | "food_hunt"
  | "stay_hunt"
  | "quick_utility"
  | "nightlife_explore"
  | "transport_need"
  | "daily_services"
  | "tourist_discovery"
  | "shopping"
  | "general_browse";

interface SessionSignal {
  category?: string;
  action: string; // click, search, view, filter
  timestamp: number;
}

const SESSION_SIGNALS: SessionSignal[] = [];

export function pushSessionSignal(signal: SessionSignal) {
  SESSION_SIGNALS.push(signal);
  if (SESSION_SIGNALS.length > 100) SESSION_SIGNALS.shift();
}

export function clearSession() {
  SESSION_SIGNALS.length = 0;
}

/** Detect dominant intent from session signals */
export function detectSessionIntent(): { intent: SessionIntent; confidence: number } {
  if (SESSION_SIGNALS.length < 2) {
    return { intent: "general_browse", confidence: 30 };
  }

  const catCounts: Record<string, number> = {};
  for (const s of SESSION_SIGNALS) {
    if (s.category) {
      catCounts[s.category] = (catCounts[s.category] || 0) + 1;
    }
  }

  const total = SESSION_SIGNALS.length;
  const sorted = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];

  if (!top) return { intent: "general_browse", confidence: 40 };

  const [topCat, topCount] = top;
  const dominance = topCount / total;

  // Map categories to intents
  const foodCats = ["restaurant", "cafe", "fast_food", "food", "bakery", "kebab", "pizza", "burger", "sushi"];
  const stayCats = ["hotel", "hostel", "resort", "apartment", "rental"];
  const nightCats = ["bar", "club", "lounge", "nightclub"];
  const transportCats = ["taxi", "bus", "metro", "car_rental"];
  const utilityCats = ["atm", "pharmacy", "bank", "exchange", "post"];
  const shopCats = ["shop", "mall", "market", "store", "boutique"];

  let intent: SessionIntent = "general_browse";

  if (foodCats.includes(topCat)) intent = "food_hunt";
  else if (stayCats.includes(topCat)) intent = "stay_hunt";
  else if (nightCats.includes(topCat)) intent = "nightlife_explore";
  else if (transportCats.includes(topCat)) intent = "transport_need";
  else if (utilityCats.includes(topCat)) intent = "quick_utility";
  else if (shopCats.includes(topCat)) intent = "shopping";

  return {
    intent,
    confidence: Math.min(95, Math.round(dominance * 100 + 20)),
  };
}

/** Get intent badge label */
export function getIntentBadge(intent: SessionIntent): { label: string; emoji: string } {
  const map: Record<SessionIntent, { label: string; emoji: string }> = {
    food_hunt: { label: "Hungry now", emoji: "🍽️" },
    stay_hunt: { label: "Looking for stay", emoji: "🏨" },
    quick_utility: { label: "Need service", emoji: "🏧" },
    nightlife_explore: { label: "Night out", emoji: "🌙" },
    transport_need: { label: "Need transport", emoji: "🚕" },
    daily_services: { label: "Daily errands", emoji: "🛒" },
    tourist_discovery: { label: "Exploring", emoji: "📸" },
    shopping: { label: "Shopping mode", emoji: "🛍️" },
    general_browse: { label: "Browsing", emoji: "👀" },
  };
  return map[intent];
}
