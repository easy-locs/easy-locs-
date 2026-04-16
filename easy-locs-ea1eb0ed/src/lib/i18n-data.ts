type Locale = "fr" | "en" | "es" | "de" | "it" | "pt" | "nl" | "pl" | "tr" | "ar" | "ja" | "ko" | "zh" | "hi" | "th" | "vi" | "id" | "ms" | "sv" | "da" | "nb" | "fi" | "el" | "cs" | "hu" | "ro" | "hr" | "bg" | "sk" | "he" | "uk" | "fa" | "sl" | "et" | "lv" | "lt" | "ru" | "bn" | "sw" | "tl" | "ur" | "am" | "ha" | "yo" | "wo";

export { obFr } from "./i18n-onboarding";
export { obEn } from "./i18n-onboarding";
export { obEs } from "./i18n-onboarding";
export { obDe } from "./i18n-onboarding";
export { obIt } from "./i18n-onboarding";
export { obPt } from "./i18n-onboarding";
export { obAr } from "./i18n-onboarding";

const localeLoaders: Record<Locale, () => Promise<Record<string, string>>> = {
  fr: () => import("./i18n-locale-chunks/fr.json").then(m => m.default),
  en: () => import("./i18n-locale-chunks/en.json").then(m => m.default),
  es: () => import("./i18n-locale-chunks/es.json").then(m => m.default),
  de: () => import("./i18n-locale-chunks/de.json").then(m => m.default),
  it: () => import("./i18n-locale-chunks/it.json").then(m => m.default),
  pt: () => import("./i18n-locale-chunks/pt.json").then(m => m.default),
  nl: () => import("./i18n-locale-chunks/nl.json").then(m => m.default),
  pl: () => import("./i18n-locale-chunks/pl.json").then(m => m.default),
  tr: () => import("./i18n-locale-chunks/tr.json").then(m => m.default),
  ar: () => import("./i18n-locale-chunks/ar.json").then(m => m.default),
  ja: () => import("./i18n-locale-chunks/ja.json").then(m => m.default),
  ko: () => import("./i18n-locale-chunks/ko.json").then(m => m.default),
  zh: () => import("./i18n-locale-chunks/zh.json").then(m => m.default),
  hi: () => import("./i18n-locale-chunks/hi.json").then(m => m.default),
  th: () => import("./i18n-locale-chunks/th.json").then(m => m.default),
  vi: () => import("./i18n-locale-chunks/vi.json").then(m => m.default),
  id: () => import("./i18n-locale-chunks/id.json").then(m => m.default),
  ms: () => import("./i18n-locale-chunks/ms.json").then(m => m.default),
  sv: () => import("./i18n-locale-chunks/sv.json").then(m => m.default),
  da: () => import("./i18n-locale-chunks/da.json").then(m => m.default),
  nb: () => import("./i18n-locale-chunks/nb.json").then(m => m.default),
  fi: () => import("./i18n-locale-chunks/fi.json").then(m => m.default),
  el: () => import("./i18n-locale-chunks/el.json").then(m => m.default),
  cs: () => import("./i18n-locale-chunks/cs.json").then(m => m.default),
  hu: () => import("./i18n-locale-chunks/hu.json").then(m => m.default),
  ro: () => import("./i18n-locale-chunks/ro.json").then(m => m.default),
  hr: () => import("./i18n-locale-chunks/hr.json").then(m => m.default),
  bg: () => import("./i18n-locale-chunks/bg.json").then(m => m.default),
  sk: () => import("./i18n-locale-chunks/sk.json").then(m => m.default),
  he: () => import("./i18n-locale-chunks/he.json").then(m => m.default),
  uk: () => import("./i18n-locale-chunks/uk.json").then(m => m.default),
  fa: () => import("./i18n-locale-chunks/fa.json").then(m => m.default),
  bn: () => import("./i18n-locale-chunks/bn.json").then(m => m.default),
  sw: () => import("./i18n-locale-chunks/sw.json").then(m => m.default),
  tl: () => import("./i18n-locale-chunks/tl.json").then(m => m.default),
  ur: () => import("./i18n-locale-chunks/ur.json").then(m => m.default),
  am: () => import("./i18n-locale-chunks/am.json").then(m => m.default),
  ha: () => import("./i18n-locale-chunks/ha.json").then(m => m.default),
  yo: () => import("./i18n-locale-chunks/yo.json").then(m => m.default),
  wo: () => import("./i18n-locale-chunks/wo.json").then(m => m.default),
  ru: () => import("./i18n-locale-chunks/ru.json").then(m => m.default),
  sl: () => import("./i18n-locale-chunks/sl.json").then(m => m.default),
  lt: () => import("./i18n-locale-chunks/lt.json").then(m => m.default),
  lv: () => import("./i18n-locale-chunks/lv.json").then(m => m.default),
  et: () => import("./i18n-locale-chunks/et.json").then(m => m.default),
};

const loadedLocales = new Map<Locale, Record<string, string>>();

export async function loadLocaleTranslations(locale: Locale): Promise<Record<string, string>> {
  if (loadedLocales.has(locale)) return loadedLocales.get(locale)!;
  const loader = localeLoaders[locale];
  if (!loader) return {};
  try {
    const data = await loader();
    const { onboardingExtra } = await import("./i18n-onboarding-extra");
    const extra = onboardingExtra[locale];
    const merged = extra ? { ...data, ...extra } : data;
    loadedLocales.set(locale, merged);
    return merged;
  } catch (e) {
    console.error(`[i18n] Failed to load locale chunk: ${locale}`, e);
    return {};
  }
}

export function getLoadedLocale(locale: Locale): Record<string, string> | undefined {
  return loadedLocales.get(locale);
}

export const translations: Record<Locale, Record<string, string>> = new Proxy(
  {} as Record<Locale, Record<string, string>>,
  {
    get(_target, prop: string) {
      return loadedLocales.get(prop as Locale) || {};
    },
    ownKeys() {
      return Array.from(loadedLocales.keys());
    },
    getOwnPropertyDescriptor(_target, prop: string) {
      if (loadedLocales.has(prop as Locale)) {
        return { configurable: true, enumerable: true, value: loadedLocales.get(prop as Locale) };
      }
      return undefined;
    },
  }
);
