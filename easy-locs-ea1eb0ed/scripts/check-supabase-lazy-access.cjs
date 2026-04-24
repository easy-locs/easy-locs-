#!/usr/bin/env node
/**
 * check-supabase-lazy-access.cjs
 *
 * Scans src/ for forbidden eager Supabase sub-client accesses at module-init
 * time. These cause the Proxy stub (used when env vars are absent) to throw
 * synchronously during module evaluation → permanent stuck splash.
 *
 * Forbidden patterns at module-init scope (top-level or in iife/immediately
 * invoked expressions, NOT inside arrow functions, async functions, or
 * useEffect/setTimeout/etc.):
 *   supabase.rpc(...)         → must be wrapped in arrow fn
 *   supabase.auth             → must be Object.defineProperty getter
 *   supabase.storage          → must be Object.defineProperty getter
 *   supabase.functions        → must be Object.defineProperty getter
 *   supabase.channel(...)     → must be wrapped in arrow fn
 *   supabase.removeChannel    → must be wrapped in arrow fn
 *   supabase.getChannels      → must be wrapped in arrow fn
 *   supabase.removeAllChannels→ must be wrapped in arrow fn
 *
 * Writes: docs/runtime/SUPABASE_RUNTIME_GUARD.md
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "src");
const OUT_DIR = path.join(ROOT, "docs", "runtime");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Sub-client property names that must NEVER be eagerly accessed at module init
const FORBIDDEN_PROPS = [
  "rpc", "auth", "storage", "functions",
  "channel", "removeChannel", "getChannels", "removeAllChannels",
];

// Pattern: supabase.<prop> where supabase is likely the client variable
// We look for direct property access NOT inside a function body at the
// file-level (conservative heuristic — we flag any top-level use and let the
// developer confirm).
//
// Strategy: flag lines that match `supabase\.<prop>` where the line appears
// to be outside a function context (no leading `const fn = () =>`, no `async`,
// no `function`, and not inside a class method body at depth > 1).
//
// Because we cannot do full AST analysis here, we use a simpler heuristic:
// Flag lines that match `supabase\.<prop>` AND are NOT on lines that clearly
// show lazy wrapping (get accessor definitions, arrow function bodies).

const SUPABASE_PROP_RE = new RegExp(
  `supabase\\.(${FORBIDDEN_PROPS.join("|")})(?:\\s*[.(\\[,;\\)\\s]|$)`, "g"
);

// Lines that indicate the access IS properly lazy
const LAZY_INDICATORS = [
  /Object\.defineProperty/,
  /Object\.defineProperties/,
  /get\s*\(\)/,         // getter shorthand
  /=>\s*supabase\./,    // arrow function returning supabase access
  /\(\)\s*=>/,          // arrow function (preceding the access)
  /async\s*\(/,
  /function\s*\(/,
  /\.bind\(/,
];

let totalFailures = 0;
let totalWarnings = 0;
const issues = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", "dist", ".git", "stories", "__tests__", "test"].includes(entry.name)) continue;
      walk(full);
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
      checkFile(full);
    }
  }
}

function checkFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  // Quick pre-filter: skip files that don't reference supabase at all
  if (!content.includes("supabase")) return;

  // Skip the db.ts file itself (it IS the lazy wrapper)
  if (rel.includes("services/db.ts") || rel.includes("services\\db.ts")) return;
  // Skip supabase client init file
  if (rel.includes("integrations/supabase")) return;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

    // Skip string literals (template strings, const x = "supabase.auth ...")
    // If the supabase access is inside quotes/backticks, it's not a real call
    const lineWithoutStrings = trimmed
      .replace(/"[^"]*supabase[^"]*"/g, '""')
      .replace(/'[^']*supabase[^']*'/g, "''")
      .replace(/`[^`]*supabase[^`]*`/g, "``");

    let m;
    SUPABASE_PROP_RE.lastIndex = 0;
    while ((m = SUPABASE_PROP_RE.exec(lineWithoutStrings)) !== null) {
      const prop = m[1];

      // Check surrounding context for lazy indicators
      const contextBefore = lines.slice(Math.max(0, i - 5), i + 1).join(" ");
      const contextAfter = lines.slice(i, Math.min(lines.length, i + 3)).join(" ");
      const context = contextBefore + " " + contextAfter;

      const isLazy = LAZY_INDICATORS.some(re => re.test(context));

      // Additional check: is the access inside a function/hook/async context?
      // Look back up to 20 lines for function scope indicators.
      const lineContext = lines.slice(Math.max(0, i - 20), i).join("\n");
      const inFunction = /(?:function\s|=>\s*\{|async\s+function|useEffect|setTimeout|setInterval|on\w+\s*[=(]|handle\w+\s*[=(]|export\s+(?:default\s+)?(?:async\s+)?function\s|private\s+(?:async\s+)?(?:\w+\s*)\(|public\s+(?:async\s+)?)/.test(lineContext);

      // If the line itself contains `await `, it's definitely inside an async function
      const hasAwait = line.includes("await ");

      // Indentation heuristic: >= 4 spaces or 1 tab of leading whitespace means
      // we're inside a block (class method, function body, if/try/etc.)
      const leadingWS = line.match(/^(\s+)/)?.[1] ?? "";
      const indent = leadingWS.replace(/\t/g, "  ").length;
      const isIndented = indent >= 4;

      if (!isLazy && !inFunction && !hasAwait && !isIndented) {
        issues.push({
          file: rel,
          line: i + 1,
          col: m.index + 1,
          prop,
          code: trimmed.slice(0, 120),
          severity: "BLOCKER",
          hint: `Wrap in arrow fn or Object.defineProperty getter to make lazy.`,
        });
        totalFailures++;
        console.error(`  ❌ BLOCKER [${rel}:${i + 1}] supabase.${prop} — possible eager access`);
      } else if (!isLazy && !hasAwait && !isIndented) {
        // Inside a function but no clear lazy indicator — info only
        issues.push({
          file: rel,
          line: i + 1,
          col: m.index + 1,
          prop,
          code: trimmed.slice(0, 120),
          severity: "INFO",
          hint: `Confirm this is inside a function body (lazy). If at module-init scope, wrap it.`,
        });
        totalWarnings++;
      }
    }
  }
}

console.log("[supabase-guard] Scanning src/ for eager Supabase sub-client accesses...\n");
walk(SRC_DIR);

const blockers = issues.filter(i => i.severity === "BLOCKER");
const infos = issues.filter(i => i.severity === "INFO");

console.log(`\n[supabase-guard] ─── Summary ───`);
console.log(`  Potential eager accesses (BLOCKER): ${blockers.length}`);
console.log(`  Info (inside function, confirm lazy): ${infos.length}`);

const verdict = blockers.length === 0 ? "PASS" : "FAIL";
console.log(`  Verdict: ${verdict}\n`);

// ─── write report ─────────────────────────────────────────────────────────────

let md = `# Supabase Runtime Guard Report\n\n`;
md += `> Generated: ${new Date().toISOString()}\n`;
md += `> Verdict: **${verdict}**\n`;
md += `> Blockers: ${blockers.length} | Info: ${infos.length}\n\n`;
md += `## Why This Matters\n\n`;
md += `When Supabase env vars (\`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_PUBLISHABLE_KEY\`) are\n`;
md += `absent, the exported \`supabase\` client is a Proxy stub that **throws on any property access**.\n`;
md += `If a module accesses \`supabase.auth\`, \`supabase.rpc\`, etc. at import/module-eval time,\n`;
md += `the synchronous throw prevents React from ever mounting → permanent stuck splash.\n\n`;
md += `## Forbidden Eager Properties\n\n`;
md += FORBIDDEN_PROPS.map(p => `- \`supabase.${p}\``).join("\n") + "\n\n";
md += `## Correct Patterns\n\n`;
md += `\`\`\`ts\n`;
md += `// ✅ Arrow function wrapper (rpc, channel, etc.)\nexport const db = Object.assign(_from, {\n  rpc: ((...args) => supabase.rpc(...args)) as typeof supabase.rpc,\n  channel: (...args) => supabase.channel(...args),\n});\n\n`;
md += `// ✅ Object.defineProperty getter (auth, storage, functions)\nObject.defineProperties(db, {\n  auth:     { get: () => supabase.auth,     enumerable: true, configurable: true },\n  storage:  { get: () => supabase.storage,  enumerable: true, configurable: true },\n  functions:{ get: () => supabase.functions, enumerable: true, configurable: true },\n});\n\`\`\`\n\n`;

if (blockers.length > 0) {
  md += `## ❌ Blocker Issues\n\n`;
  md += `| File | Line | Property | Code |\n|---|---|---|---|\n`;
  for (const i of blockers) {
    md += `| \`${i.file}\` | ${i.line} | \`${i.prop}\` | \`${i.code.replace(/\|/g, "\\|")}\` |\n`;
  }
  md += `\n`;
}

if (infos.length > 0) {
  md += `## ℹ️ Info (confirm lazy)\n\n`;
  md += `| File | Line | Property | Code |\n|---|---|---|---|\n`;
  for (const i of infos) {
    md += `| \`${i.file}\` | ${i.line} | \`${i.prop}\` | \`${i.code.replace(/\|/g, "\\|")}\` |\n`;
  }
  md += `\n`;
}

if (blockers.length === 0 && infos.length === 0) {
  md += `## ✅ No Issues Found\n\nAll Supabase sub-client accesses appear to be properly lazy.\n`;
}

fs.writeFileSync(path.join(OUT_DIR, "SUPABASE_RUNTIME_GUARD.md"), md, "utf8");
console.log("[supabase-guard] Report written to docs/runtime/SUPABASE_RUNTIME_GUARD.md");

if (blockers.length > 0) process.exit(1);
