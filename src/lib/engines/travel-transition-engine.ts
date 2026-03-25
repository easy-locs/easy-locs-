/**
 * Travel Transition Engine — Detects travel context changes and provides smart guidance.
 * Examples: airport arrival → hotel/transport/food/exchange suggestions
 */

export type TransitionContext = "airport" | "hotel" | "mall" | "beach" | "downtown" | "residential" | "industrial" | "unknown";

export interface TransitionSuggestion {
  id: string;
  context: TransitionContext;
  title: string;
  subtitle: string;
  icon: string;
  category: string;
  priority: number; // 1-10
}

/** Airport arrival suggestions */
const AIRPORT_FLOW: TransitionSuggestion[] = [
  { id: "t-hotel", context: "airport", title: "Find a Hotel", subtitle: "Best rated nearby", icon: "🏨", category: "hotel", priority: 10 },
  { id: "t-taxi", context: "airport", title: "Get a Ride", subtitle: "Taxi & transport options", icon: "🚕", category: "transport", priority: 9 },
  { id: "t-exchange", context: "airport", title: "Currency Exchange", subtitle: "Best rates nearby", icon: "💱", category: "exchange", priority: 8 },
  { id: "t-food", context: "airport", title: "Eat Now", subtitle: "Restaurants & cafes", icon: "🍽️", category: "food", priority: 7 },
  { id: "t-sim", context: "airport", title: "Get a SIM Card", subtitle: "Stay connected", icon: "📱", category: "telecom", priority: 6 },
];

const HOTEL_FLOW: TransitionSuggestion[] = [
  { id: "t-restaurant", context: "hotel", title: "Where to Eat", subtitle: "Best food nearby", icon: "🍽️", category: "food", priority: 10 },
  { id: "t-explore", context: "hotel", title: "Explore Area", subtitle: "What's around you", icon: "🗺️", category: "attraction", priority: 9 },
  { id: "t-spa", context: "hotel", title: "Relax & Wellness", subtitle: "Spas & gyms", icon: "🧖", category: "wellness", priority: 7 },
  { id: "t-shop", context: "hotel", title: "Shopping", subtitle: "Malls & boutiques", icon: "🛍️", category: "shopping", priority: 6 },
];

const BEACH_FLOW: TransitionSuggestion[] = [
  { id: "t-beachcafe", context: "beach", title: "Beach Cafe", subtitle: "Drinks & snacks", icon: "☕", category: "cafe", priority: 10 },
  { id: "t-water", context: "beach", title: "Water Sports", subtitle: "Activities nearby", icon: "🏄", category: "activity", priority: 8 },
  { id: "t-lounge", context: "beach", title: "Beach Lounge", subtitle: "Chill & relax", icon: "🌴", category: "lounge", priority: 7 },
];

const DOWNTOWN_FLOW: TransitionSuggestion[] = [
  { id: "t-food2", context: "downtown", title: "Best Restaurants", subtitle: "Top rated in area", icon: "🍽️", category: "food", priority: 10 },
  { id: "t-coffee", context: "downtown", title: "Coffee Shop", subtitle: "Nearby cafes", icon: "☕", category: "cafe", priority: 8 },
  { id: "t-atm", context: "downtown", title: "ATM / Bank", subtitle: "Cash & banking", icon: "🏧", category: "atm", priority: 6 },
  { id: "t-pharmacy", context: "downtown", title: "Pharmacy", subtitle: "Healthcare", icon: "💊", category: "pharmacy", priority: 5 },
];

const CONTEXT_FLOWS: Record<TransitionContext, TransitionSuggestion[]> = {
  airport: AIRPORT_FLOW,
  hotel: HOTEL_FLOW,
  beach: BEACH_FLOW,
  downtown: DOWNTOWN_FLOW,
  mall: [
    { id: "t-mallfood", context: "mall", title: "Food Court", subtitle: "Eat & drink", icon: "🍔", category: "food", priority: 10 },
    { id: "t-cinema", context: "mall", title: "Cinema", subtitle: "Movies nearby", icon: "🎬", category: "cinema", priority: 7 },
  ],
  residential: [
    { id: "t-grocery", context: "residential", title: "Grocery Store", subtitle: "Daily needs", icon: "🛒", category: "grocery", priority: 10 },
    { id: "t-pharmacy2", context: "residential", title: "Pharmacy", subtitle: "Healthcare", icon: "💊", category: "pharmacy", priority: 8 },
  ],
  industrial: [],
  unknown: [],
};

/** Detect transition context from nearby entity categories */
export function detectTransitionContext(
  nearbyCategories: string[]
): TransitionContext {
  const has = (cats: string[]) => cats.some(c => nearbyCategories.includes(c));
  if (has(["airport", "terminal", "airline"])) return "airport";
  if (has(["hotel", "resort", "hostel"])) return "hotel";
  if (has(["beach", "surfing", "waterfront"])) return "beach";
  if (has(["mall", "shopping_center"])) return "mall";
  if (has(["apartment", "residential"])) return "residential";
  if (nearbyCategories.length > 10) return "downtown";
  return "unknown";
}

/** Get suggestions for a transition context */
export function getTransitionSuggestions(context: TransitionContext): TransitionSuggestion[] {
  return CONTEXT_FLOWS[context] || [];
}
