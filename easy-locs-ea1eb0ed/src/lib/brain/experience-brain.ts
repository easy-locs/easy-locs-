/**
 * EXPERIENCE BRAIN — Single source of truth for UI behavior.
 * 
 * Owns:
 * - Smart suggestions (time/weather/demand/supply/traffic-driven)
 * - Trending items
 * - Safety prompts
 * - Contextual banners
 * 
 * NO business logic allowed here.
 * This brain reads from execution outputs to drive UX decisions.
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
  priority: number;
}

export interface TrendingItem {
  id: string;
  label: string;
  tag: string;
  icon: string;
}

export interface SafetyPrompt {
  id: string;
  level: "info" | "warning" | "critical";
  message: string;
  subMessage?: string;
  icon: string;
}

export interface ExperienceBrainOutput {
  suggestions: SmartSuggestion[];
  trending: TrendingItem[];
  safetyPrompts: SafetyPrompt[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPUTE: Smart suggestions from execution context
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function computeSmartSuggestions(exec: ExecutionBrainState): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = [];
  const hour = new Date().getHours();

  // ── Time-based ──
  if (hour >= 11 && hour <= 14) {
    suggestions.push({
      id: "lunch", label: "Lunch delivery", subLabel: "Peak time",
      icon: "🍽️", route: "/food", reason: "peak_lunch", priority: 50,
    });
  }
  if (hour >= 18 && hour <= 21) {
    suggestions.push({
      id: "dinner", label: "Dinner delivery", subLabel: "Order now",
      icon: "🍕", route: "/food", reason: "peak_dinner", priority: 50,
    });
  }

  // ── Weather-based ──
  if (exec.weather.isStorm) {
    suggestions.push({
      id: "storm-safe", label: "Stay safe — order in", subLabel: "Storm conditions active",
      icon: "⛈️", route: "/food", reason: "weather_storm", priority: 95,
    });
  } else if (exec.weather.type === "rain") {
    suggestions.push({
      id: "rain-delivery", label: "Rain? Fast delivery", subLabel: "Stay dry, we deliver",
      icon: "🌧️", route: "/food", reason: "weather_rain", priority: 70,
    });
  } else if (exec.weather.type === "heat" || exec.weather.intensity > 0.6) {
    suggestions.push({
      id: "heat-delivery", label: "Hot outside — cool drinks delivery", subLabel: "Beat the heat",
      icon: "☀️", route: "/food", reason: "weather_heat", priority: 60,
    });
  }

  // ── Demand + Supply ──
  if (exec.demand.isHigh && exec.supply.riderCount > 3) {
    suggestions.push({
      id: "express", label: "Express delivery available", subLabel: `${exec.supply.riderCount} riders nearby`,
      icon: "⚡", route: "/mobility/delivery", reason: "high_supply_high_demand", priority: 80,
    });
  } else if (exec.demand.isHigh && exec.supply.isLow) {
    suggestions.push({
      id: "busy-area", label: "Busy area — longer ETA", subLabel: "Schedule for later?",
      icon: "⏳", route: "/food", reason: "high_demand_low_supply", priority: 85,
    });
  } else if (!exec.demand.isHigh && !exec.supply.isLow) {
    suggestions.push({
      id: "quiet-fast", label: "Fast delivery window", subLabel: "Low demand, quick service",
      icon: "🚀", route: "/food", reason: "calm_zone", priority: 40,
    });
  }

  // ── Surge active ──
  if (exec.demand.surgeActive && exec.demand.surgeMultiplier > 1.2) {
    suggestions.push({
      id: "surge-alert", label: "Surge pricing active", subLabel: `${exec.demand.surgeMultiplier.toFixed(1)}x — try pickup?`,
      icon: "📈", route: "/food", reason: "surge_active", priority: 75,
    });
  }

  // ── Traffic-based ──
  if (exec.traffic.level === "light" || exec.traffic.level === "free_flow") {
    suggestions.push({
      id: "low-traffic", label: "Roads clear — fast rides", subLabel: "Quick taxi or delivery",
      icon: "🛣️", route: "/mobility/taxi", reason: "low_traffic", priority: 55,
    });
  } else if (exec.traffic.isSevere) {
    suggestions.push({
      id: "traffic-warning", label: "Heavy traffic", subLabel: "Delivery may take longer",
      icon: "🚗", route: "/food", reason: "severe_traffic", priority: 65,
    });
  }

  // ── Merchant visibility ──
  if (exec.merchants.deliverable > 10) {
    suggestions.push({
      id: "many-merchants", label: "Many merchants delivering", subLabel: `${exec.merchants.deliverable} available now`,
      icon: "🏪", route: "/food", reason: "high_merchant_availability", priority: 45,
    });
  } else if (exec.merchants.deliverable === 0 && exec.merchants.total > 0) {
    suggestions.push({
      id: "no-delivery", label: "No delivery available", subLabel: "Try pickup instead",
      icon: "🚶", route: "/food", reason: "no_delivery_merchants", priority: 90,
    });
  }

  // ── Safety / flood ──
  if (exec.safety.isBlocked) {
    suggestions.push({
      id: "zone-blocked", label: "Zone restricted", subLabel: "Service limited — stay safe",
      icon: "🚫", route: "/", reason: "zone_blocked", priority: 100,
    });
  }

  // Sort by priority desc, return top 5
  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPUTE: Trending items
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  if (exec.weather.type === "rain" || exec.weather.isStorm) {
    items.push({ id: "comfort-food", label: "Comfort food", tag: "🌧️ Weather pick", icon: "🍜" });
  }
  if (exec.traffic.level === "light" || exec.traffic.level === "free_flow") {
    items.push({ id: "taxi", label: "Quick ride", tag: "🟢 Roads clear", icon: "🚕" });
  }

  return items.slice(0, 4);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPUTE: Safety prompts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function computeSafetyPrompts(exec: ExecutionBrainState): SafetyPrompt[] {
  const prompts: SafetyPrompt[] = [];

  if (exec.safety.isBlocked) {
    prompts.push({
      id: "flood-block", level: "critical",
      message: "Zone restrictions active", subMessage: "Service may be limited due to flooding",
      icon: "🚨",
    });
  } else if (exec.safety.floodRisk === "moderate") {
    prompts.push({
      id: "flood-warn", level: "warning",
      message: "Flood risk detected", subMessage: "Deliveries may be affected",
      icon: "⚠️",
    });
  }

  if (exec.weather.isStorm) {
    prompts.push({
      id: "storm-warn", level: "warning",
      message: "Storm conditions", subMessage: "Weather may affect deliveries and rides",
      icon: "⛈️",
    });
  }

  if (exec.traffic.isSevere) {
    prompts.push({
      id: "traffic-severe", level: "info",
      message: "Heavy traffic in your area", subMessage: "ETAs may be longer than usual",
      icon: "🚗",
    });
  }

  return prompts;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FULL OUTPUT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Full experience brain output */
export function computeExperienceBrain(exec: ExecutionBrainState): ExperienceBrainOutput {
  return {
    suggestions: computeSmartSuggestions(exec),
    trending: computeTrending(exec),
    safetyPrompts: computeSafetyPrompts(exec),
  };
}

/** Refresh the global experience store */
export function refreshExperience(input?: { country?: string | null; city?: string | null }): void {
  useGlobalExperienceStore.getState().refresh(input);
}
