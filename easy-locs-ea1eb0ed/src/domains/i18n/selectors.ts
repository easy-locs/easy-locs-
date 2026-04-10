/**
 * I18N Selectors — Read-only projections from i18nStore.
 */
import { useI18nStore } from "./i18n.store";

export function selectLocale(): string {
  return useI18nStore.getState().locale;
}

export function selectDirection(): "ltr" | "rtl" {
  return useI18nStore.getState().direction;
}

export function selectTranslation(
  key: string,
  params?: Record<string, string>,
): string {
  const { locale, fallbackLocale, dictionaries } = useI18nStore.getState();
  const dict = dictionaries[locale] || dictionaries[fallbackLocale] || {};
  let value = dict[key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(`{{${k}}}`, v);
    }
  }

  return value;
}
