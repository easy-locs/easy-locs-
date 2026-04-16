type Locale = "fr" | "en" | "es" | "de" | "it" | "pt" | "nl" | "pl" | "tr" | "ar" | "ja" | "ko" | "zh" | "hi" | "th" | "vi" | "id" | "ms" | "sv" | "da" | "nb" | "fi" | "el" | "cs" | "hu" | "ro" | "hr" | "bg" | "sk" | "he" | "uk" | "fa" | "sl" | "et" | "lv" | "lt" | "ru" | "bn" | "sw" | "tl" | "ur" | "am" | "ha" | "yo" | "wo";

export { obFr } from "./i18n-onboarding";
export { obEn } from "./i18n-onboarding";
export { obEs } from "./i18n-onboarding";
export { obDe } from "./i18n-onboarding";
export { obIt } from "./i18n-onboarding";
export { obPt } from "./i18n-onboarding";
export { obAr } from "./i18n-onboarding";

const localeLoaders: Record<Locale, () => Promise<Record<string, string>>> = {
  fr: () => import("./i18n-locale-chunks/fr").then(m => m.translations_fr),
  en: () => import("./i18n-locale-chunks/en").then(m => m.translations_en),
  es: () => import("./i18n-locale-chunks/es").then(m => m.translations_es),
  de: () => import("./i18n-locale-chunks/de").then(m => m.translations_de),
  it: () => import("./i18n-locale-chunks/it").then(m => m.translations_it),
  pt: () => import("./i18n-locale-chunks/pt").then(m => m.translations_pt),
  nl: () => import("./i18n-locale-chunks/nl").then(m => m.translations_nl),
  pl: () => import("./i18n-locale-chunks/pl").then(m => m.translations_pl),
  tr: () => import("./i18n-locale-chunks/tr").then(m => m.translations_tr),
  ar: () => import("./i18n-locale-chunks/ar").then(m => m.translations_ar),
  ja: () => import("./i18n-locale-chunks/ja").then(m => m.translations_ja),
  ko: () => import("./i18n-locale-chunks/ko").then(m => m.translations_ko),
  zh: () => import("./i18n-locale-chunks/zh").then(m => m.translations_zh),
  hi: () => import("./i18n-locale-chunks/hi").then(m => m.translations_hi),
  th: () => import("./i18n-locale-chunks/th").then(m => m.translations_th),
  vi: () => import("./i18n-locale-chunks/vi").then(m => m.translations_vi),
  id: () => import("./i18n-locale-chunks/id").then(m => m.translations_id),
  ms: () => import("./i18n-locale-chunks/ms").then(m => m.translations_ms),
  sv: () => import("./i18n-locale-chunks/sv").then(m => m.translations_sv),
  da: () => import("./i18n-locale-chunks/da").then(m => m.translations_da),
  nb: () => import("./i18n-locale-chunks/nb").then(m => m.translations_nb),
  fi: () => import("./i18n-locale-chunks/fi").then(m => m.translations_fi),
  el: () => import("./i18n-locale-chunks/el").then(m => m.translations_el),
  cs: () => import("./i18n-locale-chunks/cs").then(m => m.translations_cs),
  hu: () => import("./i18n-locale-chunks/hu").then(m => m.translations_hu),
  ro: () => import("./i18n-locale-chunks/ro").then(m => m.translations_ro),
  hr: () => import("./i18n-locale-chunks/hr").then(m => m.translations_hr),
  bg: () => import("./i18n-locale-chunks/bg").then(m => m.translations_bg),
  sk: () => import("./i18n-locale-chunks/sk").then(m => m.translations_sk),
  he: () => import("./i18n-locale-chunks/he").then(m => m.translations_he),
  uk: () => import("./i18n-locale-chunks/uk").then(m => m.translations_uk),
  fa: () => import("./i18n-locale-chunks/fa").then(m => m.translations_fa),
  bn: () => import("./i18n-locale-chunks/bn").then(m => m.translations_bn),
  sw: () => import("./i18n-locale-chunks/sw").then(m => m.translations_sw),
  tl: () => import("./i18n-locale-chunks/tl").then(m => m.translations_tl),
  ur: () => import("./i18n-locale-chunks/ur").then(m => m.translations_ur),
  am: () => import("./i18n-locale-chunks/am").then(m => m.translations_am),
  ha: () => import("./i18n-locale-chunks/ha").then(m => m.translations_ha),
  yo: () => import("./i18n-locale-chunks/yo").then(m => m.translations_yo),
  wo: () => import("./i18n-locale-chunks/wo").then(m => m.translations_wo),
  ru: () => import("./i18n-locale-chunks/ru").then(m => m.translations_ru),
  sl: () => import("./i18n-locale-chunks/sl").then(m => m.translations_sl),
  lt: () => import("./i18n-locale-chunks/lt").then(m => m.translations_lt),
  lv: () => import("./i18n-locale-chunks/lv").then(m => m.translations_lv),
  et: () => import("./i18n-locale-chunks/et").then(m => m.translations_et),
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
