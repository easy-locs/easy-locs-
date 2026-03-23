/**
 * Query Governance — Shared filters for ALL public-facing queries.
 * 
 * Any surface that shows shops/merchants to users MUST apply these filters.
 * This ensures no hidden, broken, or flagged entity leaks to any public surface.
 */

/**
 * Apply canonical governance filters to a storefront_pages query.
 * Replaces all launch_status-based filtering.
 */
export function governStorefrontQuery(query: any, surface: "search" | "discover" | "home" | "map" | "autocomplete" = "search") {
  // Stage 1: Exclude hidden shops — visibility_mode is the SOLE authority
  // Accept null visibility_mode as "coming_soon" (legacy data)
  const allowedModes: Record<string, string[]> = {
    search:       ["live", "ready", "coming_soon", "search_only"],
    discover:     ["live", "ready", "coming_soon", "search_only"],
    home:         ["live", "ready", "coming_soon"],
    map:          ["live", "ready", "coming_soon", "map_only"],
    autocomplete: ["live", "ready", "coming_soon", "search_only"],
  };

  const modes = allowedModes[surface] ?? allowedModes.search;
  const modeFilter = modes.map(m => `visibility_mode.eq.${m}`).join(",") + ",visibility_mode.is.null";

  return query
    .or(modeFilter)
    .neq("route_status", "broken");
}

/**
 * Apply canonical governance filters to a seed_merchants query.
 * Ensures seeds follow the same quality rules as storefronts.
 */
export function governSeedQuery(query: any) {
  return query
    .eq("is_active", true)
    .not("is_flagged", "eq", true)
    .order("visibility_score", { ascending: false });
}
