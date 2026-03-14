/**
 * Unified route mapping for all target types.
 * Single source of truth for notification → page navigation.
 */
import type { TargetType, AppModule, DeepLinkMeta } from "./types";

/** Route definitions per target type, for landlord and tenant portals */
const TARGET_ROUTES: Record<TargetType, { landlord: string; tenant?: string }> = {
  // Long-term
  lease:               { landlord: "/dashboard/leases",          tenant: "/tenant/documents" },
  tenant:              { landlord: "/dashboard/tenants" },
  payment:             { landlord: "/dashboard/rental",          tenant: "/tenant/pay" },
  receipt:             { landlord: "/dashboard/receipts",         tenant: "/tenant/receipts" },
  document:            { landlord: "/dashboard/documents",        tenant: "/tenant/documents" },
  intervention:        { landlord: "/dashboard/interventions",    tenant: "/tenant/requests" },
  invoice:             { landlord: "/dashboard/finances" },
  dunning:             { landlord: "/dashboard/dunning" },
  expense:             { landlord: "/dashboard/expenses" },
  // Seasonal
  booking_request:     { landlord: "/dashboard/seasonal" },
  // Marketplace / Concierge
  marketplace_booking: { landlord: "/dashboard/activities" },
  marketplace_service: { landlord: "/dashboard/activities" },
  concierge_order:     { landlord: "/dashboard/activities" },
  concierge_service:   { landlord: "/dashboard/activities" },
  // Real Estate
  real_estate_lead:    { landlord: "/dashboard/real-estate?tab=leads" },
  real_estate_listing: { landlord: "/dashboard/real-estate" },
  // Deal Room
  deal:                { landlord: "/dashboard/communication" },
  offer:               { landlord: "/dashboard/communication" },
  counter_offer:       { landlord: "/dashboard/communication" },
  // General
  message:             { landlord: "/dashboard/communication",   tenant: "/tenant/messages" },
};

/** Fallback routes by notification type (legacy support) */
const TYPE_FALLBACKS: Record<string, string> = {
  payment: "/dashboard/rental",
  message: "/dashboard/communication",
  document: "/dashboard/documents",
  dunning: "/dashboard/dunning",
  rent_call: "/dashboard/rental",
  request: "/dashboard/interventions",
  receipt: "/dashboard/receipts",
  info: "/dashboard",
};

/**
 * Resolve the navigation target URL from a notification record.
 * Works consistently for all 3 modules.
 */
export function resolveTarget(notification: any, activeRole: string): string {
  const meta = notification.metadata_json as DeepLinkMeta | null;

  // 1. If metadata has a pre-built target_url, use it (with tenant remap if needed)
  if (meta?.target_url) {
    let url = meta.target_url;
    if (activeRole === "tenant" && meta.target_type) {
      const routeInfo = TARGET_ROUTES[meta.target_type];
      if (routeInfo?.tenant) {
        const [, qs] = url.split("?");
        url = qs ? `${routeInfo.tenant}?${qs}` : routeInfo.tenant;
      }
    }
    if (meta.country_code && !url.includes("country=")) {
      url += (url.includes("?") ? "&" : "?") + `country=${meta.country_code}`;
    }
    return url;
  }

  // 2. Build URL from target_type + IDs
  if (meta?.target_type) {
    const routeInfo = TARGET_ROUTES[meta.target_type];
    if (routeInfo) {
      const basePath = activeRole === "tenant" && routeInfo.tenant
        ? routeInfo.tenant
        : routeInfo.landlord;
      const params = new URLSearchParams();
      if (meta.country_code) params.set("country", meta.country_code);
      if (meta.target_id) params.set("record", meta.target_id);
      if (meta.booking_id) params.set("booking", meta.booking_id);
      const qs = params.toString();
      return qs ? `${basePath}?${qs}` : basePath;
    }
  }

  // 3. Legacy fallback: use notification.link
  if (notification.link) return notification.link;

  // 4. Last resort: fall back by notification type
  return TYPE_FALLBACKS[notification.type] || "/dashboard";
}

/** Detect which module a notification belongs to */
export function detectModule(notification: any): AppModule | null {
  const meta = notification.metadata_json as DeepLinkMeta | null;
  if (meta?.module) return meta.module;

  const targetType = meta?.target_type || "";
  const link = meta?.target_url || notification.link || "";

  if (targetType === "marketplace_booking" || targetType === "marketplace_service" || link.includes("/activities")) return "marketplace";
  if (targetType === "concierge_order" || targetType === "concierge_service" || link.includes("/concierge")) return "marketplace";
  if (targetType === "booking_request" || link.includes("/seasonal")) return "seasonal";
  if (["lease", "tenant", "payment", "receipt", "document", "intervention", "invoice", "dunning", "expense"].includes(targetType)) return "long_term";
  if (link.includes("/rental") || link.includes("/tenant/pay") || link.includes("/tenant/receipts")) return "long_term";
  return null;
}

/** Detect which portal a notification belongs to */
export function detectPortal(notification: any): "tenant" | "landlord" | "both" {
  const meta = notification.metadata_json;
  const link = meta?.target_url || notification.link || "";
  if (link.startsWith("/tenant")) return "tenant";
  if (link.startsWith("/dashboard")) return "landlord";
  if (notification.type === "message") return "both";
  return "both";
}

/**
 * Build a standard target_url from target_type and IDs.
 * Used when creating notifications to pre-build the URL.
 * This is the SINGLE SOURCE OF TRUTH for all deep-link URLs.
 */
export function buildTargetUrl(targetType: TargetType, ids: {
  targetId?: string;
  bookingId?: string;
  countryCode?: string;
  role?: "landlord" | "tenant";
}): string {
  const routeInfo = TARGET_ROUTES[targetType];
  if (!routeInfo) return "/dashboard";

  const rawPath = ids.role === "tenant" && routeInfo.tenant
    ? routeInfo.tenant
    : routeInfo.landlord;

  // Split existing query string from base path (e.g. "/dashboard/real-estate?tab=leads")
  const [basePath, existingQs] = rawPath.split("?");
  const params = new URLSearchParams(existingQs || "");
  if (ids.countryCode) params.set("country", ids.countryCode);
  if (ids.bookingId) params.set("booking", ids.bookingId);
  else if (ids.targetId) params.set("record", ids.targetId);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/**
 * Build an absolute URL for emails.
 * Uses APP_BASE_URL to generate full clickable links.
 */
export function buildAbsoluteTargetUrl(
  baseUrl: string,
  targetType: TargetType,
  ids: { targetId?: string; bookingId?: string; countryCode?: string; role?: "landlord" | "tenant" }
): string {
  const path = buildTargetUrl(targetType, ids);
  const cleanBase = baseUrl.replace(/\/$/, "");
  return `${cleanBase}${path}`;
}

export { TARGET_ROUTES, TYPE_FALLBACKS };
