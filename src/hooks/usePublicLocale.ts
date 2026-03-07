import { useState, useCallback, useEffect } from "react";
import type { Locale } from "@/lib/i18n";

const SUPPORTED_PUBLIC_LOCALES: Locale[] = ["fr", "en", "es", "de", "it", "pt", "nl"];

const detectBrowserLocale = (): Locale => {
  const langs = navigator.languages || [navigator.language];
  for (const lang of langs) {
    const short = lang.slice(0, 2).toLowerCase() as Locale;
    if (SUPPORTED_PUBLIC_LOCALES.includes(short)) return short;
  }
  return "en";
};

export const usePublicLocale = () => {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = sessionStorage.getItem("public_locale") as Locale | null;
    if (stored && SUPPORTED_PUBLIC_LOCALES.includes(stored)) return stored;
    return detectBrowserLocale();
  });

  useEffect(() => {
    sessionStorage.setItem("public_locale", locale);
  }, [locale]);

  const changeLocale = useCallback((l: Locale) => {
    if (SUPPORTED_PUBLIC_LOCALES.includes(l)) setLocale(l);
  }, []);

  return { locale, changeLocale, supportedLocales: SUPPORTED_PUBLIC_LOCALES };
};
