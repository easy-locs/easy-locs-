/**
 * DOMAIN: DASHBOARD — Read-only aggregation layer.
 *
 * Dashboard ne crée AUCUNE vérité métier.
 * Dashboard lit UNIQUEMENT des vérités existantes via selectors.
 *
 * INTERDIT: recalculer Wallet, Orbit, Radar, Me. Lancer des écritures métier.
 */

// ── Canonical Types ──
export type { CanonicalDashboardSummary, DashboardActivityItem } from "../shared/canonical-types";

// ── Atoms ──
export { formatKpiValue, formatActivityTimestamp } from "./atoms/dashboard-format.atom";

// ── Selectors (read-only projections) ──
export { selectDashboardSummary } from "./selectors";

// ── Events ──
export { CANONICAL_EVENTS } from "../shared/canonical-events";
