import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from "react";
import { db } from "@/services/db";
import { interpolate, resolvePlural, trackMissingKey } from "./i18n-utils";
import { landingKeysEn, landingKeysFr } from "./i18n-landing";
import { GLOBAL_TRANSLATIONS } from "./i18n-data/translations";
import { loadLocaleTranslations, getLoadedLocale } from "./i18n-data";

export type { AppLocale as Locale } from "./i18n-locales";
import type { AppLocale as Locale } from "./i18n-locales";
import { APP_LOCALES } from "./i18n-locales";

export { COUNTRY_LOCALE_MAP } from "./country-locale-map";
import { COUNTRY_LOCALE_MAP } from "./country-locale-map";

export { COUNTRY_CURRENCY_MAP } from "@/lib/geo/country-currency-map";

const KNOWN_LOCALES = new Set<string>(APP_LOCALES);

const isValidLocale = (l: string | null | undefined): l is Locale => !!l && KNOWN_LOCALES.has(l);

let initialLocaleLoaded = false;
let initialLocalePromise: Promise<void> | null = null;

function loadInitialLocale(): Promise<void> {
  if (initialLocaleLoaded) return Promise.resolve();
  if (initialLocalePromise) return initialLocalePromise;
  const detected = detectInitialLocaleEarly();
  initialLocalePromise = loadLocaleTranslations(detected)
    .then(() => { initialLocaleLoaded = true; })
    .catch(e => { console.error("[i18n] Failed to load initial locale", e); });
  return initialLocalePromise;
}

function detectInitialLocaleEarly(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem("app_locale");
    if (saved && KNOWN_LOCALES.has(saved)) return saved as Locale;
  } catch {}
  if (typeof navigator !== "undefined") {
    const browserLang = (navigator.language || "").split("-")[0]?.toLowerCase();
    if (browserLang && KNOWN_LOCALES.has(browserLang)) return browserLang as Locale;
  }
  return "en";
}

if (typeof window !== "undefined") {
  void loadInitialLocale();
}

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  availableLocales: { value: Locale; label: string }[];
}

const I18nContext = createContext<I18nContextType | null>(null);

const availableLocales: { value: Locale; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Português" },
  { value: "nl", label: "Nederlands" },
  { value: "pl", label: "Polski" },
  { value: "tr", label: "Türkçe" },
  { value: "ar", label: "العربية" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "zh", label: "中文" },
  { value: "hi", label: "हिन्दी" },
  { value: "th", label: "ไทย" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "id", label: "Bahasa Indonesia" },
  { value: "ms", label: "Bahasa Melayu" },
  { value: "sv", label: "Svenska" },
  { value: "da", label: "Dansk" },
  { value: "nb", label: "Norsk" },
  { value: "fi", label: "Suomi" },
  { value: "el", label: "Ελληνικά" },
  { value: "cs", label: "Čeština" },
  { value: "hu", label: "Magyar" },
  { value: "ro", label: "Română" },
  { value: "hr", label: "Hrvatski" },
  { value: "bg", label: "Български" },
  { value: "sk", label: "Slovenčina" },
  { value: "he", label: "עברית" },
  { value: "uk", label: "Українська" },
  { value: "fa", label: "فارسی" },
  { value: "bn", label: "বাংলা" },
  { value: "sw", label: "Kiswahili" },
  { value: "tl", label: "Tagalog" },
  { value: "ur", label: "اردو" },
  { value: "am", label: "አማርኛ" },
  { value: "ha", label: "Hausa" },
  { value: "yo", label: "Yorùbá" },
  { value: "wo", label: "Wolof" },
  { value: "ru", label: "Русский" },
  { value: "sl", label: "Slovenščina" },
  { value: "lt", label: "Lietuvių" },
  { value: "lv", label: "Latviešu" },
  { value: "et", label: "Eesti" },
];

const safeGetStoredLocale = (): Locale | null => {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem("app_locale");
    return isValidLocale(saved) ? saved : null;
  } catch {
    return null;
  }
};

const detectInitialLocale = (): Locale => {
  const stored = safeGetStoredLocale();
  if (stored) return stored;

  if (typeof navigator !== "undefined") {
    const browserLang = (navigator.language || "").split("-")[0]?.toLowerCase();
    if (isValidLocale(browserLang)) return browserLang;

    const browserCountry = (navigator.language || "").split("-")[1]?.toUpperCase();
    if (browserCountry && COUNTRY_LOCALE_MAP[browserCountry] && isValidLocale(COUNTRY_LOCALE_MAP[browserCountry])) {
      return COUNTRY_LOCALE_MAP[browserCountry];
    }
  }

  return "en";
};

const lazyData = new Map<Locale, Record<string, string>>();

const readLocaleMessages = (mod: unknown, exportKey: string, locale: Locale): Record<string, string> => {
  if (!mod || typeof mod !== "object") return {};
  const namespace = (mod as Record<string, unknown>)[exportKey];
  if (!namespace || typeof namespace !== "object") return {};
  const localeMessages = (namespace as Record<string, unknown>)[locale];
  return localeMessages && typeof localeMessages === "object"
    ? (localeMessages as Record<string, string>)
    : {};
};

async function loadLocaleExtras(locale: Locale): Promise<Record<string, string>> {
  if (locale === "fr" || locale === "en") return {};
  if (lazyData.has(locale)) return lazyData.get(locale)!;

  try {
    const [nkRes] = await Promise.allSettled([
      import("./i18n-validation"),
    ]);

    const merged = {
      ...readLocaleMessages(nkRes.status === "fulfilled" ? nkRes.value : undefined, "notifKeys", locale),
    };

    lazyData.set(locale, merged);
    return merged;
  } catch (e) {
    console.warn(`[i18n] Failed to load extras for ${locale}`, e);
    return {};
  }
}

let enExtras: Record<string, string> = {};
let frExtras: Record<string, string> = {};

const loadCoreExtras = async () => {
  const [nkRes] = await Promise.allSettled([
    import("./i18n-validation"),
  ]);

  enExtras = {
    ...readLocaleMessages(nkRes.status === "fulfilled" ? nkRes.value : undefined, "notifKeys", "en"),
  };

  frExtras = {
    ...readLocaleMessages(nkRes.status === "fulfilled" ? nkRes.value : undefined, "notifKeys", "fr"),
  };
};

if (typeof window !== "undefined") {
  requestIdleCallback(() => {
    void loadCoreExtras();
  });
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);
  const [localeTick, forceUpdate] = useState(0);
  const loadingRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      await loadLocaleTranslations(locale);
      if (!cancelled) forceUpdate(n => n + 1);
      const fallbacks: Locale[] = [];
      if (locale !== "en") fallbacks.push("en");
      if (locale !== "fr") fallbacks.push("fr");
      if (fallbacks.length > 0) {
        await Promise.all(fallbacks.map(l => loadLocaleTranslations(l)));
        if (!cancelled) forceUpdate(n => n + 1);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = (locale === "ar" || locale === "he" || locale === "ur" || locale === "fa") ? "rtl" : "ltr";
  }, [locale]);

  useEffect(() => {
    if (locale === "fr" || locale === "en") return;
    if (lazyData.has(locale)) return;
    if (loadingRef.current === locale) return;
    loadingRef.current = locale;
    loadLocaleExtras(locale).then(() => {
      loadingRef.current = null;
      forceUpdate(n => n + 1);
    });
  }, [locale]);

  useEffect(() => {
    if (getLoadedLocale(locale)) return;
    let cancelled = false;
    loadLocaleTranslations(locale).then(() => {
      if (!cancelled) forceUpdate(n => n + 1);
    });
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    const syncLocale = async () => {
      const { data: { session } } = await db.auth.getSession();
      if (!session?.user) return;
      const { data } = await db
        .from("profiles")
        .select("locale")
        .eq("id", session.user.id)
        .single();
      if (data?.locale && isValidLocale(data.locale)) {
        setLocaleState(data.locale);
        try {
          localStorage.setItem("app_locale", data.locale);
        } catch {
        }
      }
    };
    syncLocale();
  }, []);

  const setLocale = useCallback(async (l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("app_locale", l);
    } catch {
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
      document.documentElement.dir = (l === "ar" || l === "he" || l === "ur" || l === "fa") ? "rtl" : "ltr";
    }
    loadLocaleTranslations(l).then(() => forceUpdate(n => n + 1));
    loadLocaleExtras(l);
    const { data: { session } } = await db.auth.getSession();
    if (session?.user) {
      await db("profiles").update({ locale: l }).eq("id", session.user.id);
    }
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const localeData = getLoadedLocale(locale);
    const enData = getLoadedLocale("en" as Locale);
    const frData = getLoadedLocale("fr" as Locale);
    const globalLocale = GLOBAL_TRANSLATIONS[locale];
    const globalEn = GLOBAL_TRANSLATIONS.en;
    const globalFr = GLOBAL_TRANSLATIONS.fr;

    const lookup = (k: string): string | undefined =>
      localeData?.[k] || lazyData.get(locale)?.[k] || globalLocale?.[k] ||
      landingKeysFr[k] || landingKeysEn[k] ||
      enData?.[k] || enExtras[k] || globalEn?.[k] || landingKeysEn[k] ||
      frData?.[k] || frExtras[k] || globalFr?.[k] || landingKeysFr[k] || undefined;

    let resolved: string | undefined;
    if (vars && typeof vars.count === "number") {
      resolved = resolvePlural(key, vars.count, lookup);
    } else {
      resolved = lookup(key);
    }

    if (resolved) return interpolate(resolved, vars);

    if (import.meta.env.DEV && !key.startsWith("pricing.")) {
      console.warn(`[i18n] Missing key: "${key}" (locale: ${locale})`);
    }
    trackMissingKey(key, locale);
    const lastSegment = key.split(".").pop() || key;
    return lastSegment
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }, [locale, localeTick]);

  const contextValue = useMemo(() => ({ locale, setLocale, t, availableLocales }), [locale, setLocale, t]);

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

const FALLBACK_I18N: I18nContextType = {
  locale: "en" as Locale,
  setLocale: () => {},
  t: (key: string) => {
    const last = key.split(".").pop() || key;
    return last.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  },
  availableLocales: [{ value: "en" as Locale, label: "English" }],
};

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx && import.meta.env.DEV) {
    console.warn("[i18n] useI18n called outside I18nProvider — using fallback. Check provider nesting.");
  }
  return ctx ?? FALLBACK_I18N;
}

export function tSafe(t: (key: string, vars?: Record<string, any>) => string, key: string, fallback: string, vars?: Record<string, any>): string {
  const result = t(key, vars);
  return result === key ? fallback : result;
}
