/**
 * DOMAIN: I18N — Universal Root Formula
 * INTENT → ENTRY → PIPELINE → NORMALIZER → OWNER → STATE → SELECTOR → VIEW → OUTPUT
 *
 * Single source of truth for locale, translations, and language switching.
 */

export { i18nDispatch } from "./i18n-dispatch";
export type { I18nCommand, I18nCommandResult } from "./i18n-dispatch";
export { useI18nStore } from "./i18n.store";
export { selectTranslation, selectLocale, selectDirection } from "./selectors";
export { normalizeLocale } from "./normalizers";
