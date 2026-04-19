/**
 * Dashboard Domain — read-only aggregator.
 *
 * This domain is a read-only view over other domain stores.
 * It NEVER performs writes (no insert, no update, no delete).
 * All data is sourced through read-only projections and selectors.
 */
export * from "./selectors";
