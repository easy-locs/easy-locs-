/**
 * useGlobalContext — React hook for the Global Context Engine.
 * Provides memoized platform context to any component.
 */
import { useMemo } from "react";
import { computeGlobalContext, type GlobalContext, type ContextInput } from "@/lib/context/global-context-engine";

export function useGlobalContext(input?: ContextInput): GlobalContext {
  const country = input?.country;
  const city = input?.city;
  const tz = input?.timezone;

  return useMemo(
    () => computeGlobalContext({ country, city, timezone: tz }),
    // Recompute every 15 minutes via cacheKey internally
    [country, city, tz],
  );
}
