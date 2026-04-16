import onboardingData from "./i18n-onboarding.json";

const _ob = onboardingData as Record<string, Record<string, string>>;

export const obFr = _ob.fr;
export const obEn = _ob.en;
export const obEs = _ob.es;
export const obDe = _ob.de;
export const obIt = _ob.it;
export const obPt = _ob.pt;
export const obAr = _ob.ar;

const localeChunkModules = import.meta.glob<{ default: Record<string, string> }>(
  "./i18n-locale-chunks/*.json"
);

const CHUNK_PREFIX = "./i18n-locale-chunks/";
const CHUNK_SUFFIX = ".json";

export type Locale = string & {};

export const SUPPORTED_LOCALES: ReadonlySet<string> = new Set(
  Object.keys(localeChunkModules).map(
    (key) => key.slice(CHUNK_PREFIX.length, -CHUNK_SUFFIX.length)
  )
);

export function isSupported(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.has(locale);
}

function loadLocaleChunk(locale: Locale): Promise<Record<string, string>> {
  const key = `${CHUNK_PREFIX}${locale}${CHUNK_SUFFIX}`;
  const loader = localeChunkModules[key];
  if (!loader) {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] No locale chunk found for "${locale}". Available: ${[...SUPPORTED_LOCALES].join(", ")}`);
    }
    return Promise.resolve({});
  }
  return loader().then((m) => m.default);
}

const loadedLocales = new Map<Locale, Record<string, string>>();

export async function loadLocaleTranslations(locale: Locale): Promise<Record<string, string>> {
  if (loadedLocales.has(locale)) return loadedLocales.get(locale)!;
  if (!SUPPORTED_LOCALES.has(locale)) return {};
  try {
    const data = await loadLocaleChunk(locale);
    const onboardingExtraData = (await import("./i18n-onboarding-extra.json")).default as Record<string, Record<string, string>>;
    const extra = onboardingExtraData[locale];
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
