import { createClient } from "npm:@supabase/supabase-js@2.57.2";

export interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  currentCount: number;
}

const AUTH_LIMIT = { maxRequests: 5, windowSeconds: 60 };
const PAYMENT_LIMIT = { maxRequests: 10, windowSeconds: 60 };
const STANDARD_LIMIT = { maxRequests: 60, windowSeconds: 60 };
const RELAXED_LIMIT = { maxRequests: 60, windowSeconds: 60 };

const ENDPOINT_LIMITS: Record<string, { maxRequests: number; windowSeconds: number }> = {
  "send-otp": AUTH_LIMIT,
  "verify-otp": AUTH_LIMIT,
  "wallet-pin": AUTH_LIMIT,
  "reveal-contact": AUTH_LIMIT,
  "get-turn-credentials": AUTH_LIMIT,

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
  "generate-seo": STANDARD_LIMIT,
  "public-health": STANDARD_LIMIT,

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

export function getClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
    return parts[0] || "unknown";
  }

  return "unknown";
}

export function getEndpointLimit(endpoint: string): { maxRequests: number; windowSeconds: number } {
  return ENDPOINT_LIMITS[endpoint] ?? ENDPOINT_LIMITS["default"];
}

export async function checkServerRateLimit(
  req: Request,
  endpoint: string,
  config?: Partial<RateLimitConfig>
): Promise<RateLimitResult> {
  const clientIp = getClientIp(req);
  const limits = getEndpointLimit(endpoint);
  const maxRequests = config?.maxRequests ?? limits.maxRequests;
  const windowSeconds = config?.windowSeconds ?? limits.windowSeconds;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const windowStart = new Date(
    Math.floor(Date.now() / (windowSeconds * 1000)) * (windowSeconds * 1000)
  ).toISOString();

  let currentCount = 1;
  try {
    const { data, error } = await supabase.rpc("atomic_rate_limit_increment", {
      p_endpoint: endpoint,
      p_client_ip: clientIp,
      p_window_start: windowStart,
    });
    if (!error && typeof data === "number") {
      currentCount = data;
    }
  } catch {
    currentCount = 1;
  }

  const allowed = currentCount <= maxRequests;
  const remaining = Math.max(0, maxRequests - currentCount);
  const windowEnd = new Date(windowStart).getTime() + windowSeconds * 1000;
  const retryAfterSeconds = allowed ? 0 : Math.ceil((windowEnd - Date.now()) / 1000);

  return { allowed, remaining, retryAfterSeconds, currentCount };
}

export function rateLimitHeaders(result: RateLimitResult, maxRequests: number): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(maxRequests),
    "X-RateLimit-Remaining": String(result.remaining),
  };

  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfterSeconds);
  }

  return headers;
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({
      error: "Too Many Requests",
      retry_after_seconds: result.retryAfterSeconds,
      remaining: result.remaining,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSeconds),
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
