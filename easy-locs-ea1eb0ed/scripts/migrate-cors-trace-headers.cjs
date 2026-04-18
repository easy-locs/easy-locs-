#!/usr/bin/env node
/**
 * One-shot migration: ensure every hardcoded
 * `Access-Control-Allow-Headers` value across `supabase/functions/**`
 * includes the five distributed-tracing headers the frontend injects.
 *
 * Idempotent — running it twice is a no-op.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "supabase", "functions");
const TRACE_HEADERS = [
  "x-trace-id",
  "x-span-id",
  "x-parent-span-id",
  "x-request-id",
  "traceparent",
];

const STRING_LITERAL = /(["'`])([^"'`\n]*?)\1/g;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function patchFile(file) {
  const src = fs.readFileSync(file, "utf8");
  if (!src.includes("Access-Control-Allow-Headers")) return false;

  let changed = false;
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/Access-Control-Allow-Headers/.test(lines[i])) continue;
    // The value may be on the same line or the next 1-2 lines.
    for (let j = i; j < Math.min(i + 4, lines.length); j++) {
      const line = lines[j];
      // Skip the key-only line (no quoted value besides the key itself).
      const matches = [...line.matchAll(STRING_LITERAL)];
      if (matches.length === 0) continue;
      // Find the value literal — the longest match that is not exactly
      // "Access-Control-Allow-Headers".
      const valueMatch = matches
        .filter((m) => m[2] !== "Access-Control-Allow-Headers")
        .sort((a, b) => b[2].length - a[2].length)[0];
      if (!valueMatch) continue;
      const value = valueMatch[2];
      if (!/authorization|apikey|content-type/i.test(value)) continue;
      const lower = value.toLowerCase();
      const missing = TRACE_HEADERS.filter((h) => !lower.includes(h));
      if (missing.length === 0) {
        // Already migrated — stop scanning this block.
        break;
      }
      const newValue = value.replace(/,?\s*$/, "") + ", " + missing.join(", ");
      const replaced = line.replace(value, newValue);
      if (replaced !== line) {
        lines[j] = replaced;
        changed = true;
      }
      break;
    }
  }
  if (changed) fs.writeFileSync(file, lines.join("\n"));
  return changed;
}

const files = walk(ROOT);
let touched = 0;
for (const f of files) {
  if (patchFile(f)) {
    touched += 1;
    console.log("patched", path.relative(ROOT, f));
  }
}
console.log(`\nDone. Patched ${touched} file(s).`);
