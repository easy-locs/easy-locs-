/**
 * Next Best Action Engine — Decides what the radar should propose NOW.
 */
import type { UserContext, DayPart, ZoneType } from "./context-awareness-engine";
import type { UserRadarProfile } from "./personal-profile-engine";

export interface NextAction {
  id: string;
  type: "food" | "stay" | "transport" | "utility" | "nightlife" | "service" | "shopping" | "explore";
  title: string;
  subtitle: string;
  icon: string;
  confidence: number; // 0-100
  reason: string;
  suggestedCategories: string[];
  priority: number;
}

const TIME_ACTIONS: Record<DayPart, NextAction[]> = {
  early_morning: [
    { id: "act-coffee", type: "food", title: "☕ Morning coffee", subtitle: "Start your day right", icon: "coffee", confidence: 90, reason: "Early morning", suggestedCategories: ["cafe", "coffee", "bakery"], priority: 1 },
  ],
  morning: [
    { id: "act-breakfast", type: "food", title: "🥐 Breakfast nearby", subtitle: "Best spots around you", icon: "coffee", confidence: 85, reason: "Morning mealtime", suggestedCategories: ["cafe", "bakery", "breakfast", "brunch"], priority: 1 },
    { id: "act-transport", type: "transport", title: "🚕 Get moving", subtitle: "Taxi & transit nearby", icon: "car", confidence: 60, reason: "Morning commute", suggestedCategories: ["taxi", "bus_stop", "metro"], priority: 3 },
  ],
  lunch: [
    { id: "act-lunch", type: "food", title: "🍽️ Lunch time", subtitle: "Top restaurants nearby", icon: "utensils", confidence: 95, reason: "Lunch hour", suggestedCategories: ["restaurant", "fast_food", "cafe", "food"], priority: 1 },
  ],
  afternoon: [
    { id: "act-explore", type: "explore", title: "✨ Discover nearby", subtitle: "Hidden gems around you", icon: "sparkles", confidence: 70, reason: "Afternoon exploration", suggestedCategories: ["shop", "market", "park", "museum"], priority: 2 },
    { id: "act-coffee2", type: "food", title: "☕ Afternoon pick-up", subtitle: "Coffee & desserts", icon: "coffee", confidence: 75, reason: "Afternoon break", suggestedCategories: ["cafe", "dessert", "bakery"], priority: 1 },
  ],
  evening: [
    { id: "act-dinner", type: "food", title: "🍽️ Dinner spots", subtitle: "Best dining around you", icon: "utensils", confidence: 95, reason: "Dinner time", suggestedCategories: ["restaurant", "fine_dining", "food"], priority: 1 },
    { id: "act-night", type: "nightlife", title: "🌙 Evening vibes", subtitle: "Bars & lounges nearby", icon: "moon", confidence: 65, reason: "Evening out", suggestedCategories: ["bar", "lounge", "rooftop"], priority: 2 },
  ],
  night: [
    { id: "act-nightlife", type: "nightlife", title: "🎉 Where it moves", subtitle: "Active spots tonight", icon: "music", confidence: 85, reason: "Night out", suggestedCategories: ["club", "bar", "lounge", "nightclub"], priority: 1 },
    { id: "act-late-food", type: "food", title: "🌯 Late-night food", subtitle: "Open now nearby", icon: "utensils", confidence: 80, reason: "Late hunger", suggestedCategories: ["fast_food", "kebab", "shawarma", "burger"], priority: 2 },
  ],
  late_night: [
    { id: "act-late-eat", type: "food", title: "🍔 Still hungry?", subtitle: "24h spots nearby", icon: "utensils", confidence: 85, reason: "Late night munchies", suggestedCategories: ["fast_food", "kebab", "24h"], priority: 1 },
    { id: "act-taxi", type: "transport", title: "🚕 Get home", subtitle: "Taxi pickup", icon: "car", confidence: 75, reason: "Late night transport", suggestedCategories: ["taxi"], priority: 2 },
  ],
};

const ZONE_ACTIONS: Partial<Record<ZoneType, NextAction[]>> = {
  airport: [
    { id: "act-hotel", type: "stay", title: "🏨 Hotels nearby", subtitle: "Rest after your flight", icon: "hotel", confidence: 90, reason: "Airport area", suggestedCategories: ["hotel", "hostel"], priority: 1 },
    { id: "act-exchange", type: "utility", title: "💱 Currency exchange", subtitle: "Best rates nearby", icon: "banknote", confidence: 85, reason: "Airport arrival", suggestedCategories: ["exchange", "atm"], priority: 2 },
    { id: "act-taxi-air", type: "transport", title: "🚕 Airport taxi", subtitle: "Best pickup", icon: "car", confidence: 90, reason: "Airport transfer", suggestedCategories: ["taxi", "car_rental"], priority: 1 },
  ],
  tourist: [
    { id: "act-discover", type: "explore", title: "📸 Discover area", subtitle: "Top attractions nearby", icon: "camera", confidence: 80, reason: "Tourist zone", suggestedCategories: ["museum", "monument", "attraction"], priority: 1 },
  ],
};

/** Compute next best actions based on context + profile */
export function computeNextActions(
  context: UserContext,
  profile?: UserRadarProfile | null,
): NextAction[] {
  const actions: NextAction[] = [];

  // Time-based actions
  const timeActions = TIME_ACTIONS[context.dayPart] || [];
  actions.push(...timeActions);

  // Zone-based actions
  const zoneActions = ZONE_ACTIONS[context.zoneType] || [];
  actions.push(...zoneActions);

  // Always-useful actions
  actions.push({
    id: "act-atm",
    type: "utility",
    title: "🏧 ATM nearby",
    subtitle: "Cash point",
    icon: "banknote",
    confidence: 40,
    reason: "Always useful",
    suggestedCategories: ["atm", "bank"],
    priority: 5,
  });

  actions.push({
    id: "act-pharmacy",
    type: "utility",
    title: "💊 Pharmacy",
    subtitle: "Open now",
    icon: "pill",
    confidence: 35,
    reason: "Essential service",
    suggestedCategories: ["pharmacy"],
    priority: 5,
  });

  // Boost confidence based on profile affinity
  if (profile) {
    for (const action of actions) {
      const affinityMatch = action.suggestedCategories.some(c =>
        profile.preferredCategories.includes(c) ||
        profile.preferredVerticals.includes(c)
      );
      if (affinityMatch) {
        action.confidence = Math.min(100, action.confidence + 15);
        action.subtitle += " • Matches your taste";
      }
    }
  }

  // Weekend boost for explore/nightlife
  if (context.isWeekend) {
    actions
      .filter(a => a.type === "explore" || a.type === "nightlife")
      .forEach(a => { a.confidence = Math.min(100, a.confidence + 10); });
  }

  // Sort by confidence desc, then priority asc
  return actions
    .sort((a, b) => b.confidence - a.confidence || a.priority - b.priority)
    .slice(0, 6);
}
