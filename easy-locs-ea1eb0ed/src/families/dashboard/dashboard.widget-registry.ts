/**
 * Dashboard Widget Registry — Declarative registration of all dashboard widgets.
 * Each widget has a unique key, its data source, and render entry.
 * This is the single manifest for the dashboard composition.
 */

export interface WidgetRegistryEntry {
  /** Unique widget identifier */
  key: string;
  /** Human-readable label */
  label: string;
  /** Which dashboard surface this belongs to */
  surface: "home" | "admin-ops" | "admin-super" | "driver" | "seller";
  /** Data source type */
  sourceType: "view-model" | "query" | "store";
  /** Source key (hook name or query key) */
  sourceKey: string;
}

export const DASHBOARD_WIDGETS: WidgetRegistryEntry[] = [
  // ── Home Dashboard ──
  { key: "hero-banner", label: "Hero Banner", surface: "home", sourceType: "view-model", sourceKey: "useDashboardViewModel" },
  { key: "quick-actions", label: "Quick Actions", surface: "home", sourceType: "view-model", sourceKey: "useDashboardViewModel" },
  { key: "category-grid", label: "Category Grid", surface: "home", sourceType: "view-model", sourceKey: "useDashboardViewModel" },
  { key: "context-banners", label: "Context Banners", surface: "home", sourceType: "view-model", sourceKey: "useDashboardViewModel" },
  { key: "boost-slot-hero", label: "Boost Slot Hero", surface: "home", sourceType: "view-model", sourceKey: "useDashboardViewModel" },
  { key: "live-map", label: "Live Map", surface: "home", sourceType: "view-model", sourceKey: "useDashboardViewModel" },
  { key: "trending-section", label: "Trending", surface: "home", sourceType: "view-model", sourceKey: "useDashboardViewModel" },
  { key: "best-rated-section", label: "Best Rated", surface: "home", sourceType: "view-model", sourceKey: "useDashboardViewModel" },
  { key: "onboarding-checklist", label: "Onboarding Checklist", surface: "home", sourceType: "query", sourceKey: "onboarding-checklist" },

  // ── Admin Ops Dashboard ──
  { key: "ops-metrics", label: "Ops Metrics Grid", surface: "admin-ops", sourceType: "query", sourceKey: "admin-ops-dashboard" },

  // ── Admin Super Dashboard ──
  { key: "super-metrics", label: "Super Metrics Grid", surface: "admin-super", sourceType: "query", sourceKey: "super-dashboard" },
  { key: "super-nav-links", label: "Admin Navigation", surface: "admin-super", sourceType: "view-model", sourceKey: "static" },

  // ── Driver Dashboard ──
  { key: "driver-status", label: "Driver Status Toggles", surface: "driver", sourceType: "query", sourceKey: "driver-live" },
  { key: "driver-actions", label: "Driver Quick Actions", surface: "driver", sourceType: "view-model", sourceKey: "static" },
  { key: "driver-earnings", label: "Driver Earnings", surface: "driver", sourceType: "query", sourceKey: "driver-earnings" },

  // ── Seller Dashboard ──
  { key: "seller-businesses", label: "Seller Businesses", surface: "seller", sourceType: "query", sourceKey: "seller-services" },
];

/** Get widgets for a specific surface */
export function getWidgetsForSurface(surface: WidgetRegistryEntry["surface"]): WidgetRegistryEntry[] {
  return DASHBOARD_WIDGETS.filter((w) => w.surface === surface);
}
