import { getSmartCoreState } from "@/lib/smart-core";
import { WALLET_LOW_BALANCE_CRITICAL, WALLET_LOW_BALANCE_WARNING } from "@/lib/wallet/wallet-config";

export type DayPart = "early_morning" | "morning" | "lunch" | "afternoon" | "evening" | "night" | "late_night";
export type DayType = "weekday" | "weekend" | "holiday";

export interface DashboardContext {
  hour: number;
  dayPart: DayPart;
  dayType: DayType;
  userId: string | null;
  hasWallet: boolean;
  walletBalance: number;
  walletCurrency: string;
  unreadMessages: number;
  activeOrders: number;
  hasProfile: boolean;
  profileComplete: boolean;
  hasOrbit: boolean;
  profileFields?: ProfileFields;
}

/** Fields used to compute real profile completion percentage. */
export interface ProfileFields {
  hasName: boolean;
  hasAvatar: boolean;
  hasPhone: boolean;
  hasDocuments: boolean;
  hasPaymentMethod: boolean;
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

// ── Dashboard Configuration Constants ──────────────────────────────────────────
// Extract magic numbers here so thresholds can be tuned without touching logic.

/** Balance below this value triggers a "high urgency" low-balance warning. Sourced from wallet config. */
export const DASHBOARD_LOW_BALANCE_CRITICAL = WALLET_LOW_BALANCE_CRITICAL;

/** Balance below this value triggers a "medium urgency" low-balance reminder. Sourced from wallet config. */
export const DASHBOARD_LOW_BALANCE_WARNING = WALLET_LOW_BALANCE_WARNING;

/** Unread messages above this count boosts the orbit_preview section. */
export const DASHBOARD_UNREAD_ORBIT_BOOST_THRESHOLD = 3;

/** Resume items: minimum score to appear in continue section. */
export const DASHBOARD_RESUMABLE_MIN_SCORE = 2;

/** Resume items: must have been used within this many hours to appear. */
export const DASHBOARD_RESUMABLE_MAX_HOURS = 24;

/** Resume items: must be older than this many hours to avoid immediate re-suggestion. */
export const DASHBOARD_RESUMABLE_MIN_HOURS = 0.5;

// ── Section base weights ────────────────────────────────────────────────────────
export const SECTION_BASE_WEIGHTS: Record<DashboardSectionId, number> = {
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

// ── Routes that can be resumed ──────────────────────────────────────────────────

export const RESUMABLE_ROUTES: Record<string, { title: string; subtitle: string; icon: string; type: ContinueItem["type"] }> = {
  "/merchant/onboarding": { title: "Continue shop setup", subtitle: "Your shop is almost ready", icon: "🏪", type: "onboarding" },
  "/wallet/transfer": { title: "Complete your transfer", subtitle: "You started a payment", icon: "💸", type: "payment" },
  "/wallet/request": { title: "Finish your request", subtitle: "Send your payment request", icon: "📩", type: "payment" },
  "/checkout": { title: "Complete your order", subtitle: "Items are waiting in your cart", icon: "🛒", type: "cart" },
  "/stay": { title: "Continue browsing hotels", subtitle: "Find your perfect stay", icon: "🏨", type: "booking" },
  "/browse/food": { title: "Continue ordering food", subtitle: "Pick up where you left off", icon: "🍽️", type: "booking" },
};

// ── Pure functions ──────────────────────────────────────────────────────────────

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

/**
 * Compute real profile completion percentage from actual profile fields.
 * Each completed field contributes equally to the total score.
 */
export function computeProfileCompletion(fields: ProfileFields): number {
  const checks = [
    fields.hasName,
    fields.hasAvatar,
    fields.hasPhone,
    fields.hasDocuments,
    fields.hasPaymentMethod,
  ];
  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

export function buildDashboardContext(params: {
  userId: string | null;
  hasWallet: boolean;
  walletBalance: number;
  walletCurrency?: string;
  unreadMessages: number;
  activeOrders: number;
  hasProfile: boolean;
  profileComplete: boolean;
  hasOrbit: boolean;
  profileFields?: ProfileFields;
}): DashboardContext {
  const hour = new Date().getHours();
  // Derive dynamic currency from wallet store when not passed explicitly
  const walletCurrency = params.walletCurrency ?? _getActiveCurrency();
  return {
    hour,
    dayPart: getDayPart(hour),
    dayType: getDayType(),
    ...params,
    walletCurrency,
  };
}

/** Resolve the active display currency from wallet store or locale. */
function _getActiveCurrency(): string {
  try {
    const { useWalletStore } = require("@/stores/walletStore");
    const wallet = useWalletStore.getState()?.wallet;
    if (wallet?.currency) return wallet.currency;
  } catch {
    // store not available in non-browser env
  }
  try {
    const { getWalletDefaultCurrency } = require("@/lib/wallet/wallet-config");
    return getWalletDefaultCurrency();
  } catch {
    return "EUR";
  }
}

export function getContinueItems(ctx: DashboardContext): ContinueItem[] {
  const items: ContinueItem[] = [];
  const now = Date.now();

  if (!ctx.profileComplete && ctx.hasProfile) {
    // Use real completion percentage if profile fields are available
    const progress = ctx.profileFields
      ? computeProfileCompletion(ctx.profileFields)
      : 0;
    items.push({
      id: "continue-profile",
      type: "profile",
      title: "Complete your profile",
      subtitle: "Add photo and details to unlock full features",
      route: "/me/edit-profile",
      icon: "👤",
      progress,
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

  // Wire resume items to real navigation history from smart-core
  const smartState = getSmartCoreState();

  // Also check sessionStorage for incomplete form state
  const sessionResumable = _getSessionStorageResumable();

  const recentRoutes = Object.entries(smartState.featureUsage)
    .filter(([_route, data]) => {
      const last = data.lastUsed ?? 0;
      const hoursSince = (now - last) / (1000 * 60 * 60);
      return hoursSince < DASHBOARD_RESUMABLE_MAX_HOURS && hoursSince > DASHBOARD_RESUMABLE_MIN_HOURS && data.score >= DASHBOARD_RESUMABLE_MIN_SCORE;
    })
    .sort((a, b) => (b[1].lastUsed ?? 0) - (a[1].lastUsed ?? 0))
    .slice(0, 2);

  for (const [route] of recentRoutes) {
    const meta = RESUMABLE_ROUTES[route] ?? sessionResumable[route];
    if (meta) {
      // Use real progress from session storage if available, else 50 as neutral indicator
      const savedProgress = _getRouteProgress(route);
      items.push({
        id: `continue-${route.replace(/\//g, "-")}`,
        type: meta.type,
        title: meta.title,
        subtitle: meta.subtitle,
        route,
        icon: meta.icon,
        progress: savedProgress,
        urgency: "low",
        timestamp: smartState.featureUsage[route]?.lastUsed ?? now,
      });
    }
  }

  return items.slice(0, 3);
}

/**
 * Read any additional resumable routes stored in sessionStorage.
 * Components can write `dashboard_resumable_<route>` keys to register custom resume entries.
 */
function _getSessionStorageResumable(): Record<string, { title: string; subtitle: string; icon: string; type: ContinueItem["type"] }> {
  const result: Record<string, { title: string; subtitle: string; icon: string; type: ContinueItem["type"] }> = {};
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith("dashboard_resumable_")) {
        const route = key.replace("dashboard_resumable_", "/");
        const raw = sessionStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          result[route] = parsed;
        }
      }
    }
  } catch {
    // Non-browser or parse error
  }
  return result;
}

/**
 * Read saved form progress for a route from sessionStorage.
 * Components can write `dashboard_progress_<route>` with a 0-100 value.
 */
function _getRouteProgress(route: string): number {
  try {
    const key = `dashboard_progress_${route.replace(/\//g, "_")}`;
    const raw = sessionStorage.getItem(key);
    if (raw !== null) {
      const val = Number(raw);
      if (!isNaN(val) && val >= 0 && val <= 100) return val;
    }
  } catch {
    // Non-browser
  }
  return 50;
}

export function getSuggestedPayments(ctx: DashboardContext): SuggestedPayment[] {
  const payments: SuggestedPayment[] = [];
  const currency = ctx.walletCurrency;

  if (ctx.activeOrders > 0) {
    payments.push({
      id: "pay-active-orders",
      type: "pending_request",
      title: "Active orders",
      subtitle: `${ctx.activeOrders} order${ctx.activeOrders > 1 ? "s" : ""} in progress`,
      amount: null,
      currency,
      route: "/my-orders/active",
      icon: "📦",
      dueDate: null,
      urgency: "medium",
    });
  }

  if (ctx.hasWallet && ctx.walletBalance > 0 && ctx.walletBalance < DASHBOARD_LOW_BALANCE_WARNING) {
    const isCritical = ctx.walletBalance < DASHBOARD_LOW_BALANCE_CRITICAL;
    payments.push({
      id: "pay-low-balance",
      type: "reminder",
      title: "Top up wallet",
      subtitle: `Balance is low (${ctx.walletBalance.toFixed(0)} ${currency}${isCritical ? " — may not cover next payment" : ""})`,
      amount: null,
      currency,
      route: "/wallet",
      icon: "💳",
      dueDate: null,
      urgency: isCritical ? "high" : "medium",
    });
  }

  if (ctx.unreadMessages > DASHBOARD_UNREAD_ORBIT_BOOST_THRESHOLD) {
    payments.push({
      id: "pay-pending-messages",
      type: "pending_request",
      title: "Payment requests waiting",
      subtitle: "You may have pending payment requests in messages",
      amount: null,
      currency,
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
    if (id === "suggested_payments" && ctx.walletBalance < DASHBOARD_LOW_BALANCE_CRITICAL) {
      weight += 15;
      reason = "low balance urgency";
    }
    if (id === "orbit_preview" && ctx.unreadMessages > DASHBOARD_UNREAD_ORBIT_BOOST_THRESHOLD) {
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
