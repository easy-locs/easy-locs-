import fs from "node:fs";
import path from "node:path";

const LOCALE_LABELS: Record<string, string> = {
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

const CHUNKS_DIR = path.resolve(
  import.meta.dirname,
  "../src/lib/i18n-locale-chunks",
);
const OUTPUT = path.resolve(import.meta.dirname, "../src/lib/i18n-locales.ts");

const codes = fs
  .readdirSync(CHUNKS_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(".json", ""))
  .sort();

if (codes.length === 0) {
  console.error("No locale JSON files found in", CHUNKS_DIR);
  process.exit(1);
}

const missing = codes.filter((c) => !(c in LOCALE_LABELS));
if (missing.length > 0) {
  console.error(
    `Missing display labels in generate-locales.ts for: ${missing.join(", ")}`,
  );
  process.exit(1);
}

const localeRows: string[] = [];
for (let i = 0; i < codes.length; i += 10) {
  localeRows.push(codes.slice(i, i + 10).map((c) => `"${c}"`).join(", "));
}

const labelEntries = codes.map((c) => `  ${c}: "${LOCALE_LABELS[c]}",`);

const content = [
  "// AUTO-GENERATED — do not edit manually.",
  "// Re-run `npm run generate:locales` after adding or removing locale JSON files.",
  "",
  "export const APP_LOCALES = [",
  ...localeRows.map((r) => `  ${r},`),
  "] as const;",
  "",
  "export type AppLocale = (typeof APP_LOCALES)[number];",
  "",
  "export const LOCALE_LABELS: Record<AppLocale, string> = {",
  ...labelEntries,
  "};",
  "",
  "export const AVAILABLE_LOCALES: { value: AppLocale; label: string }[] =",
  "  APP_LOCALES.map((code) => ({ value: code, label: LOCALE_LABELS[code] }));",
  "",
].join("\n");

fs.writeFileSync(OUTPUT, content, "utf-8");
console.log(
  `Generated ${OUTPUT} with ${codes.length} locales: ${codes.join(", ")}`,
);
