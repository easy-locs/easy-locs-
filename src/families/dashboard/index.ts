/**
 * FAMILY: DASHBOARD — Canonical dashboard logic.
 * Role-aware summaries, alerts, tasks, quick actions, activity feed.
 *
 * All modules MUST import dashboard logic from this family.
 */

// ── Repository ──
export {
  fetchUserOrg,
  fetchOrgMembers,
  fetchBuildings,
  upsertBuilding,
  deleteBuilding,
} from "@/repositories/dashboard.repository";

// ── Admin ops ──
export {
  fetchSystemHealthData,
  fetchFinanceSummaryData,
  fetchUserLookupData,
} from "@/repositories/admin-ops.repository";

// ── Notifications ──
export { useNotificationsCenter } from "@/hooks/useNotificationsCenter";

// ── SSOT Layer ──
export { selectCachedGeo, selectTimezone, selectUserLocation, useLocationSelectors, persistGeoCache } from "./dashboard.selectors";
export {
  projectHeroBanner, projectCategories, projectContextBanners,
  projectOpsDashboard, projectSuperDashboard, projectDriverDashboard,
  projectChecklist, projectCurrencyWallets,
} from "./dashboard.read-model";
export { useDashboardViewModel } from "./dashboard.view-model";
export { toggleDriverOnline, toggleDriverAvailability, dismissChecklist, isChecklistDismissed } from "./dashboard.actions";
export { DASHBOARD_WIDGETS, getWidgetsForSurface } from "./dashboard.widget-registry";

// Dashboard family owns: role-aware cards, summaries, counts, alerts,
// tasks, quick actions, activity feed, decision cockpit
