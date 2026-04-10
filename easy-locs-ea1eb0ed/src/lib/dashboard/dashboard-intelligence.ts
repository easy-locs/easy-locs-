import { getSmartCoreState } from "@/lib/smart-core";

export type DayPart = "early_morning" | "morning" | "lunch" | "afternoon" | "evening" | "night" | "late_night";
export type DayType = "weekday" | "weekend" | "holiday";

export interface DashboardContext {
  hour: number;
  dayPart: DayPart;
  dayType: DayType;
  userId: string | null;
  hasWallet: boolean;
  walletBalance: number;
  unreadMessages: number;
  activeOrders: number;
  hasProfile: boolean;
  profileComplete: boolean;
  hasOrbit: boolean;
}

export interface ContinueItem {
  id: string;
  type: "cart" | "booking" | "form" | "payment" | "profile" | "onboarding";
  title: string;
  subtitle: string;
  route: string;
  icon: string;
  progress: number;
  urgency: "low" | "medium" | "high";
  timestamp: number;
}

export interface SuggestedPayment {
  id: string;
  type: "pending_request" | "recurring" | "split" | "reminder" | "due";
  title: string;
  subtitle: string;
  amount: number | null;
  currency: string;
  route: string;
  icon: string;
  dueDate: string | null;
  urgency: "low" | "medium" | "high";
}

export interface PendingAction {
  id: string;
  type: "booking_confirm" | "review_pending" | "delivery_active" | "message_reply" | "invoice_due" | "profile_incomplete";
  title: string;
  subtitle: string;
  route: string;
  icon: string;
  urgency: "low" | "medium" | "high";
  expiresAt: string | null;
}

export type DashboardSectionId =
  | "continue"
  | "quick_actions"
  | "suggested_payments"
  | "pending_actions"
  | "live_stats"
  | "orbit_preview"
  | "property_widget"
  | "stories"
  | "trending"
  | "best_rated"
  | "newest"
  | "near_you"
  | "featured_hotels"
  | "categories"
  | "radar_preview";

export interface SectionPriority {
  id: DashboardSectionId;
  weight: number;
  visible: boolean;
  reason: string;
}

export function getDayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 7) return "early_morning";
  if (hour >= 7 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  if (hour >= 21 && hour < 24) return "night";
  return "late_night";
}

export function getDayType(): DayType {
  const day = new Date().getDay();
  return day === 0 || day === 6 ? "weekend" : "weekday";
}

export function buildDashboardContext(params: {
  userId: string | null;
  hasWallet: boolean;
  walletBalance: number;
  unreadMessages: number;
  activeOrders: number;
  hasProfile: boolean;
  profileComplete: boolean;
  hasOrbit: boolean;
}): DashboardContext {
  const hour = new Date().getHours();
  return {
    hour,
    dayPart: getDayPart(hour),
    dayType: getDayType(),
    ...params,
  };
}

export function getContinueItems(ctx: DashboardContext): ContinueItem[] {
  const items: ContinueItem[] = [];
  const now = Date.now();

  if (!ctx.profileComplete && ctx.hasProfile) {
    items.push({
      id: "continue-profile",
      type: "profile",
      title: "Complete your profile",
      subtitle: "Add photo and details to unlock full features",
      route: "/me/edit-profile",
      icon: "👤",
      progress: 60,
      urgency: "medium",
      timestamp: now,
    });
  }

  if (ctx.hasProfile && !ctx.hasWallet) {
    items.push({
      id: "continue-wallet",
      type: "onboarding",
      title: "Set up your wallet",
      subtitle: "Send money, pay, and receive payments",
      route: "/wallet",
      icon: "💰",
      progress: 0,
      urgency: "medium",
      timestamp: now,
    });
  }

  if (ctx.hasProfile && !ctx.hasOrbit) {
    items.push({
      id: "continue-orbit",
      type: "onboarding",
      title: "Connect Orbit",
      subtitle: "Start messaging and communicating",
      route: "/orbit",
      icon: "💬",
      progress: 0,
      urgency: "low",
      timestamp: now,
    });
  }

  const smartState = getSmartCoreState();
  const recentRoutes = Object.entries(smartState.featureUsage)
    .filter(([_route, data]) => {
      const last = data.lastUsed ?? 0;
      const hoursSince = (now - last) / (1000 * 60 * 60);
      return hoursSince < 24 && hoursSince > 0.5 && data.score >= 2;
    })
    .sort((a, b) => (b[1].lastUsed ?? 0) - (a[1].lastUsed ?? 0))
    .slice(0, 2);

  const RESUMABLE_ROUTES: Record<string, { title: string; subtitle: string; icon: string; type: ContinueItem["type"] }> = {
    "/merchant/onboarding": { title: "Continue shop setup", subtitle: "Your shop is almost ready", icon: "🏪", type: "onboarding" },
    "/wallet/transfer": { title: "Complete your transfer", subtitle: "You started a payment", icon: "💸", type: "payment" },
    "/wallet/request": { title: "Finish your request", subtitle: "Send your payment request", icon: "📩", type: "payment" },
    "/checkout": { title: "Complete your order", subtitle: "Items are waiting in your cart", icon: "🛒", type: "cart" },
    "/stay": { title: "Continue browsing hotels", subtitle: "Find your perfect stay", icon: "🏨", type: "booking" },
    "/browse/food": { title: "Continue ordering food", subtitle: "Pick up where you left off", icon: "🍽️", type: "booking" },
  };

  for (const [route] of recentRoutes) {
    const meta = RESUMABLE_ROUTES[route];
    if (meta) {
      items.push({
        id: `continue-${route.replace(/\//g, "-")}`,
        type: meta.type,
        title: meta.title,
        subtitle: meta.subtitle,
        route,
        icon: meta.icon,
        progress: 50,
        urgency: "low",
        timestamp: smartState.featureUsage[route]?.lastUsed ?? now,
      });
    }
  }

  return items.slice(0, 3);
}

export function getSuggestedPayments(ctx: DashboardContext): SuggestedPayment[] {
  const payments: SuggestedPayment[] = [];

  if (ctx.activeOrders > 0) {
    payments.push({
      id: "pay-active-orders",
      type: "pending_request",
      title: "Active orders",
      subtitle: `${ctx.activeOrders} order${ctx.activeOrders > 1 ? "s" : ""} in progress`,
      amount: null,
      currency: "AED",
      route: "/my-orders/active",
      icon: "📦",
      dueDate: null,
      urgency: "medium",
    });
  }

  if (ctx.hasWallet && ctx.walletBalance > 0 && ctx.walletBalance < 50) {
    payments.push({
      id: "pay-low-balance",
      type: "reminder",
      title: "Top up wallet",
      subtitle: `Balance is low (${ctx.walletBalance.toFixed(0)} ${ctx.walletBalance < 20 ? "— may not cover next payment" : ""})`,
      amount: null,
      currency: "AED",
      route: "/wallet",
      icon: "💳",
      dueDate: null,
      urgency: ctx.walletBalance < 20 ? "high" : "medium",
    });
  }

  if (ctx.unreadMessages > 3) {
    payments.push({
      id: "pay-pending-messages",
      type: "pending_request",
      title: "Payment requests waiting",
      subtitle: "You may have pending payment requests in messages",
      amount: null,
      currency: "AED",
      route: "/orbit",
      icon: "💬",
      dueDate: null,
      urgency: "low",
    });
  }

  return payments.slice(0, 3);
}

export function getPendingActions(ctx: DashboardContext): PendingAction[] {
  const actions: PendingAction[] = [];

  if (ctx.activeOrders > 0) {
    actions.push({
      id: "action-track-delivery",
      type: "delivery_active",
      title: "Track your delivery",
      subtitle: `${ctx.activeOrders} active order${ctx.activeOrders > 1 ? "s" : ""}`,
      route: "/my-orders/active",
      icon: "🚚",
      urgency: "high",
      expiresAt: null,
    });
  }

  if (ctx.unreadMessages > 0) {
    actions.push({
      id: "action-reply-messages",
      type: "message_reply",
      title: "Reply to messages",
      subtitle: `${ctx.unreadMessages} unread message${ctx.unreadMessages > 1 ? "s" : ""}`,
      route: "/orbit",
      icon: "💬",
      urgency: ctx.unreadMessages > 5 ? "high" : "medium",
      expiresAt: null,
    });
  }

  return actions.slice(0, 3);
}

const SECTION_BASE_WEIGHTS: Record<DashboardSectionId, number> = {
  continue: 100,
  quick_actions: 95,
  suggested_payments: 85,
  pending_actions: 80,
  live_stats: 75,
  orbit_preview: 70,
  property_widget: 40,
  stories: 50,
  trending: 60,
  best_rated: 55,
  newest: 45,
  near_you: 65,
  featured_hotels: 35,
  categories: 30,
  radar_preview: 50,
};

const TIME_BOOSTS: Record<DayPart, Partial<Record<DashboardSectionId, number>>> = {
  early_morning: { quick_actions: 10 },
  morning: { quick_actions: 10, near_you: 5 },
  lunch: { trending: 15, near_you: 10, stories: 5 },
  afternoon: { categories: 5, radar_preview: 10 },
  evening: { trending: 10, near_you: 15, featured_hotels: 10 },
  night: { suggested_payments: 5, featured_hotels: 15 },
  late_night: { continue: 5 },
};

const WEEKEND_BOOSTS: Partial<Record<DashboardSectionId, number>> = {
  featured_hotels: 20,
  near_you: 10,
  stories: 10,
  trending: 5,
  radar_preview: 10,
};

export function prioritizeSections(ctx: DashboardContext): SectionPriority[] {
  const priorities: SectionPriority[] = [];

  const continueItems = getContinueItems(ctx);
  const suggestedPayments = getSuggestedPayments(ctx);
  const pendingActions = getPendingActions(ctx);

  for (const [id, baseWeight] of Object.entries(SECTION_BASE_WEIGHTS) as [DashboardSectionId, number][]) {
    let weight = baseWeight;
    let reason = "base";

    const timeBoost = TIME_BOOSTS[ctx.dayPart]?.[id] ?? 0;
    if (timeBoost > 0) {
      weight += timeBoost;
      reason = `${ctx.dayPart} boost`;
    }

    if (ctx.dayType === "weekend") {
      const wkndBoost = WEEKEND_BOOSTS[id] ?? 0;
      if (wkndBoost > 0) {
        weight += wkndBoost;
        reason = "weekend boost";
      }
    }

    let visible = true;
    if (id === "continue" && continueItems.length === 0) visible = false;
    if (id === "suggested_payments" && suggestedPayments.length === 0) visible = false;
    if (id === "pending_actions" && pendingActions.length === 0) visible = false;

    if (id === "pending_actions" && ctx.activeOrders > 0) {
      weight += 20;
      reason = "active orders urgency";
    }
    if (id === "suggested_payments" && ctx.walletBalance < 20) {
      weight += 15;
      reason = "low balance urgency";
    }
    if (id === "orbit_preview" && ctx.unreadMessages > 3) {
      weight += 15;
      reason = "unread messages urgency";
    }

    priorities.push({ id, weight, visible, reason });
  }

  return priorities.sort((a, b) => b.weight - a.weight);
}

export function getContextualGreeting(ctx: DashboardContext): { greeting: string; emoji: string } {
  const greetings: Record<DayPart, { greeting: string; emoji: string }> = {
    early_morning: { greeting: "Rise & shine", emoji: "🌅" },
    morning: { greeting: "Good morning", emoji: "☀️" },
    lunch: { greeting: "Bon appétit", emoji: "🍽️" },
    afternoon: { greeting: "Good afternoon", emoji: "☀️" },
    evening: { greeting: "Good evening", emoji: "🌆" },
    night: { greeting: "Good night", emoji: "🌙" },
    late_night: { greeting: "Still up?", emoji: "🦉" },
  };
  return greetings[ctx.dayPart];
}

export function getContextualQuickSuggestion(ctx: DashboardContext): { text: string; route: string; icon: string } | null {
  if (ctx.dayPart === "morning" && ctx.dayType === "weekday") {
    return { text: "Morning coffee nearby", route: "/browse/food?q=coffee", icon: "☕" };
  }
  if (ctx.dayPart === "lunch") {
    return { text: "Lunch spots near you", route: "/browse/food", icon: "🍽️" };
  }
  if (ctx.dayPart === "evening" && ctx.dayType === "weekend") {
    return { text: "Weekend dinner plans", route: "/browse/food?sort=rating", icon: "🍷" };
  }
  if (ctx.dayPart === "evening" && ctx.dayType === "weekday") {
    return { text: "Order dinner delivery", route: "/browse/food?mode=delivery", icon: "📦" };
  }
  if (ctx.dayType === "weekend" && (ctx.dayPart === "morning" || ctx.dayPart === "afternoon")) {
    return { text: "Explore weekend activities", route: "/browse/services", icon: "🎯" };
  }
  return null;
}
