/**
 * Lazy i18n locale loader — dynamically imports language packs only when needed.
 * Keeps fr + en always bundled; loads other locales on demand.
 */
import type { Locale } from "./i18n";

type LocaleData = Record<string, string>;

const cache = new Map<Locale, LocaleData>();

/**
 * Loads all translation data for a given locale.
 * Returns empty object for fr/en (they're inline in main bundle).
 */
export async function loadLocaleData(locale: Locale): Promise<LocaleData> {
  if (locale === "fr" || locale === "en") return {};
  if (cache.has(locale)) return cache.get(locale)!;

  try {
    const data = await importLocale(locale);
    cache.set(locale, data);
    return data;
  } catch (e) {
    console.warn(`[i18n] Failed to load locale "${locale}", falling back to en`, e);
    return {};
  }
}

async function importLocale(locale: Locale): Promise<LocaleData> {
  switch (locale) {
    case "es": {
      const [ext, pages, pagesExtra] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-world-pages"),
        import("./i18n-pages-extra"),
      ]);
      return { ...(ext as any).obEs || {}, ...(ext as any).pageEs || {}, ...(pagesExtra as any).pageEsExtra || {} };
    }
    case "de": {
      const [ext, pagesExtra] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-pages-extra"),
      ]);
      return { ...(ext as any).obDe || {}, ...(ext as any).pageDe || {}, ...(pagesExtra as any).pageDeExtra || {} };
    }
    case "it": {
      const [ext, pagesIt] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-pages-it"),
      ]);
      return { ...(ext as any).obIt || {}, ...(ext as any).pageIt || {}, ...(pagesIt as any).pageIt || {} };
    }
    case "pt": {
      const [ext, pagesExtra] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-pages-extra"),
      ]);
      return { ...(ext as any).obPt || {}, ...(ext as any).pagePt || {}, ...(pagesExtra as any).pagePtExtra || {} };
    }
    case "nl": {
      const [ext, pages] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-world-pages"),
      ]);
      return { ...(ext as any).obNl || {}, ...(ext as any).pageNl || {}, ...(pages as any).nlPages || {} };
    }
    case "pl": {
      const [ext, pages] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-world-pages"),
      ]);
      return { ...(ext as any).obPl || {}, ...(ext as any).pagePl || {}, ...(pages as any).plPages || {} };
    }
    case "tr": {
      const [ext, pages] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-world-pages"),
      ]);
      return { ...(ext as any).obTr || {}, ...(ext as any).pageTr || {}, ...(pages as any).trPages || {} };
    }
    case "ar": {
      const [ext, pages] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-world-pages"),
      ]);
      return { ...(ext as any).obAr || {}, ...(ext as any).pageAr || {}, ...(pages as any).arPages || {} };
    }
    case "ja": {
      const [ext, pages] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-world-pages"),
      ]);
      return { ...(ext as any).obJa || {}, ...(ext as any).pageJa || {}, ...(pages as any).jaPages || {} };
    }
    default: {
      // All Asian, Nordic, Eastern European languages
      const [world, worldComplete, worldExtra, worldPages, pagesExtra] = await Promise.all([
        import("./i18n-world"),
        import("./i18n-world-complete"),
        import("./i18n-world-extra"),
        import("./i18n-world-pages"),
        import("./i18n-pages-extra"),
      ]);
      const suffix = locale as string;
      const allKey = `${suffix}All`;
      const completeKey = `${suffix}Complete`;
      const payExtraKey = `${suffix}PayExtra`;
      const pageExtraKey = `${suffix}PageExtra`;
      const pagesKey = `${suffix}Pages`;
      return {
        ...((world as any)[allKey] || {}),
        ...((worldComplete as any)[completeKey] || {}),
        ...((worldExtra as any)[payExtraKey] || {}),
        ...((worldPages as any)[pagesKey] || {}),
        ...((pagesExtra as any)[pageExtraKey] || {}),
      };
    }
  }
}
