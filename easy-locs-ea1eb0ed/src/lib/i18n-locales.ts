// AUTO-GENERATED — do not edit manually.
// Re-run `npm run generate:locales` after adding or removing locale JSON files.

export const APP_LOCALES = [
  "am", "ar", "bg", "bn", "cs", "da", "de", "el", "en", "es",
  "et", "fa", "fi", "fr", "ha", "he", "hi", "hr", "hu", "id",
  "it", "ja", "ko", "lt", "lv", "ms", "nb", "nl", "pl", "pt",
  "ro", "ru", "sk", "sl", "sv", "sw", "th", "tl", "tr", "uk",
  "ur", "vi", "wo", "yo", "zh",
] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const LOCALE_LABELS: Record<AppLocale, string> = {
  am: "አማርኛ",
  ar: "العربية",
  bg: "Български",
  bn: "বাংলা",
  cs: "Čeština",
  da: "Dansk",
  de: "Deutsch",
  el: "Ελληνικά",
  en: "English",
  es: "Español",
  et: "Eesti",
  fa: "فارسی",
  fi: "Suomi",
  fr: "Français",
  ha: "Hausa",
  he: "עברית",
  hi: "हिन्दी",
  hr: "Hrvatski",
  hu: "Magyar",
  id: "Bahasa Indonesia",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  lt: "Lietuvių",
  lv: "Latviešu",
  ms: "Bahasa Melayu",
  nb: "Norsk",
  nl: "Nederlands",
  pl: "Polski",
  pt: "Português",
  ro: "Română",
  ru: "Русский",
  sk: "Slovenčina",
  sl: "Slovenščina",
  sv: "Svenska",
  sw: "Kiswahili",
  th: "ไทย",
  tl: "Tagalog",
  tr: "Türkçe",
  uk: "Українська",
  ur: "اردو",
  vi: "Tiếng Việt",
  wo: "Wolof",
  yo: "Yorùbá",
  zh: "中文",
};

export const AVAILABLE_LOCALES: { value: AppLocale; label: string }[] =
  APP_LOCALES.map((code) => ({ value: code, label: LOCALE_LABELS[code] }));
