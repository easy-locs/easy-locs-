/**
 * EXPERIENCE BRAIN — Single source of truth for UI behavior.
 * 
 * Owns:
 * - Visual theme (gradients, accents)
 * - Motion presets (animations)
 * - Smart suggestions (time/weather/demand-driven)
 * - Trending items
 * - Banner composition
 * - Page composition
 * 
 * NO business logic allowed here.
 * This brain reads from arbitration/execution outputs to drive UX decisions.
 */
import { useGlobalExperienceStore } from "@/stores/globalExperienceStore";
import type { ExecutionBrainState } from "./execution-brain";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPERIENCE BRAIN STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface SmartSuggestion {
  id: string;
  label: string;
  subLabel: string;
  icon: string;
  route: string;
  reason: string;
}

export interface TrendingItem {
  id: string;
  label: string;
  tag: string;
  icon: string;
}

export interface ExperienceBrainOutput {
  suggestions: SmartSuggestion[];
  trending: TrendingItem[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPUTE: Smart suggestions from execution context
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function computeSmartSuggestions(exec: ExecutionBrainState): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const hour = new Date().getHours();

  // Time-based suggestions
  if (hour >= 11 && hour <= 14) {
    suggestions.push({
      id: "lunch", label: "Lunch delivery", subLabel: "Peak time",
      icon: "🍽️", route: "/food", reason: "peak_lunch",
    });
  }
  if (hour >= 18 && hour <= 21) {
    suggestions.push({
      id: "dinner", label: "Dinner delivery", subLabel: "Order now",
      icon: "🍕", route: "/food", reason: "peak_dinner",
    });
  }

  // Weather-based
  if (exec.weather.isStorm) {
    suggestions.push({
      id: "storm-safe", label: "Stay safe — order in", subLabel: "Storm conditions",
      icon: "⛈️", route: "/food", reason: "weather_storm",
    });
  } else if (exec.weather.type === "rain") {
    suggestions.push({
      id: "rain-delivery", label: "Rain fast delivery", subLabel: "Stay dry",
      icon: "🌧️", route: "/food", reason: "weather_rain",
    });
  }

  // Demand-based
  if (exec.demand.isHigh && exec.supply.riderCount > 3) {
    suggestions.push({
      id: "express", label: "Express delivery", subLabel: `${exec.supply.riderCount} riders nearby`,
      icon: "⚡", route: "/mobility/delivery", reason: "high_supply",
    });
  }

  // Low traffic = fast delivery window
  if (exec.traffic.level === "light" || exec.traffic.level === "free_flow") {
    suggestions.push({
      id: "low-traffic", label: "Low traffic express", subLabel: "Fast delivery window",
      icon: "🚀", route: "/mobility/delivery", reason: "low_traffic",
    });
  }

  return suggestions.slice(0, 4);
}

export function computeTrending(exec: ExecutionBrainState): TrendingItem[] {
  const items: TrendingItem[] = [];

  if (exec.demand.isHigh) {
    items.push({ id: "high-demand", label: "Food delivery", tag: "🔥 High demand", icon: "🍕" });
  }
  if (exec.merchants.deliverable > 5) {
    items.push({ id: "grocery", label: "Grocery express", tag: "Fast", icon: "🛒" });
  }
  if (exec.supply.riderCount > 0) {
    items.push({ id: "document", label: "Document delivery", tag: "Urgent", icon: "📄" });
  }

  return items.slice(0, 4);
}

/** Full experience brain output */
export function computeExperienceBrain(exec: ExecutionBrainState): ExperienceBrainOutput {
  return {
    suggestions: computeSmartSuggestions(exec),
    trending: computeTrending(exec),
  };
}

/** Refresh the global experience store */
export function refreshExperience(input?: { country?: string | null; city?: string | null }): void {
  useGlobalExperienceStore.getState().refresh(input);
}
