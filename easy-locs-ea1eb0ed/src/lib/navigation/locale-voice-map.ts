const LOCALE_TO_BCP47: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  de: "de-DE",
  pt: "pt-BR",
  it: "it-IT",
  nl: "nl-NL",
  ar: "ar-SA",
  he: "he-IL",
  fa: "fa-IR",
  tr: "tr-TR",
  pl: "pl-PL",
  ro: "ro-RO",
  cs: "cs-CZ",
  sv: "sv-SE",
  da: "da-DK",
  fi: "fi-FI",
  nb: "nb-NO",
  el: "el-GR",
  hu: "hu-HU",
  bg: "bg-BG",
  hr: "hr-HR",
  sk: "sk-SK",
  sl: "sl-SI",
  et: "et-EE",
  lv: "lv-LV",
  lt: "lt-LT",
  uk: "uk-UA",
  ru: "ru-RU",
  ja: "ja-JP",
  zh: "zh-CN",
  hi: "hi-IN",
  bn: "bn-BD",
  sw: "sw-KE",
  th: "th-TH",
  vi: "vi-VN",
  id: "id-ID",
  ms: "ms-MY",
  ko: "ko-KR",
  tl: "tl-PH",
  ur: "ur-PK",
  am: "am-ET",
  ha: "ha-NG",
  yo: "yo-NG",
  wo: "wo-SN",
};

const FALLBACK_LANG = "en-US";

function normalizeLocale(locale: string): string {
  const cleaned = locale.trim().replace("_", "-").toLowerCase();
  return cleaned.split("-")[0];
}

export function getVoiceBCP47(locale: string): string {
  const base = normalizeLocale(locale);
  if (LOCALE_TO_BCP47[base]) return LOCALE_TO_BCP47[base];

  const full = locale.trim().replace("_", "-");
  if (full.includes("-")) return full;

  return FALLBACK_LANG;
}

export function getMapLanguage(locale: string): string {
  const base = normalizeLocale(locale);
  const SUPPORTED = new Set([
    "ar", "bg", "bn", "cs", "da", "de", "el", "en", "es", "et", "fa",
    "fi", "fr", "he", "hi", "hr", "hu", "id", "it", "ja", "ko", "lt",
    "lv", "nl", "nb", "pl", "pt", "ro", "ru", "sk", "sl", "sv", "sw",
    "th", "tr", "uk", "vi", "yo", "zh",
  ]);
  if (SUPPORTED.has(base)) return base;
  return "en";
}

export function getMapboxLanguage(locale: string): string {
  return getMapLanguage(locale);
}

export function findBestVoice(locale: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  const bcp47 = getVoiceBCP47(locale);
  const langPrefix = normalizeLocale(locale);
  const voices = window.speechSynthesis.getVoices();

  const exact = voices.find(
    (v) => v.lang.replace("_", "-").toLowerCase() === bcp47.toLowerCase(),
  );
  if (exact) return exact;

  const prefixMatch = voices.find(
    (v) => normalizeLocale(v.lang) === langPrefix,
  );
  if (prefixMatch) return prefixMatch;

  const fallbackVoice = voices.find((v) => normalizeLocale(v.lang) === "en");
  return fallbackVoice ?? null;
}

export function isLocaleSupported(locale: string): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  const langPrefix = normalizeLocale(locale);
  const voices = window.speechSynthesis.getVoices();
  return voices.some((v) => normalizeLocale(v.lang) === langPrefix);
}
