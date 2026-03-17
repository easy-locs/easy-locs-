import { useSearchParams, useParams, useLocation } from "react-router-dom";
import { useMemo } from "react";

/**
 * Central hook for country-first architecture.
 * Detects the active country from:
 *   1. Route param: /dashboard/country/:code
 *   2. Query param: ?country=XX
 * Returns null when on global pages (dashboard root, billing, settings).
 */
export function useCountryContext() {
  const { code } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  return useMemo(() => {
    // From route param (country workspace)
    if (code) return code.toUpperCase();
    // From query param (operational pages)
    const qp = searchParams.get("country");
    if (qp) return qp.toUpperCase();
    return null;
  }, [code, searchParams]);
}

/**
 * Returns true if the current route is inside a country workspace
 * (either /dashboard/country/:code or any page with ?country=XX)
 */
export function useIsInsideCountry(): boolean {
  return useCountryContext() !== null;
}

/**
 * Appends ?country=XX to a path if a country context is active.
 * Preserves existing query params.
 */
export function appendCountryToPath(path: string, country: string | null): string {
  if (!country) return path;
  const separator = path.includes("?") ? "&" : "?";
  // Don't double-add country param
  if (path.includes(`country=${country}`) || path.includes(`country=${country.toLowerCase()}`)) {
    return path;
  }
  return `${path}${separator}country=${country}`;
}

/**
 * Global pages that should NOT have country context enforced.
 */
const GLOBAL_PAGES = [
  "/dashboard",
  "/dashboard/billing",
  "/dashboard/settings",
  "/dashboard/company",
  "/dashboard/developers",
  "/dashboard/admin",
  "/dashboard/assistant",
  "/dashboard/collaboration",
  "/dashboard/referrals",
  "/dashboard/audit",
  "/dashboard/import",
  "/dashboard/install",
  "/dashboard/communication",
  "/dashboard/activities",
  "/dashboard/my-shop",
  "/shops",
];

export function isGlobalPage(pathname: string): boolean {
  // Exact match or country workspace itself
  if (pathname === "/dashboard") return true;
  if (pathname.startsWith("/dashboard/country/")) return true;
  return GLOBAL_PAGES.some(p => pathname === p);
}
