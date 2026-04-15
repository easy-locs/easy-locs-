import { registerRouteChunk } from "./route-prefetch";

export function registerAllRouteChunks(): void {
  registerRouteChunk("/dashboard", () => import("@/pages/Dashboard"));
  registerRouteChunk("/properties", () => import("@/pages/AddProperty"));
  registerRouteChunk("/leases", () => import("@/pages/Leases"));
  registerRouteChunk("/tenants", () => import("@/pages/Tenants"));
  registerRouteChunk("/receipts", () => import("@/pages/Receipts"));
  registerRouteChunk("/documents", () => import("@/pages/Documents"));
  registerRouteChunk("/finances", () => import("@/pages/Finances"));
  registerRouteChunk("/reminders", () => import("@/pages/Reminders"));
  registerRouteChunk("/tasks", () => import("@/pages/Tasks"));
  registerRouteChunk("/settings", () => import("@/pages/Settings"));

  registerRouteChunk("/radar", () => import("@/pages/HyperRadarPage"));
  registerRouteChunk("/explore", () => import("@/pages/ExplorePage"));
  registerRouteChunk("/discover", () => import("@/pages/universe/DiscoverPage"));
  registerRouteChunk("/travel", () => import("@/pages/travel/TravelHub"));
  registerRouteChunk("/mobility", () => import("@/pages/mobility/MobilityHubPage"));
  registerRouteChunk("/food", () => import("@/pages/food/FoodTypePage"));
  registerRouteChunk("/search", () => import("@/pages/SearchResultsPage"));

  registerRouteChunk("/orbit", () => import("@/pages/OrbitContactsPage"));
  registerRouteChunk("/orbit/contacts", () => import("@/pages/OrbitContactsPage"));
  registerRouteChunk("/orbit/identity", () => import("@/pages/OrbitIdentityPage"));

  registerRouteChunk("/wallet", () => import("@/pages/WalletHubPage"));
  registerRouteChunk("/checkout", () => import("@/pages/CheckoutPage"));
  registerRouteChunk("/orders", () => import("@/pages/MyOrdersPage"));
  registerRouteChunk("/pos", () => import("@/pages/POSPage"));

  registerRouteChunk("/me", () => import("@/pages/MeCommandCenter"));
  registerRouteChunk("/favorites", () => import("@/pages/FavoritesPage"));
  registerRouteChunk("/install", () => import("@/pages/Install"));
  registerRouteChunk("/notifications", () => import("@/pages/notifications/NotificationCenterPage"));
  registerRouteChunk("/merchant", () => import("@/pages/MerchantDashboardPage"));
  registerRouteChunk("/driver", () => import("@/pages/driver/DriverDashboardPage"));
}
