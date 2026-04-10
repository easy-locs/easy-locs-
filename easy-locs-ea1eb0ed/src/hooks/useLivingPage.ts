/**
 * useLivingPage — React hook for the Living Commerce Engine.
 * Returns dynamic sections for any page surface.
 */
import { useMemo } from "react";
import { composeLivingPage, type LivingPageOutput } from "@/lib/commerce/living-commerce-engine";

export function useLivingPage(input?: {
  country?: string;
  city?: string;
  maxSections?: number;
}): LivingPageOutput {
  return useMemo(
    () => composeLivingPage(input),
    [input?.country, input?.city, input?.maxSections],
  );
}
