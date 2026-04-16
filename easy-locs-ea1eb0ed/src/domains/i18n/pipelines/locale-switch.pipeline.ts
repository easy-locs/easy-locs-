/**
 * Locale Switch Pipeline — validate → normalize → load dict → update store → update DOM
 */
import { normalizeLocale } from "../normalizers";
import { useI18nStore } from "../i18n.store";
import type { I18nCommandResult } from "../i18n-dispatch";
import { SUPPORTED_LOCALES } from "@/lib/i18n-advanced";
import { COUNTRY_TO_LOCALE } from "@/lib/wallet/wallet-config";

const SUPPORTED_SET = new Set<string>(SUPPORTED_LOCALES);

export function detectLocaleFromCountry(countryCode: string | null | undefined): string | null {
  if (!countryCode) return null;
  const code = countryCode.toUpperCase().trim();
  const locale = COUNTRY_TO_LOCALE[code];
  if (locale && SUPPORTED_SET.has(locale)) return locale;
  return null;
}

export async function localeSwitchPipeline(rawLocale: string): Promise<I18nCommandResult> {
  const locale = normalizeLocale(rawLocale);

  if (!SUPPORTED_SET.has(locale)) {
    return { ok: false, error: `unsupported_locale:${locale}` };
  }

  const store = useI18nStore.getState();
  if (!store.dictionaries[locale]) {
    await loadDictionaryPipeline(locale);
  }

  store.setLocale(locale);

  document.documentElement.dir = store.direction;
  document.documentElement.lang = locale;

  return { ok: true };
}

export async function autoDetectAndSwitchLocale(profileCountry?: string | null): Promise<I18nCommandResult> {
  const fromCountry = detectLocaleFromCountry(profileCountry);
  if (fromCountry) {
    return localeSwitchPipeline(fromCountry);
  }

  if (typeof navigator !== "undefined") {
    const browserLang = (navigator.language || "").split("-")[0].toLowerCase();
    if (browserLang && SUPPORTED_SET.has(browserLang)) {
      return localeSwitchPipeline(browserLang);
    }
  }

  return { ok: true };
}

export async function loadDictionaryPipeline(locale: string): Promise<I18nCommandResult> {
  try {
    let dict = await import(`@/locales/${locale}.json`)
      .then((m) => m.default || m)
      .catch(() => null);

    if (!dict || Object.keys(dict).length === 0) {
      const { loadLocaleTranslations } = await import("@/lib/i18n-data");
      dict = await loadLocaleTranslations(locale as import("@/lib/i18n").Locale).catch(() => ({}));
    }

    useI18nStore.getState().setDictionary(locale, dict);
    return { ok: true };
  } catch {
    return { ok: false, error: `dict_load_failed:${locale}` };
  }
}
