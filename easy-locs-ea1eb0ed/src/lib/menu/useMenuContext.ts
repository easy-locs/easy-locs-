import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import type { MenuContext, UserRole } from "./menu-types";

const RTL_LOCALES = new Set(["ar", "he", "ur", "fa"]);

function getTimeOfDay(): MenuContext["timeOfDay"] {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

function getFrequentRoutes(): string[] {
  try {
    const raw = localStorage.getItem("smartcore_features");
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, 10)
      .map((f: { route: string }) => f.route)
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function useMenuContext(
  userRole: UserRole = "user",
  countryCode = "XX",
  features?: Record<string, boolean>,
): MenuContext {
  const { locale } = useI18n();

  return useMemo<MenuContext>(() => ({
    userRole,
    countryCode,
    language: locale,
    isRTL: RTL_LOCALES.has(locale),
    timeOfDay: getTimeOfDay(),
    frequentRoutes: getFrequentRoutes(),
    features,
  }), [userRole, countryCode, locale, features]);
}
