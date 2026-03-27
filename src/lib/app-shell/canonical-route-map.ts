export type CanonicalAppRoute =
  | "dashboard"
  | "orbit"
  | "wallet"
  | "radar"
  | "me"
  | "marketplace"
  | "travel"
  | "property_management"
  | "admin_cockpit";

export const CANONICAL_ROUTE_MAP: Record<CanonicalAppRoute, string[]> = {
  dashboard: ["/dashboard"],
  orbit: ["/orbit"],
  wallet: ["/wallet"],
  radar: ["/radar", "/map"],
  me: ["/me", "/profile"],
  marketplace: ["/marketplace"],
  travel: ["/travel", "/travel/hotel", "/travel/hotel-checkout"],
  property_management: ["/tenant", "/dashboard/property-management"],
  admin_cockpit: ["/admin/engine-cockpit", "/admin/engines"],
};

export function resolveCanonicalArea(pathname: string): CanonicalAppRoute | null {
  const normalized = pathname.toLowerCase();

  for (const [area, routes] of Object.entries(CANONICAL_ROUTE_MAP)) {
    if (routes.some((route) => normalized.startsWith(route.toLowerCase()))) {
      return area as CanonicalAppRoute;
    }
  }

  return null;
}
