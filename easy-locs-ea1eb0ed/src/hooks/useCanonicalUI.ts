/**
 * useCanonicalUI — Hook to consume the Canonical UI Engine from any component.
 * Given a vertical + optional subcategory, returns full visual identity.
 * Used by: detail pages, search results, cards, recommendation sections.
 */
import { useMemo } from "react";
import { resolveCanonicalUI, type CanonicalUISpec } from "@/lib/ui-engine";

export function useCanonicalUI(
  vertical?: string | null,
  subcategory?: string | null,
): CanonicalUISpec {
  return useMemo(
    () => resolveCanonicalUI(vertical || "food", subcategory),
    [vertical, subcategory],
  );
}

/**
 * Quick accent color for inline styling.
 */
export function useVerticalAccentColor(vertical?: string | null): string {
  const ui = useCanonicalUI(vertical);
  return `hsl(${ui.accentHsl})`;
}
