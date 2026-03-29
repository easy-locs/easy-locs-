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

// Dashboard family owns: role-aware cards, summaries, counts, alerts,
// tasks, quick actions, activity feed, decision cockpit
