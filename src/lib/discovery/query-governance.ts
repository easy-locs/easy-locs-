/**
 * Query Governance — Shared filters for ALL public-facing queries.
 * 
 * Any surface that shows shops/merchants to users MUST apply these filters.
 * This ensures no hidden, broken, or flagged entity leaks to any public surface.
 */

/**
 * Apply canonical governance filters to a storefront_pages query.
 * Uses visibility_mode as sole authority for public surface filtering.
 */
export function governStorefrontQuery(query: any, surface: "search" | "discover" | "home" | "map" | "autocomplete" | "favorites" = "search") {
  // Stage 1: Exclude hidden shops — visibility_mode is the SOLE authority
  // Accept null visibility_mode as "coming_soon" (legacy data)
  const allowedModes: Record<string, string[]> = {
    search:       ["live", "ready", "coming_soon", "search_only"],
    discover:     ["live", "ready", "coming_soon", "search_only"],
    home:         ["live", "ready", "coming_soon"],
    map:          ["live", "ready", "coming_soon", "map_only"],
    autocomplete: ["live", "ready", "coming_soon", "search_only"],
    favorites:    ["live", "ready", "coming_soon", "search_only", "map_only"],
  };

  const modes = allowedModes[surface] ?? allowedModes.search;
  const modeFilter = modes.map(m => `visibility_mode.eq.${m}`).join(",") + ",visibility_mode.is.null";

  return query
    .or(modeFilter)
    .neq("route_status", "broken")
    .not("is_flagged", "eq", true);
}

/**
 * Apply canonical governance filters to a seed_merchants query.
 * Now uses real DB columns: visibility_mode, route_status, display_priority.
 * Zero projection — same enforcement model as storefront_pages.
 */
export function governSeedQuery(query: any, surface: "search" | "discover" | "home" | "map" | "autocomplete" | "favorites" = "search") {
  const allowedModes: Record<string, string[]> = {
    search:       ["live", "ready", "coming_soon", "search_only"],
    discover:     ["live", "ready", "coming_soon", "search_only"],
    home:         ["live", "ready", "coming_soon"],
    map:          ["live", "ready", "coming_soon", "map_only"],
    autocomplete: ["live", "ready", "coming_soon", "search_only"],
    favorites:    ["live", "ready", "coming_soon", "search_only", "map_only"],
  };

  const modes = allowedModes[surface] ?? allowedModes.search;
  const modeFilter = modes.map(m => `visibility_mode.eq.${m}`).join(",");

  return query
    .eq("is_active", true)
    .not("is_flagged", "eq", true)
    .or(modeFilter)
    .neq("route_status", "broken")
    .order("display_priority", { ascending: false });
}
