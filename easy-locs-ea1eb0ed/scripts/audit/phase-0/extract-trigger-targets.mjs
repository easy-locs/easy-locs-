#!/usr/bin/env node
// Extract function names invoked by CREATE TRIGGER … EXECUTE FUNCTION/PROCEDURE,
// including triggers whose definition spans multiple lines.
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: extract-trigger-targets.mjs <migrations-dir>"); process.exit(2); }

const out = new Set();
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.isFile() && e.name.endsWith(".sql")) {
      const t = fs.readFileSync(p, "utf8");
      const re = /CREATE\s+TRIGGER[\s\S]{1,1200}?EXECUTE\s+(?:FUNCTION|PROCEDURE)\s+(?:[a-zA-Z_][a-zA-Z0-9_]*\.)?([a-zA-Z_][a-zA-Z0-9_]*)/gi;
      let m;
      while ((m = re.exec(t))) out.add(m[1]);
    }
  }
}
walk(dir);
for (const n of [...out].sort()) console.log(n);
