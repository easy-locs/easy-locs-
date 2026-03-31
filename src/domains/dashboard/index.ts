/**
 * DOMAIN: DASHBOARD — Read-only aggregation layer.
 *
 * Dashboard ne crée AUCUNE vérité métier.
 * Dashboard lit UNIQUEMENT des vérités existantes via selectors.
 *
 * INTERDIT:
 * - recalculer Wallet
 * - recalculer Orbit
 * - recalculer Radar
 * - recalculer Me
 * - lancer des écritures métier
 */

// ── Types ──
export type { CanonicalDashboardSummary, DashboardActivityItem } from "../shared/canonical-types";

// ── Selectors (read-only projections) ──
export { selectDashboardSummary } from "./selectors";

// ── Events ──
export { CANONICAL_EVENTS } from "../shared/canonical-events";
