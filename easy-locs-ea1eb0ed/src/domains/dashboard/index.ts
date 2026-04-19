/**
 * Dashboard Domain — read-only aggregator.
 *
 * RULES:
 *   ✅ This domain is strictly read-only.
 *   ✅ No writes, mutations, or supabase.from calls here.
 *   ✅ Aggregates projections from other domain stores/selectors.
 */
export * from "./selectors";
