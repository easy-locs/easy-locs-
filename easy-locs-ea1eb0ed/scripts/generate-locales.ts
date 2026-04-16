import fs from "node:fs";
import path from "node:path";

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

const localeLabels: Record<string, string> = {};
const missing: string[] = [];

for (const code of codes) {
  const filePath = path.join(CHUNKS_DIR, `${code}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const label = data["locale.name"];
  if (typeof label === "string" && label.length > 0) {
    localeLabels[code] = label;
  } else {
    missing.push(code);
  }
}

if (missing.length > 0) {
  console.error(
    `Missing "locale.name" key in translation files: ${missing.join(", ")}`,
  );
  process.exit(1);
}

const localeRows: string[] = [];
for (let i = 0; i < codes.length; i += 10) {
  localeRows.push(codes.slice(i, i + 10).map((c) => `"${c}"`).join(", "));
}

const labelEntries = codes.map((c) => `  ${c}: "${localeLabels[c]}",`);

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
