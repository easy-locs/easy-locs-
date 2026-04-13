import { platformBus } from "@/lib/shared/platform-bus";

export type APIVersion = "v1" | "v2";
export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type RateLimitTier = "public" | "authenticated" | "premium" | "internal";

export interface APIEndpoint {
  path: string;
  method: HTTPMethod;
  version: APIVersion;
  requiresAuth: boolean;
  rateLimitTier: RateLimitTier;
  scopes: string[];
  deprecated: boolean;
  description: string;
}

export interface RateLimitConfig {
  tier: RateLimitTier;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

export interface APIKey {
  keyId: string;
  tenantId: string;
  name: string;
  prefix: string;
  scopes: string[];
  rateLimitTier: RateLimitTier;
  createdAt: number;
  expiresAt: number | null;
  lastUsedAt: number | null;
  status: "active" | "revoked" | "expired";
}

export interface WebhookSubscription {
  webhookId: string;
  tenantId: string;
  url: string;
  events: string[];
  secret: string;
  status: "active" | "disabled" | "failing";
  failureCount: number;
  lastDeliveredAt: number | null;
  createdAt: number;
}

export interface APIMetrics {
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorsByCode: Record<number, number>;
  topEndpoints: Array<{ path: string; count: number }>;
}

const RATE_LIMITS: Record<RateLimitTier, RateLimitConfig> = {
  public: { tier: "public", requestsPerMinute: 30, requestsPerHour: 500, requestsPerDay: 5000, burstLimit: 10 },
  authenticated: { tier: "authenticated", requestsPerMinute: 60, requestsPerHour: 2000, requestsPerDay: 20000, burstLimit: 20 },
  premium: { tier: "premium", requestsPerMinute: 120, requestsPerHour: 5000, requestsPerDay: 50000, burstLimit: 40 },
  internal: { tier: "internal", requestsPerMinute: 1000, requestsPerHour: 50000, requestsPerDay: 500000, burstLimit: 200 },
};

const API_ENDPOINTS: APIEndpoint[] = [
  { path: "/api/v1/listings", method: "GET", version: "v1", requiresAuth: false, rateLimitTier: "public", scopes: ["listings:read"], deprecated: false, description: "List all listings" },
  { path: "/api/v1/listings", method: "POST", version: "v1", requiresAuth: true, rateLimitTier: "authenticated", scopes: ["listings:write"], deprecated: false, description: "Create a listing" },
  { path: "/api/v1/listings/:id", method: "GET", version: "v1", requiresAuth: false, rateLimitTier: "public", scopes: ["listings:read"], deprecated: false, description: "Get listing by ID" },
  { path: "/api/v1/listings/:id", method: "PUT", version: "v1", requiresAuth: true, rateLimitTier: "authenticated", scopes: ["listings:write"], deprecated: false, description: "Update listing" },
  { path: "/api/v1/listings/:id", method: "DELETE", version: "v1", requiresAuth: true, rateLimitTier: "authenticated", scopes: ["listings:write"], deprecated: false, description: "Delete listing" },
  { path: "/api/v1/orders", method: "GET", version: "v1", requiresAuth: true, rateLimitTier: "authenticated", scopes: ["orders:read"], deprecated: false, description: "List user orders" },
  { path: "/api/v1/orders", method: "POST", version: "v1", requiresAuth: true, rateLimitTier: "authenticated", scopes: ["orders:write"], deprecated: false, description: "Create order" },
  { path: "/api/v1/orders/:id", method: "GET", version: "v1", requiresAuth: true, rateLimitTier: "authenticated", scopes: ["orders:read"], deprecated: false, description: "Get order details" },
  { path: "/api/v1/wallet/balance", method: "GET", version: "v1", requiresAuth: true, rateLimitTier: "authenticated", scopes: ["wallet:read"], deprecated: false, description: "Get wallet balance" },
  { path: "/api/v1/wallet/transfer", method: "POST", version: "v1", requiresAuth: true, rateLimitTier: "authenticated", scopes: ["wallet:transfer"], deprecated: false, description: "Transfer funds" },
  { path: "/api/v1/users/me", method: "GET", version: "v1", requiresAuth: true, rateLimitTier: "authenticated", scopes: ["profile:read"], deprecated: false, description: "Get current user profile" },
  { path: "/api/v1/users/me", method: "PATCH", version: "v1", requiresAuth: true, rateLimitTier: "authenticated", scopes: ["profile:write"], deprecated: false, description: "Update profile" },
  { path: "/api/v1/search", method: "GET", version: "v1", requiresAuth: false, rateLimitTier: "public", scopes: ["search:read"], deprecated: false, description: "Search listings" },
  { path: "/api/v1/webhooks", method: "POST", version: "v1", requiresAuth: true, rateLimitTier: "premium", scopes: ["webhooks:manage"], deprecated: false, description: "Create webhook" },
  { path: "/api/v1/webhooks", method: "GET", version: "v1", requiresAuth: true, rateLimitTier: "premium", scopes: ["webhooks:read"], deprecated: false, description: "List webhooks" },
];

export function getEndpoint(path: string, method: HTTPMethod): APIEndpoint | undefined {
  return API_ENDPOINTS.find((e) => e.path === path && e.method === method);
}

export function getAllEndpoints(): readonly APIEndpoint[] {
  return API_ENDPOINTS;
}

export function getRateLimit(tier: RateLimitTier): RateLimitConfig {
  return RATE_LIMITS[tier];
}

export function isRateLimited(
  tier: RateLimitTier,
  requestsInLastMinute: number,
  requestsInLastHour: number
): { limited: boolean; retryAfterSeconds: number } {
  const config = RATE_LIMITS[tier];
  if (requestsInLastMinute >= config.requestsPerMinute) {
    return { limited: true, retryAfterSeconds: 60 };
  }
  if (requestsInLastHour >= config.requestsPerHour) {
    return { limited: true, retryAfterSeconds: 3600 };
  }
  return { limited: false, retryAfterSeconds: 0 };
}

export function hasScope(apiKey: APIKey, requiredScope: string): boolean {
  if (apiKey.scopes.includes("*")) return true;
  return apiKey.scopes.includes(requiredScope);
}

export function isAPIKeyValid(key: APIKey): boolean {
  if (key.status !== "active") return false;
  if (key.expiresAt && Date.now() > key.expiresAt) return false;
  return true;
}

export function shouldRetryWebhook(sub: WebhookSubscription): boolean {
  if (sub.status === "disabled") return false;
  return sub.failureCount < 10;
}

export function emitAPIRequest(path: string, method: HTTPMethod, statusCode: number, latencyMs: number): void {
  platformBus.emit("api:request_completed", {
    path, method, statusCode, latencyMs, timestamp: Date.now(),
  }, "api-gateway");
}

export function emitRateLimitHit(tenantId: string, tier: RateLimitTier, endpoint: string): void {
  platformBus.emit("api:rate_limit_hit", {
    tenantId, tier, endpoint, timestamp: Date.now(),
  }, "api-gateway");
}

export function emitWebhookDelivered(webhookId: string, event: string, success: boolean): void {
  platformBus.emit("api:webhook_delivered", {
    webhookId, event, success, timestamp: Date.now(),
  }, "api-gateway");
}
