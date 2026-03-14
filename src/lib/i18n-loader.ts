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

/** Map locale to its orbit export name */
const ORBIT_EXPORT_MAP: Record<string, string> = {
  es: "esOrbit", de: "deOrbit", it: "itOrbit", pt: "ptOrbit", nl: "nlOrbit",
  pl: "plOrbit", tr: "trOrbit", ar: "arOrbit", ja: "jaOrbit", ko: "koOrbit",
  zh: "zhOrbit", hi: "hiOrbit", th: "thOrbit", vi: "viOrbit", id: "idOrbit",
  ms: "msOrbit", sv: "svOrbit", da: "daOrbit", nb: "nbOrbit", fi: "fiOrbit",
  el: "elOrbit", cs: "csOrbit", hu: "huOrbit", ro: "roOrbit", hr: "hrOrbit",
  bg: "bgOrbit", sk: "skOrbit", he: "heOrbit", uk: "ukOrbit",
};

async function loadOrbitData(locale: string): Promise<LocaleData> {
  const key = ORBIT_EXPORT_MAP[locale];
  if (!key) return {};
  try {
    const mod = await import("./i18n-orbit-world");
    return (mod as any)[key] || {};
  } catch {
    return {};
  }
}

async function importLocale(locale: Locale): Promise<LocaleData> {
  switch (locale) {
    case "es": {
      const [ext, pages, pagesExtra, orbit] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-world-pages"),
        import("./i18n-pages-extra"),
        loadOrbitData("es"),
      ]);
      return { ...(ext as any).obEs || {}, ...(ext as any).pageEs || {}, ...(pagesExtra as any).pageEsExtra || {}, ...orbit };
    }
    case "de": {
      const [ext, pagesExtra, orbit] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-pages-extra"),
        loadOrbitData("de"),
      ]);
      return { ...(ext as any).obDe || {}, ...(ext as any).pageDe || {}, ...(pagesExtra as any).pageDeExtra || {}, ...orbit };
    }
    case "it": {
      const [ext, pagesIt, orbit] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-pages-it"),
        loadOrbitData("it"),
      ]);
      return { ...(ext as any).obIt || {}, ...(ext as any).pageIt || {}, ...(pagesIt as any).pageIt || {}, ...orbit };
    }
    case "pt": {
      const [ext, pagesExtra, orbit] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-pages-extra"),
        loadOrbitData("pt"),
      ]);
      return { ...(ext as any).obPt || {}, ...(ext as any).pagePt || {}, ...(pagesExtra as any).pagePtExtra || {}, ...orbit };
    }
    case "nl": {
      const [ext, pages, orbit] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-world-pages"),
        loadOrbitData("nl"),
      ]);
      return { ...(ext as any).obNl || {}, ...(ext as any).pageNl || {}, ...(pages as any).nlPages || {}, ...orbit };
    }
    case "pl": {
      const [ext, pages, orbit] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-world-pages"),
        loadOrbitData("pl"),
      ]);
      return { ...(ext as any).obPl || {}, ...(ext as any).pagePl || {}, ...(pages as any).plPages || {}, ...orbit };
    }
    case "tr": {
      const [ext, pages, orbit] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-world-pages"),
        loadOrbitData("tr"),
      ]);
      return { ...(ext as any).obTr || {}, ...(ext as any).pageTr || {}, ...(pages as any).trPages || {}, ...orbit };
    }
    case "ar": {
      const [ext, pages, orbit] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-world-pages"),
        loadOrbitData("ar"),
      ]);
      return { ...(ext as any).obAr || {}, ...(ext as any).pageAr || {}, ...(pages as any).arPages || {}, ...orbit };
    }
    case "ja": {
      const [ext, pages, orbit] = await Promise.all([
        import("./i18n-extended"),
        import("./i18n-world-pages"),
        loadOrbitData("ja"),
      ]);
      return { ...(ext as any).obJa || {}, ...(ext as any).pageJa || {}, ...(pages as any).jaPages || {}, ...orbit };
    }
    default: {
      // All Asian, Nordic, Eastern European languages
      const [world, worldComplete, worldExtra, worldPages, pagesExtra, orbit] = await Promise.all([
        import("./i18n-world"),
        import("./i18n-world-complete"),
        import("./i18n-world-extra"),
        import("./i18n-world-pages"),
        import("./i18n-pages-extra"),
        loadOrbitData(locale),
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
        ...orbit,
      };
    }
  }
}
