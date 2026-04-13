import { platformBus } from "@/lib/shared/platform-bus";

export type AnalyticsEventCategory = "page_view" | "action" | "commerce" | "engagement" | "system" | "error";
export type FunnelStage = "awareness" | "consideration" | "intent" | "purchase" | "retention" | "advocacy";

export interface AnalyticsEvent {
  eventId: string;
  eventName: string;
  category: AnalyticsEventCategory;
  userId: string | null;
  sessionId: string;
  properties: Record<string, unknown>;
  timestamp: number;
  vertical: string | null;
  source: string;
}

export interface FunnelDefinition {
  funnelId: string;
  name: string;
  steps: Array<{ stepId: string; eventName: string; label: string }>;
  vertical: string | null;
}

export interface RetentionCohort {
  cohortDate: string;
  userCount: number;
  retainedByDay: Record<number, number>;
}

export interface FeatureFlag {
  flagId: string;
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRoles: string[];
  targetCountries: string[];
  variant: string | null;
}

export interface ABTest {
  testId: string;
  name: string;
  status: "draft" | "running" | "paused" | "completed";
  variants: Array<{ variantId: string; name: string; weight: number }>;
  primaryMetric: string;
  startedAt: string | null;
  endedAt: string | null;
}

const COMMERCE_FUNNEL: FunnelDefinition = {
  funnelId: "commerce_purchase",
  name: "Purchase Funnel",
  steps: [
    { stepId: "view", eventName: "listing:viewed", label: "View Listing" },
    { stepId: "add_cart", eventName: "cart:updated", label: "Add to Cart" },
    { stepId: "checkout", eventName: "cart:checked_out", label: "Checkout" },
    { stepId: "payment", eventName: "wallet:payment_success", label: "Payment" },
    { stepId: "complete", eventName: "transaction:completed", label: "Complete" },
  ],
  vertical: null,
};

const BOOKING_FUNNEL: FunnelDefinition = {
  funnelId: "booking_flow",
  name: "Booking Funnel",
  steps: [
    { stepId: "search", eventName: "USER_SEARCH", label: "Search" },
    { stepId: "view", eventName: "listing:viewed", label: "View Listing" },
    { stepId: "book", eventName: "marketplace:booking_created", label: "Book" },
    { stepId: "pay", eventName: "marketplace:booking_paid", label: "Pay" },
    { stepId: "complete", eventName: "marketplace:booking_completed", label: "Complete" },
  ],
  vertical: null,
};

const SELLER_ONBOARDING_FUNNEL: FunnelDefinition = {
  funnelId: "seller_onboarding",
  name: "Seller Onboarding",
  steps: [
    { stepId: "start", eventName: "onboarding:started", label: "Start" },
    { stepId: "profile", eventName: "onboarding:step_completed", label: "Profile" },
    { stepId: "listing", eventName: "listing:created", label: "First Listing" },
    { stepId: "publish", eventName: "marketplace:listing_published", label: "Publish" },
    { stepId: "first_sale", eventName: "marketplace:vente_completed", label: "First Sale" },
  ],
  vertical: null,
};

export const STANDARD_FUNNELS: FunnelDefinition[] = [COMMERCE_FUNNEL, BOOKING_FUNNEL, SELLER_ONBOARDING_FUNNEL];

const eventBuffer: AnalyticsEvent[] = [];
const BUFFER_MAX = 500;

export function trackEvent(
  eventName: string,
  category: AnalyticsEventCategory,
  properties: Record<string, unknown>,
  userId: string | null,
  sessionId: string,
  vertical: string | null = null
): void {
  const event: AnalyticsEvent = {
    eventId: `ae_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    eventName,
    category,
    userId,
    sessionId,
    properties,
    timestamp: Date.now(),
    vertical,
    source: "client",
  };
  eventBuffer.push(event);
  if (eventBuffer.length > BUFFER_MAX) eventBuffer.shift();
}

export function getEventBuffer(): readonly AnalyticsEvent[] {
  return eventBuffer;
}

export function flushEventBuffer(): AnalyticsEvent[] {
  return eventBuffer.splice(0, eventBuffer.length);
}

const featureFlags = new Map<string, FeatureFlag>();

export function setFeatureFlag(flag: FeatureFlag): void {
  featureFlags.set(flag.flagId, flag);
}

export function isFeatureEnabled(flagId: string, userRole?: string, userCountry?: string): boolean {
  const flag = featureFlags.get(flagId);
  if (!flag || !flag.enabled) return false;
  if (flag.targetRoles.length > 0 && userRole && !flag.targetRoles.includes(userRole)) return false;
  if (flag.targetCountries.length > 0 && userCountry && !flag.targetCountries.includes(userCountry)) return false;
  if (flag.rolloutPercentage < 100) {
    const hash = flagId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100;
    if (hash >= flag.rolloutPercentage) return false;
  }
  return true;
}

export function getABTestVariant(testId: string, userId: string): string | null {
  const hash = (testId + userId).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100;
  return hash < 50 ? "control" : "variant";
}

export function installAnalyticsBusListener(): () => void {
  const unsub = platformBus.onAll((event) => {
    if (event.type.startsWith("engine:") || event.type.startsWith("repair:")) return;
    trackEvent(event.type, "system", { source: event.source }, event.userId ?? null, "bus", null);
  });
  return unsub;
}
