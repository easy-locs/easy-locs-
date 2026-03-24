/**
 * Canonical UI Engine — Public API.
 */
export {
  resolveCanonicalUI,
  getAllCanonicalRoutes,
  getVerticalAccent,
  VERTICAL_ROUTES,
} from "./canonical-ui-engine";

export type {
  CanonicalUISpec,
  CanonicalMotion,
  CanonicalCardStyle,
  CanonicalButtonStyle,
  CanonicalWording,
} from "./canonical-ui-engine";

// Re-export vertical themes for backward compat
export { getVerticalTheme, VERTICAL_THEMES } from "@/lib/discovery/vertical-themes";
export { getSubcategoryTheme } from "@/lib/discovery/subcategory-themes";

// Re-export canonical i18n for convenience
export { tc } from "@/lib/i18n-canonical";
export { td } from "@/lib/i18n-discovery";
