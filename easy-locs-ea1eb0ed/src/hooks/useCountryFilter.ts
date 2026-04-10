import { useCountryContext } from "@/hooks/useCountryContext";

/**
 * Reads the active country from URL context.
 * Delegates to useCountryContext for unified country detection.
 * Returns uppercase country code or null.
 */
export function useCountryFilter(): string | null {
  return useCountryContext();
}
