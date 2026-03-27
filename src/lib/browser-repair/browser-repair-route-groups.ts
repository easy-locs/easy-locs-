export const BROWSER_REPAIR_ROUTE_GROUPS: Record<string, string> = {
  "/orbit": "orbit",
  "/wallet": "wallet",
  "/dashboard": "dashboard",
  "/travel": "travel",
  "/marketplace": "marketplace",
  "/map": "radar",
  "/onboarding": "onboarding",
  "/admin/engine-cockpit": "cockpit",
  "/notifications": "notifications",
};

export function resolveRouteGroup(route: string) {
  const hit = Object.entries(BROWSER_REPAIR_ROUTE_GROUPS).find(([prefix]) =>
    route.startsWith(prefix)
  );
  return hit?.[1] ?? "other";
}
