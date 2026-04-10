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

export const useI18nStore = create<I18nState>((set) => ({
  locale: "fr",
  fallbackLocale: "en",
  direction: "ltr",
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
