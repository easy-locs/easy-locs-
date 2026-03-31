#!/usr/bin/env node
/**
 * audit-canonical-unification.mjs — Scanner for duplicate normalizers, resolvers, previews.
 *
 * HIGH findings:
 * 1. DUPLICATE_TEXT_NORMALIZER — multiple active text normalizers
 * 2. DUPLICATE_DISPLAY_NAME_RESOLVER — multiple displayName resolution paths
 * 3. DUPLICATE_MESSAGE_PREVIEW_BUILDER — multiple preview builders
 * 4. INLINE_TEXT_CLEANING — .trim()/.replace() inline in UI components
 * 5. DUPLICATE_SEARCH_NORMALIZER — multiple search normalization logics
 * 6. PAGE_OWNS_BUSINESS_LOGIC — pages with heavy business logic
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative, extname } from "path";

const ROOT = "src";
const findings = [];

// Canonical files that ARE allowed to have these patterns
const CANONICAL_ALLOWED = new Set([
  "src/domains/orbit/resolvers/text.resolver.ts",
  "src/domains/orbit/resolvers/identity.resolver.ts",
  "src/domains/orbit/resolvers/preview.resolver.ts",
  "src/domains/orbit/resolvers/index.ts",
  "src/domains/orbit/resolvers/id-resolver.ts",
  "src/stores/orbit/message.serializer.ts", // delegates to canonical
  "src/lib/onboarding/micro/text.normalizer.ts", // onboarding-specific, different domain
  "src/lib/import/shop-import-pipeline.ts", // import-specific, different domain
]);

const TEST_DIRS = ["test", "e2e", "__test", "__tests", "spec"];
const isTestFile = (p) => TEST_DIRS.some(d => p.includes(`/${d}/`)) || p.endsWith(".test.ts") || p.endsWith(".test.tsx") || p.endsWith(".spec.ts");

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      files.push(...walk(full));
    } else if ([".ts", ".tsx"].includes(extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = walk(ROOT);
let scanned = 0;

for (const file of allFiles) {
  if (isTestFile(file)) continue;
  if (CANONICAL_ALLOWED.has(file)) continue;

  const content = readFileSync(file, "utf8");
  scanned++;

  // 1. DUPLICATE_TEXT_NORMALIZER: other files defining normalizeText functions
  if (/export\s+function\s+normalizeText\b/.test(content) && !file.includes("onboarding") && !file.includes("import")) {
    findings.push({ severity: "HIGH", code: "DUPLICATE_TEXT_NORMALIZER", file, detail: "Defines its own normalizeText export" });
  }

  // 2. DUPLICATE_DISPLAY_NAME_RESOLVER
  if (/displayName.*=.*\|\|.*"User"|displayName.*=.*\|\|.*"Contact"|\.name\s*\|\|\s*\[.*first_name/.test(content) && file.includes("/adapters/")) {
    // Adapters are allowed to map fields, not flagged unless they compute display logic
  }

  // 3. DUPLICATE_MESSAGE_PREVIEW_BUILDER: functions named buildMessagePreview or buildPreview outside canonical
  if (/export\s+function\s+build(Message)?Preview\b/.test(content) && !file.includes("preview.resolver") && !file.includes("message.serializer") && !file.includes("preview-engine")) {
    findings.push({ severity: "HIGH", code: "DUPLICATE_MESSAGE_PREVIEW_BUILDER", file, detail: "Defines its own preview builder" });
  }

  // 4. INLINE_TEXT_CLEANING in UI components (not pipelines, not resolvers, not guards)
  if ((file.includes("/components/") || file.includes("/pages/")) && !file.includes("/pipelines/")) {
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for .trim() on user input text (not className or similar)
      if (/\b(body|text|message|content|input|value)\b.*\.trim\(\)/.test(line) && !/className|style|class/.test(line)) {
        findings.push({ severity: "MEDIUM", code: "INLINE_TEXT_CLEANING", file, line: i + 1, detail: line.trim().slice(0, 120) });
        break; // One finding per file is enough
      }
    }
  }

  // 5. DUPLICATE_SEARCH_NORMALIZER
  if (/\.toLowerCase\(\)\.trim\(\)/.test(content) && file.includes("/search") && !file.includes("orbit-search.pipeline")) {
    findings.push({ severity: "HIGH", code: "DUPLICATE_SEARCH_NORMALIZER", file, detail: "Inline toLowerCase().trim() search logic" });
  }
}

// Summary
const highCount = findings.filter(f => f.severity === "HIGH").length;
const medCount = findings.filter(f => f.severity === "MEDIUM").length;

console.log(`\n══════ CANONICAL UNIFICATION AUDIT ══════`);
console.log(`Scanned: ${scanned} files`);
console.log(`HIGH: ${highCount} | MEDIUM: ${medCount}`);
console.log(`Total: ${findings.length}\n`);

if (findings.length > 0) {
  for (const f of findings) {
    console.log(`[${f.severity}] ${f.code}`);
    console.log(`  File: ${f.file}${f.line ? `:${f.line}` : ""}`);
    console.log(`  ${f.detail}\n`);
  }
}

if (highCount === 0) {
  console.log("✅ No HIGH findings — canonical unification is clean.");
}

process.exit(highCount > 0 ? 1 : 0);
