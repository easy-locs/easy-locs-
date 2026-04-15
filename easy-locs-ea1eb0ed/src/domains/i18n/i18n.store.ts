/**
 * I18N Store — Single owner for locale, dictionaries, direction.
 */
import { create } from "zustand";

export type TextDirection = "ltr" | "rtl";

interface I18nState {
  locale: string;
  fallbackLocale: string;
  direction: TextDirection;
  dictionaries: Record<string, Record<string, string>>;

  setLocale: (locale: string) => void;
  setDirection: (dir: TextDirection) => void;
  setDictionary: (locale: string, dict: Record<string, string>) => void;
}

const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

function detectBrowserLocale(): string {
  try {
    const browserLang = navigator.language?.split("-")[0] || "en";
    const supported = new Set(["en", "fr", "ar", "es", "de", "pt", "tr", "zh", "hi", "sw"]);
    return supported.has(browserLang) ? browserLang : "en";
  } catch {
    return "en";
  }
}

const detectedLocale = typeof window !== "undefined" ? detectBrowserLocale() : "en";

export const useI18nStore = create<I18nState>((set) => ({
  locale: detectedLocale,
  fallbackLocale: "en",
  direction: RTL_LOCALES.has(detectedLocale) ? "rtl" : "ltr",
  dictionaries: {},

  setLocale: (locale) =>
    set({
      locale,
      direction: RTL_LOCALES.has(locale) ? "rtl" : "ltr",
    }),

  setDirection: (dir) => set({ direction: dir }),

  setDictionary: (locale, dict) =>
    set((s) => ({
      dictionaries: { ...s.dictionaries, [locale]: dict },
    })),
}));
