import type { DashboardModule, UserContext } from "./types";

interface ModuleConfig {
  id: string;
  component: string;
  baseWeight: number;
  verticalAffinity: string[];
  requiresAuth: boolean;
  requiresBusiness: boolean;
  timePreference?: ("morning" | "afternoon" | "evening" | "night")[];
}

const MODULE_REGISTRY: ModuleConfig[] = [
  { id: "hero_banner", component: "TopHeroBanner", baseWeight: 100, verticalAffinity: [], requiresAuth: false, requiresBusiness: false },
  { id: "quick_actions", component: "QuickActions", baseWeight: 95, verticalAffinity: [], requiresAuth: false, requiresBusiness: false },
  { id: "stories_for_you", component: "StoryPreviewRail", baseWeight: 90, verticalAffinity: [], requiresAuth: false, requiresBusiness: false },
  { id: "ai_insights", component: "AISmartInsights", baseWeight: 85, verticalAffinity: [], requiresAuth: true, requiresBusiness: false },
  { id: "continue_exploring", component: "ContinueExploring", baseWeight: 80, verticalAffinity: [], requiresAuth: true, requiresBusiness: false },
  { id: "food_nearby", component: "FoodNearby", baseWeight: 75, verticalAffinity: ["food"], requiresAuth: false, requiresBusiness: false, timePreference: ["afternoon", "evening"] },
  { id: "wallet_widget", component: "CurrencyWalletWidget", baseWeight: 70, verticalAffinity: [], requiresAuth: true, requiresBusiness: false },
  { id: "property_spotlight", component: "PropertySpotlight", baseWeight: 65, verticalAffinity: ["property"], requiresAuth: false, requiresBusiness: false },
  { id: "stay_trending", component: "StayTrending", baseWeight: 60, verticalAffinity: ["stay"], requiresAuth: false, requiresBusiness: false },
  { id: "orbit_followups", component: "OrbitFollowups", baseWeight: 55, verticalAffinity: [], requiresAuth: true, requiresBusiness: false },
  { id: "category_grid", component: "CategoryGrid", baseWeight: 50, verticalAffinity: [], requiresAuth: false, requiresBusiness: false },
  { id: "live_stats", component: "LiveStatsPulse", baseWeight: 45, verticalAffinity: [], requiresAuth: false, requiresBusiness: false },
  { id: "grocery_essentials", component: "GroceryEssentials", baseWeight: 40, verticalAffinity: ["grocery"], requiresAuth: false, requiresBusiness: false },
  { id: "utility_nearby", component: "UtilityNearby", baseWeight: 35, verticalAffinity: ["utility"], requiresAuth: false, requiresBusiness: false },
  { id: "onboarding_checklist", component: "OnboardingChecklist", baseWeight: 30, verticalAffinity: [], requiresAuth: true, requiresBusiness: true },
  { id: "featured_hotels", component: "FeaturedHotels", baseWeight: 25, verticalAffinity: ["stay"], requiresAuth: false, requiresBusiness: false },
];

export function rankDashboardModules(ctx: UserContext & { isAuthenticated?: boolean; isBusiness?: boolean }): DashboardModule[] {
  return MODULE_REGISTRY
    .map((mod) => {
      let priority = mod.baseWeight;
      let visible = true;
      let reason = "default";

      if (mod.requiresAuth && !ctx.isAuthenticated) {
        visible = false;
        reason = "requires_auth";
      }

      if (mod.requiresBusiness && !ctx.isBusiness) {
        visible = false;
        reason = "requires_business";
      }

      if (mod.verticalAffinity.length > 0 && ctx.recentVerticals?.length) {
        const match = mod.verticalAffinity.some((v) => ctx.recentVerticals!.includes(v));
        if (match) {
          priority += 15;
          reason = "vertical_affinity_boost";
        }
      }

      if (mod.timePreference && ctx.timeOfDay) {
        if (mod.timePreference.includes(ctx.timeOfDay)) {
          priority += 10;
          reason = "time_relevant";
        } else {
          priority -= 5;
        }
      }

      if (ctx.activeIntent) {
        const intentVerticalMap: Record<string, string> = {
          buy_property: "property",
          rent_property: "property",
          project_property: "property",
          stay_booking: "stay",
          food_order: "food",
          grocery_order: "grocery",
          service_request: "services",
          ride_request: "mobility",
        };
        const intentVertical = intentVerticalMap[ctx.activeIntent];
        if (intentVertical && mod.verticalAffinity.includes(intentVertical)) {
          priority += 20;
          reason = "active_intent_match";
        }
      }

      return {
        id: mod.id,
        component: mod.component,
        priority: Math.max(0, Math.min(100, priority)),
        visible,
        reason,
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

export function getVisibleModules(ctx: UserContext & { isAuthenticated?: boolean; isBusiness?: boolean }): DashboardModule[] {
  return rankDashboardModules(ctx).filter((m) => m.visible);
}
