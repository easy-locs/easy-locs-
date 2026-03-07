import { useSearchParams } from "react-router-dom";
import { useMemo } from "react";

/**
 * Reads `?country=XX` from the URL search params.
 * Returns the uppercase country code or null if not set.
 * Used to enforce strict country isolation in sub-pages.
 */
export function useCountryFilter(): string | null {
  const [searchParams] = useSearchParams();
  return useMemo(() => {
    const raw = searchParams.get("country");
    return raw ? raw.toUpperCase() : null;
  }, [searchParams]);
}
