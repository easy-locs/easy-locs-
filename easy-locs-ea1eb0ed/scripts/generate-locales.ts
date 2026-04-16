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

const rows: string[] = [];
for (let i = 0; i < codes.length; i += 10) {
  rows.push(codes.slice(i, i + 10).map((c) => `"${c}"`).join(", "));
}

const content = [
  "// AUTO-GENERATED — do not edit manually.",
  "// Re-run `npm run generate:locales` after adding or removing locale JSON files.",
  "",
  "export const APP_LOCALES = [",
  ...rows.map((r) => `  ${r},`),
  "] as const;",
  "",
  "export type AppLocale = (typeof APP_LOCALES)[number];",
  "",
].join("\n");

fs.writeFileSync(OUTPUT, content, "utf-8");
console.log(
  `Generated ${OUTPUT} with ${codes.length} locales: ${codes.join(", ")}`,
);
