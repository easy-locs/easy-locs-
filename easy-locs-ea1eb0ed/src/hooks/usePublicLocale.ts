import { useState, useCallback, useEffect } from "react";
import type { Locale } from "@/lib/i18n";

const SUPPORTED_PUBLIC_LOCALES: Locale[] = ["fr", "en", "es", "de", "it", "pt", "nl"];

const detectBrowserLocale = (): Locale => {
  if (typeof navigator === "undefined") return "en";

  const langs = navigator.languages || [navigator.language];
  for (const lang of langs) {
    const short = lang.slice(0, 2).toLowerCase() as Locale;
    if (SUPPORTED_PUBLIC_LOCALES.includes(short)) return short;
  }
  return "en";
};

const getStoredPublicLocale = (): Locale | null => {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.sessionStorage.getItem("public_locale") as Locale | null;
    return stored && SUPPORTED_PUBLIC_LOCALES.includes(stored) ? stored : null;
  } catch {
    return null;
  }
};

export const usePublicLocale = () => {
  const [locale, setLocale] = useState<Locale>(() => getStoredPublicLocale() || detectBrowserLocale());

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.sessionStorage.setItem("public_locale", locale);
    } catch {
      // ignore storage errors
    }
  }, [locale]);

  const changeLocale = useCallback((l: Locale) => {
    if (SUPPORTED_PUBLIC_LOCALES.includes(l)) setLocale(l);
  }, []);

  return { locale, changeLocale, supportedLocales: SUPPORTED_PUBLIC_LOCALES };
};

