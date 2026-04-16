export const APP_LOCALES = [
  "fr", "en", "es", "de", "pt", "it", "nl", "ar", "he", "fa",
  "tr", "pl", "ro", "cs", "sv", "da", "fi", "nb", "el", "hu",
  "bg", "hr", "sk", "sl", "et", "lv", "lt", "uk", "ru", "ja", "zh",
  "hi", "bn", "sw", "th", "vi", "id", "ms", "ko", "tl", "ur",
  "am", "ha", "yo", "wo",
] as const;

export type AppLocale = typeof APP_LOCALES[number];
