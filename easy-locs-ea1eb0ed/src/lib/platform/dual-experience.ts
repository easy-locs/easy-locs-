import type { AppRole } from "@/domains/shared/canonical-types";
import type { DeviceContext } from "@/lib/platform/responsive-system";

export type ExperienceMode = "client" | "provider" | "admin";

export interface ModuleVisibility {
  moduleId: string;
  label: string;
  visible: boolean;
  priority: number;
  route: string;
  icon: string;
  mobileVisible: boolean;
  desktopVisible: boolean;
}

export interface ExperienceConfig {
  mode: ExperienceMode;
  navStyle: "bottom_bar" | "sidebar" | "dual";
  availableModules: ModuleVisibility[];
  dashboardType: "client_home" | "provider_dashboard" | "admin_panel";
  orbitMode: "chat_list" | "split_view";
  walletMode: "quick_actions" | "full_finance";
  radarMode: "discovery" | "operations";
  primaryActions: string[];
}

const CLIENT_MODULES: ModuleVisibility[] = [
  { moduleId: "dashboard-core", label: "Home", visible: true, priority: 1, route: "/", icon: "Home", mobileVisible: true, desktopVisible: true },
  { moduleId: "radar-core", label: "Radar", visible: true, priority: 2, route: "/radar", icon: "Compass", mobileVisible: true, desktopVisible: true },
  { moduleId: "orbit-core", label: "Orbit", visible: true, priority: 3, route: "/orbit", icon: "MessageCircle", mobileVisible: true, desktopVisible: true },
  { moduleId: "wallet-core", label: "Wallet", visible: true, priority: 4, route: "/wallet", icon: "Wallet", mobileVisible: true, desktopVisible: true },
  { moduleId: "me-core", label: "Me", visible: true, priority: 5, route: "/me", icon: "User", mobileVisible: true, desktopVisible: true },
  { moduleId: "marketplace-core", label: "Marketplace", visible: true, priority: 6, route: "/marketplace", icon: "ShoppingBag", mobileVisible: true, desktopVisible: true },
  { moduleId: "flight-core", label: "Flights", visible: true, priority: 7, route: "/flights", icon: "Plane", mobileVisible: true, desktopVisible: true },
  { moduleId: "taxi-core", label: "Rides", visible: true, priority: 8, route: "/taxi", icon: "Car", mobileVisible: true, desktopVisible: true },
  { moduleId: "delivery-core", label: "Orders", visible: true, priority: 9, route: "/orders", icon: "Package", mobileVisible: true, desktopVisible: true },
  { moduleId: "support-core", label: "Support", visible: true, priority: 10, route: "/support", icon: "HelpCircle", mobileVisible: true, desktopVisible: true },
];

const PROVIDER_MODULES: ModuleVisibility[] = [
  { moduleId: "dashboard-core", label: "Dashboard", visible: true, priority: 1, route: "/provider", icon: "LayoutDashboard", mobileVisible: true, desktopVisible: true },
  { moduleId: "me-business", label: "Listings", visible: true, priority: 2, route: "/provider/listings", icon: "Store", mobileVisible: true, desktopVisible: true },
  { moduleId: "marketplace-core", label: "Orders", visible: true, priority: 3, route: "/provider/orders", icon: "ShoppingCart", mobileVisible: true, desktopVisible: true },
  { moduleId: "delivery-core", label: "Dispatch", visible: true, priority: 4, route: "/provider/dispatch", icon: "Truck", mobileVisible: false, desktopVisible: true },
  { moduleId: "orbit-core", label: "Messages", visible: true, priority: 5, route: "/orbit", icon: "MessageCircle", mobileVisible: true, desktopVisible: true },
  { moduleId: "wallet-core", label: "Finance", visible: true, priority: 6, route: "/provider/finance", icon: "DollarSign", mobileVisible: true, desktopVisible: true },
  { moduleId: "wallet-payout", label: "Payouts", visible: true, priority: 7, route: "/provider/payouts", icon: "CreditCard", mobileVisible: false, desktopVisible: true },
  { moduleId: "radar-core", label: "Live Map", visible: true, priority: 8, route: "/provider/map", icon: "MapPin", mobileVisible: false, desktopVisible: true },
  { moduleId: "me-core", label: "Settings", visible: true, priority: 9, route: "/provider/settings", icon: "Settings", mobileVisible: true, desktopVisible: true },
  { moduleId: "support-core", label: "Support", visible: true, priority: 10, route: "/provider/support", icon: "Headphones", mobileVisible: true, desktopVisible: true },
  { moduleId: "notifications-core", label: "Analytics", visible: true, priority: 11, route: "/provider/analytics", icon: "BarChart3", mobileVisible: false, desktopVisible: true },
];

const ADMIN_MODULES: ModuleVisibility[] = [
  { moduleId: "dashboard-core", label: "Overview", visible: true, priority: 1, route: "/admin", icon: "LayoutDashboard", mobileVisible: true, desktopVisible: true },
  { moduleId: "admin-users", label: "Users", visible: true, priority: 2, route: "/admin/users", icon: "Users", mobileVisible: false, desktopVisible: true },
  { moduleId: "marketplace-core", label: "Marketplace", visible: true, priority: 3, route: "/admin/marketplace", icon: "Store", mobileVisible: false, desktopVisible: true },
  { moduleId: "wallet-core", label: "Finance", visible: true, priority: 4, route: "/admin/finance", icon: "DollarSign", mobileVisible: false, desktopVisible: true },
  { moduleId: "orbit-core", label: "Messages", visible: true, priority: 5, route: "/admin/messages", icon: "MessageCircle", mobileVisible: true, desktopVisible: true },
  { moduleId: "delivery-core", label: "Operations", visible: true, priority: 6, route: "/admin/operations", icon: "Activity", mobileVisible: false, desktopVisible: true },
  { moduleId: "support-core", label: "Support", visible: true, priority: 7, route: "/admin/support", icon: "Headphones", mobileVisible: true, desktopVisible: true },
  { moduleId: "notifications-core", label: "Analytics", visible: true, priority: 8, route: "/admin/analytics", icon: "BarChart3", mobileVisible: false, desktopVisible: true },
  { moduleId: "admin-settings", label: "Settings", visible: true, priority: 9, route: "/admin/settings", icon: "Settings", mobileVisible: true, desktopVisible: true },
];

export function resolveExperienceMode(role: AppRole): ExperienceMode {
  switch (role) {
    case "admin": return "admin";
    case "seller":
    case "driver":
    case "owner": return "provider";
    default: return "client";
  }
}

export function getExperienceConfig(mode: ExperienceMode, device: DeviceContext): ExperienceConfig {
  const isMobile = device.isMobile;
  const isDesktop = device.isDesktop;

  const moduleSet = mode === "admin" ? ADMIN_MODULES
    : mode === "provider" ? PROVIDER_MODULES
      : CLIENT_MODULES;

  const filtered = moduleSet.filter((m) => {
    if (isMobile) return m.mobileVisible;
    return m.desktopVisible;
  });

  switch (mode) {
    case "client":
      return {
        mode: "client",
        navStyle: isMobile ? "bottom_bar" : isDesktop ? "sidebar" : "dual",
        availableModules: filtered,
        dashboardType: "client_home",
        orbitMode: isDesktop ? "split_view" : "chat_list",
        walletMode: isMobile ? "quick_actions" : "full_finance",
        radarMode: "discovery",
        primaryActions: ["search", "pay", "book", "chat", "scan_qr"],
      };

    case "provider":
      return {
        mode: "provider",
        navStyle: isMobile ? "bottom_bar" : "sidebar",
        availableModules: filtered,
        dashboardType: "provider_dashboard",
        orbitMode: isDesktop ? "split_view" : "chat_list",
        walletMode: "full_finance",
        radarMode: "operations",
        primaryActions: ["manage_orders", "view_payouts", "respond_chat", "update_listings"],
      };

    case "admin":
      return {
        mode: "admin",
        navStyle: "sidebar",
        availableModules: filtered,
        dashboardType: "admin_panel",
        orbitMode: "split_view",
        walletMode: "full_finance",
        radarMode: "operations",
        primaryActions: ["monitor_health", "manage_users", "view_analytics", "handle_support"],
      };
  }
}

export function getModuleVisibility(
  mode: ExperienceMode,
  device: DeviceContext
): ModuleVisibility[] {
  return getExperienceConfig(mode, device).availableModules;
}

export function isModuleAccessible(
  moduleId: string,
  mode: ExperienceMode,
  device: DeviceContext
): boolean {
  const modules = getModuleVisibility(mode, device);
  return modules.some((m) => m.moduleId === moduleId && m.visible);
}

export function getBottomNavModules(mode: ExperienceMode): ModuleVisibility[] {
  const modules = mode === "admin" ? ADMIN_MODULES
    : mode === "provider" ? PROVIDER_MODULES
      : CLIENT_MODULES;
  return modules.filter((m) => m.mobileVisible).slice(0, 5);
}

export function getSidebarModules(mode: ExperienceMode): ModuleVisibility[] {
  const modules = mode === "admin" ? ADMIN_MODULES
    : mode === "provider" ? PROVIDER_MODULES
      : CLIENT_MODULES;
  return modules.filter((m) => m.desktopVisible);
}

export interface ScreenAdaptation {
  moduleId: string;
  mobile: {
    layout: "stack" | "tabs" | "scroll";
    components: string[];
  };
  desktop: {
    layout: "split" | "grid" | "table" | "dashboard";
    components: string[];
  };
}

export const MODULE_ADAPTATIONS: ScreenAdaptation[] = [
  {
    moduleId: "orbit-core",
    mobile: { layout: "stack", components: ["ThreadList", "ChatView"] },
    desktop: { layout: "split", components: ["ThreadListPanel", "ChatPanel", "ContextPanel"] },
  },
  {
    moduleId: "wallet-core",
    mobile: { layout: "stack", components: ["BalanceCard", "QuickActions", "TransactionList"] },
    desktop: { layout: "dashboard", components: ["BalanceOverview", "TransactionTable", "AnalyticsCharts", "PayoutPanel"] },
  },
  {
    moduleId: "radar-core",
    mobile: { layout: "stack", components: ["SearchBar", "MapView", "ResultCards"] },
    desktop: { layout: "split", components: ["FilterPanel", "MapView", "ResultTable", "DetailPanel"] },
  },
  {
    moduleId: "marketplace-core",
    mobile: { layout: "scroll", components: ["CategoryBar", "ListingCards", "FilterSheet"] },
    desktop: { layout: "grid", components: ["FilterSidebar", "ListingGrid", "ListingDetail"] },
  },
  {
    moduleId: "dashboard-core",
    mobile: { layout: "scroll", components: ["BalanceWidget", "QuickActions", "ActivityFeed"] },
    desktop: { layout: "dashboard", components: ["KPICards", "ActivityTable", "ChartPanel", "ModuleHealthPanel"] },
  },
  {
    moduleId: "delivery-core",
    mobile: { layout: "stack", components: ["OrderList", "TrackingMap"] },
    desktop: { layout: "split", components: ["OrderTable", "DispatchMap", "DriverPanel"] },
  },
];

export function getModuleAdaptation(moduleId: string): ScreenAdaptation | undefined {
  return MODULE_ADAPTATIONS.find((a) => a.moduleId === moduleId);
}
