#!/usr/bin/env node
// Extract per-table column rows (file:line:table:column:type) from
// supabase/migrations/. Read-only. Idempotent.

import fs from "node:fs";
import path from "node:path";

const migDir = process.argv[2];
const outPath = process.argv[3];
if (!migDir || !outPath) {
  console.error("usage: extract-columns.mjs <migrations-dir> <out-csv>");
  process.exit(2);
}

const tableRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?<name>"?[A-Za-z0-9_.]+"?)\s*\(/i;
const colRe = /^\s*(?<col>"?[A-Za-z_][A-Za-z0-9_]*"?)\s+(?<type>[A-Za-z][A-Za-z0-9_]*(?:\s*\([^)]*\))?(?:\s*\[\])?)/;
const controlWords = new Set([
  "constraint", "primary", "foreign", "unique", "check", "like", "exclude",
]);

const out = ["file,line,table,column,type"];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".sql")) parse(full);
  }
}

function parse(file) {
  const rel = file.split("supabase/migrations/").pop();
  const text = fs.readFileSync(file, "utf8");
  const lines = text.split("\n");
  let inTable = false;
  let depth = 0;
  let curTable = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;
    if (!inTable) {
      const m = line.match(tableRe);
      if (m) {
        curTable = m.groups.name.replace(/^"|"$/g, "").replace(/^public\./, "");
        inTable = true;
        depth = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
        if (depth <= 0) inTable = false;
      }
      continue;
    }
    depth += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
    const stripped = line.trim();
    if (stripped && !stripped.startsWith("--")) {
      const first = stripped.split(/\s+/)[0].toLowerCase().replace(/^"|"$/g, "");
      if (!controlWords.has(first) && first !== ")" && first !== "(") {
        const cm = line.match(colRe);
        if (cm) {
          const col = cm.groups.col.replace(/^"|"$/g, "");
          const typ = cm.groups.type.toLowerCase().replace(/\s+/g, " ").replace(/,$/, "");
          if (!controlWords.has(col.toLowerCase())) {
            out.push(`${rel},${lineNo},${curTable},${col},"${typ}"`);
          }
        }
      }
    }
    if (depth <= 0) {
      inTable = false;
      curTable = null;
    }
  }
}

walk(migDir);
fs.writeFileSync(outPath, out.join("\n") + "\n");
console.log(`Wrote ${outPath} with ${out.length - 1} column rows`);
