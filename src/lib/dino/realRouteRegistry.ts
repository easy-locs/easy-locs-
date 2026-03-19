/**
 * DINO Real Route Registry — Maps all app routes for audit/quality tracking.
 */

export const REAL_ROUTE_REGISTRY = [
  { route: "/", pageKey: "home", serviceKey: "orbit", requiresAuth: false },
  { route: "/food", pageKey: "food_home", serviceKey: "food", requiresAuth: false },
  { route: "/food/delivery", pageKey: "food_delivery", serviceKey: "food", requiresAuth: false },
  { route: "/food/pickup", pageKey: "food_pickup", serviceKey: "food", requiresAuth: false },
  { route: "/food/restaurant/:id", pageKey: "restaurant_page", serviceKey: "food", requiresAuth: false },
  { route: "/property/:id", pageKey: "property_public", serviceKey: "property", requiresAuth: false },
  { route: "/dashboard/property/:id", pageKey: "property_management", serviceKey: "property_admin", requiresAuth: true },
  { route: "/settings", pageKey: "settings_home", serviceKey: "settings", requiresAuth: true },
  { route: "/settings/account", pageKey: "settings_account", serviceKey: "settings", requiresAuth: true },
  { route: "/settings/business", pageKey: "settings_business", serviceKey: "settings", requiresAuth: true },
  { route: "/map", pageKey: "global_map", serviceKey: "geo", requiresAuth: false },
  { route: "/radar", pageKey: "global_radar", serviceKey: "geo", requiresAuth: false },
  { route: "/admin/dino", pageKey: "dino_dashboard", serviceKey: "admin", requiresAuth: true },
  { route: "/admin/dino-dashboard", pageKey: "dino_control_tower", serviceKey: "admin", requiresAuth: true },
  { route: "/shops", pageKey: "shops_home", serviceKey: "shops", requiresAuth: false },
  { route: "/shops/:slug", pageKey: "shop_page", serviceKey: "shops", requiresAuth: false },
  { route: "/travel", pageKey: "travel_home", serviceKey: "travel", requiresAuth: false },
  { route: "/grocery", pageKey: "grocery_home", serviceKey: "grocery", requiresAuth: false },
  { route: "/services", pageKey: "services_home", serviceKey: "services", requiresAuth: false },
  { route: "/ride", pageKey: "ride_home", serviceKey: "ride", requiresAuth: true },
  { route: "/wallet", pageKey: "wallet_home", serviceKey: "wallet", requiresAuth: true },
] as const;

export type RealRouteEntry = (typeof REAL_ROUTE_REGISTRY)[number];

export function findRouteEntry(pathname: string): RealRouteEntry | undefined {
  return REAL_ROUTE_REGISTRY.find((r) => {
    const pattern = r.route.replace(/:[\w]+/g, "[^/]+");
    return new RegExp(`^${pattern}$`).test(pathname);
  });
}
