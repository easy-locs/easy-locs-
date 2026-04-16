export type UserTier = "free" | "premium" | "enterprise";

export interface TierLimitOverride {
  maxRequests: number;
  windowSeconds?: number;
}

export const TIER_ENDPOINT_LIMITS: Record<UserTier, Record<string, TierLimitOverride>> = {
  free: {},
  premium: {
    "extract-article": { maxRequests: 30 },
    "ai-assistant": { maxRequests: 120 },
    "generate-seo": { maxRequests: 120 },
    "send-message": { maxRequests: 60 },
    "send-orbit-message": { maxRequests: 60 },
  },
  enterprise: {
    "extract-article": { maxRequests: 100 },
    "ai-assistant": { maxRequests: 300 },
    "generate-seo": { maxRequests: 300 },
    "send-message": { maxRequests: 120 },
    "send-orbit-message": { maxRequests: 120 },
    "booking-create": { maxRequests: 120 },
    "dispatch-delivery": { maxRequests: 120 },
    "dispatch-ride": { maxRequests: 120 },
  },
};

export const TIER_GLOBAL_MULTIPLIERS: Record<UserTier, number> = {
  free: 1,
  premium: 2,
  enterprise: 5,
};

const DEFAULT_TIER: UserTier = "free";

const AUTH_LIMIT = { maxRequests: 5, windowSeconds: 60 };
const PAYMENT_LIMIT = { maxRequests: 10, windowSeconds: 60 };
const STANDARD_LIMIT = { maxRequests: 60, windowSeconds: 60 };
const RELAXED_LIMIT = { maxRequests: 60, windowSeconds: 60 };
const MESSAGE_LIMIT = { maxRequests: 30, windowSeconds: 60 };

export const ENDPOINT_LIMITS: Record<string, { maxRequests: number; windowSeconds: number }> = {
  "send-otp": AUTH_LIMIT,
  "verify-otp": AUTH_LIMIT,
  "wallet-pin": AUTH_LIMIT,
  "reveal-contact": AUTH_LIMIT,
  "get-turn-credentials": AUTH_LIMIT,
  "login": AUTH_LIMIT,

  "create-checkout": PAYMENT_LIMIT,
  "create-stripe-intent": PAYMENT_LIMIT,
  "create-listing-checkout": PAYMENT_LIMIT,
  "create-storefront-checkout": PAYMENT_LIMIT,
  "create-wallet-topup": PAYMENT_LIMIT,
  "create-legal-notice-payment": PAYMENT_LIMIT,
  "wallet-transfer": PAYMENT_LIMIT,
  "wallet-ops": PAYMENT_LIMIT,
  "orbit-payment": PAYMENT_LIMIT,
  "rent-payment": PAYMENT_LIMIT,
  "rent-create-payment": PAYMENT_LIMIT,
  "purchase-locs": PAYMENT_LIMIT,
  "process-refund": PAYMENT_LIMIT,
  "refund-process-booking": PAYMENT_LIMIT,
  "refund-request-booking": PAYMENT_LIMIT,
  "payout-request-create": PAYMENT_LIMIT,
  "admin-payout-approve": PAYMENT_LIMIT,
  "admin-payout-reject": PAYMENT_LIMIT,
  "collect-sepa-rents": PAYMENT_LIMIT,
  "customer-portal": PAYMENT_LIMIT,
  "create-connect-account": PAYMENT_LIMIT,
  "disconnect-stripe": PAYMENT_LIMIT,

  "send-message": MESSAGE_LIMIT,
  "send-orbit-message": MESSAGE_LIMIT,

  "booking-create": STANDARD_LIMIT,
  "booking-approve": STANDARD_LIMIT,
  "booking-complete": STANDARD_LIMIT,
  "booking-reject": STANDARD_LIMIT,
  "dispatch-delivery": STANDARD_LIMIT,
  "dispatch-ride": STANDARD_LIMIT,
  "order-manage": STANDARD_LIMIT,
  "send-email": STANDARD_LIMIT,
  "send-notification-email": STANDARD_LIMIT,
  "email-enqueue": STANDARD_LIMIT,
  "notification-dispatcher": STANDARD_LIMIT,
  "send-sms": STANDARD_LIMIT,
  "ai-assistant": STANDARD_LIMIT,
  "ai-web-search": MESSAGE_LIMIT,
  "generate-seo": STANDARD_LIMIT,
  "public-health": STANDARD_LIMIT,
  "extract-article": PAYMENT_LIMIT,

  "check-connect-status": RELAXED_LIMIT,
  "check-subscription": RELAXED_LIMIT,
  "export-ical": RELAXED_LIMIT,
  "sync-ical": RELAXED_LIMIT,
  "dispatch-webhook": RELAXED_LIMIT,
  "cleanup-expired-media": RELAXED_LIMIT,
  "cleanup-expired-messages": RELAXED_LIMIT,
  "send-push-notification": RELAXED_LIMIT,
  "alert-dispatcher": RELAXED_LIMIT,

  "default": RELAXED_LIMIT,
};

export function resolveUserTier(tier: string | null | undefined): UserTier {
  if (tier === "premium" || tier === "enterprise") return tier;
  return DEFAULT_TIER;
}

export function getEndpointLimit(endpoint: string): { maxRequests: number; windowSeconds: number } {
  return ENDPOINT_LIMITS[endpoint] ?? ENDPOINT_LIMITS["default"];
}

export function getTierEndpointLimit(
  endpoint: string,
  tier: UserTier = DEFAULT_TIER,
): { maxRequests: number; windowSeconds: number } {
  const baseLimits = getEndpointLimit(endpoint);
  const tierOverride = TIER_ENDPOINT_LIMITS[tier]?.[endpoint];

  if (tierOverride) {
    return {
      maxRequests: tierOverride.maxRequests,
      windowSeconds: tierOverride.windowSeconds ?? baseLimits.windowSeconds,
    };
  }

  const multiplier = TIER_GLOBAL_MULTIPLIERS[tier];
  if (multiplier !== 1) {
    return {
      maxRequests: Math.floor(baseLimits.maxRequests * multiplier),
      windowSeconds: baseLimits.windowSeconds,
    };
  }

  return baseLimits;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimitHeaders(
  result: RateLimitResult,
  maxRequests: number,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(maxRequests),
    "X-RateLimit-Remaining": String(result.remaining),
  };

  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}
