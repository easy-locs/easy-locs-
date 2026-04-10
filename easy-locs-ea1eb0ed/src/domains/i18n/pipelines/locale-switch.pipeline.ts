/**
 * Locale Switch Pipeline — validate → normalize → load dict → update store → update DOM
 */
import { normalizeLocale } from "../normalizers";
import { useI18nStore } from "../i18n.store";
import type { I18nCommandResult } from "../i18n-dispatch";

const SUPPORTED_LOCALES = new Set(["fr", "en", "ar", "es", "de", "pt", "it", "nl", "tr", "zh"]);

export async function localeSwitchPipeline(rawLocale: string): Promise<I18nCommandResult> {
  // 1. Normalize
  const locale = normalizeLocale(rawLocale);

  // 2. Validate
  if (!SUPPORTED_LOCALES.has(locale)) {
    return { ok: false, error: `unsupported_locale:${locale}` };
  }

  // 3. Load dictionary if not cached
  const store = useI18nStore.getState();
  if (!store.dictionaries[locale]) {
    await loadDictionaryPipeline(locale);
  }

  // 4. Update owner
  store.setLocale(locale);

  // 5. Update DOM direction
  document.documentElement.dir = store.direction;
  document.documentElement.lang = locale;

  return { ok: true };
}

export async function loadDictionaryPipeline(locale: string): Promise<I18nCommandResult> {
  try {
    // Lazy load dictionary files
    const dict = await import(`@/locales/${locale}.json`)
      .then((m) => m.default || m)
      .catch(() => ({}));
    
    useI18nStore.getState().setDictionary(locale, dict);
    return { ok: true };
  } catch {
    return { ok: false, error: `dict_load_failed:${locale}` };
  }
}
