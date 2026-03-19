/**
 * DINO V8.2 — Orbit Acquisition & Promotion Engine
 * Dynamic promotion slots, onboarding CTAs, and activation loops for Orbit hub.
 */

export interface PromotionSlot {
  id: string;
  type: "featured_service" | "trending_category" | "new_business" | "high_quality" | "onboarding_cta";
  title: string;
  subtitle?: string;
  route: string;
  priority: number;          // lower = higher priority
  expiresAt?: string;
  country?: string;
  city?: string;
}

export interface OnboardingFunnel {
  id: string;
  vertical: "food" | "property" | "travel" | "service" | "delivery" | "shop";
  title: string;
  description: string;
  steps: string[];
  estimatedMinutes: number;
  ctaLabel: string;
  route: string;
}

const ONBOARDING_FUNNELS: OnboardingFunnel[] = [
  { id: "food", vertical: "food", title: "Open your restaurant", description: "Start receiving food orders", steps: ["Business info", "Menu", "Photos", "Availability"], estimatedMinutes: 10, ctaLabel: "Start now", route: "/onboarding/food" },
  { id: "property", vertical: "property", title: "List your property", description: "Reach tenants and buyers", steps: ["Property details", "Photos", "Pricing", "Availability"], estimatedMinutes: 8, ctaLabel: "List property", route: "/onboarding/property" },
  { id: "travel", vertical: "travel", title: "List your stay", description: "Welcome guests worldwide", steps: ["Listing info", "Photos", "Calendar", "Pricing"], estimatedMinutes: 10, ctaLabel: "Get started", route: "/onboarding/travel" },
  { id: "service", vertical: "service", title: "Offer your service", description: "Connect with local clients", steps: ["Service type", "Coverage area", "Pricing", "Portfolio"], estimatedMinutes: 7, ctaLabel: "Join now", route: "/onboarding/service" },
  { id: "delivery", vertical: "delivery", title: "Become a driver", description: "Earn on your schedule", steps: ["Personal info", "Vehicle", "Documents", "Zones"], estimatedMinutes: 5, ctaLabel: "Apply", route: "/onboarding/delivery" },
  { id: "shop", vertical: "shop", title: "Open your shop", description: "Sell products online & locally", steps: ["Shop info", "Products", "Photos", "Payment"], estimatedMinutes: 12, ctaLabel: "Create shop", route: "/onboarding/shop" },
];

export function getOnboardingFunnels(): OnboardingFunnel[] {
  return [...ONBOARDING_FUNNELS];
}

export function getOnboardingFunnelByVertical(vertical: string): OnboardingFunnel | undefined {
  return ONBOARDING_FUNNELS.find(f => f.vertical === vertical);
}

export function generatePromotionSlots(context: {
  country: string;
  city?: string;
  userCategories: string[];
  trendingCategories: string[];
  newBusinessIds: string[];
  supplyGaps: string[];
}): PromotionSlot[] {
  const slots: PromotionSlot[] = [];
  let priority = 1;

  // Trending categories
  for (const cat of context.trendingCategories.slice(0, 2)) {
    slots.push({
      id: `trending-${cat}`, type: "trending_category",
      title: `🔥 ${cat}`, subtitle: "Trending now",
      route: `/search?category=${cat}`, priority: priority++,
      country: context.country, city: context.city,
    });
  }

  // New businesses
  for (const bizId of context.newBusinessIds.slice(0, 2)) {
    slots.push({
      id: `new-${bizId}`, type: "new_business",
      title: "✨ New on Easy Locs", subtitle: "Just opened",
      route: `/store/${bizId}`, priority: priority++,
    });
  }

  // Supply gap → onboarding CTA
  for (const gap of context.supplyGaps.slice(0, 2)) {
    const funnel = ONBOARDING_FUNNELS.find(f => f.vertical === gap);
    if (funnel) {
      slots.push({
        id: `cta-${gap}`, type: "onboarding_cta",
        title: funnel.title, subtitle: funnel.description,
        route: funnel.route, priority: priority++,
        country: context.country,
      });
    }
  }

  return slots.sort((a, b) => a.priority - b.priority);
}

export interface ActivationLoop {
  profileId: string;
  step: number;
  totalSteps: number;
  nextAction: string;
  channel: "email" | "sms" | "push" | "in_app";
  delayHours: number;
  templateKey: string;
}

export function buildActivationLoop(profileId: string, daysSinceInvite: number): ActivationLoop | null {
  if (daysSinceInvite <= 1) {
    return { profileId, step: 1, totalSteps: 4, nextAction: "Welcome email", channel: "email", delayHours: 0, templateKey: "activation_welcome" };
  }
  if (daysSinceInvite <= 3) {
    return { profileId, step: 2, totalSteps: 4, nextAction: "Reminder with tips", channel: "email", delayHours: 48, templateKey: "activation_tips" };
  }
  if (daysSinceInvite <= 7) {
    return { profileId, step: 3, totalSteps: 4, nextAction: "Quick activation offer", channel: "sms", delayHours: 96, templateKey: "activation_quick" };
  }
  if (daysSinceInvite <= 14) {
    return { profileId, step: 4, totalSteps: 4, nextAction: "Final push with incentive", channel: "push", delayHours: 168, templateKey: "activation_final" };
  }
  return null; // Beyond activation window
}
