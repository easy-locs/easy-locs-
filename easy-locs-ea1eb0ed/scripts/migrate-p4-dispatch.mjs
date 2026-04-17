#!/usr/bin/env node
/**
 * Mechanical P4 dispatch migration — task #928 (L7 P4).
 *
 * For every entry in `.eslintrc.dispatch-allowlist.json` tagged with
 * `owning_phase: "P4"`, attempt a mechanical replacement of direct
 * `.insert/.update/.upsert/.delete/.rpc` chains with calls through the
 * structurally-exempt content/contacts mutation helpers added by this
 * task.
 *
 * Replacements (client side, src/**):
 *   db("table")        →  cFrom("table")           (helper passes through)
 *   db.from("table")   →  cFrom("table")
 *   db.rpc("name", x)  →  cRpc("name", x)
 *
 * Replacements (edge side, supabase/functions/**):
 *   <recv>.from("t").<op>(...)   →  cFromEdge(<recv>, "t").<op>(...)
 *   <recv>.rpc("n", a)           →  cRpcEdge(<recv>, "n", a)
 *
 * After mutation, the file is re-scanned with the same trigger patterns
 * the eslint plugin uses (best-effort string match — not a full AST
 * check). If no remaining direct mutations are found, the entry is
 * eligible for removal from the allowlist.
 *
 * The script PRINTS a JSON summary to stdout and writes it to
 * .local/p4-migration-report.json (gitignored). It does NOT touch the
 * allowlist itself — that pruning is a separate, reviewable step driven
 * by the report.
 */

import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(new URL(".", import.meta.url).pathname, "..");
const ALLOWLIST = path.join(REPO, ".eslintrc.dispatch-allowlist.json");

// Pick the right helper module based on the file path. tenant-signup,
// auto-onboarding-cron, and explicit contacts repositories use the
// contacts helper; everything else uses the content helper.
function pickModule(file) {
  const lower = file.toLowerCase();
  if (
    lower.includes("contacts") ||
    lower.includes("tenant-signup") ||
    lower.includes("tenant.repository") ||
    lower.includes("tenant-portal.repository") ||
    lower.includes("tenant-docs.repository") ||
    lower.includes("tenant-requests.repository") ||
    lower.includes("auto-onboarding-cron")
  ) {
    return "contacts";
  }
  return "content";
}

function clientImport(mod) {
  return mod === "contacts"
    ? `import { ctFrom as cFrom, ctRpc as cRpc } from "@/lib/execution/contacts-mutation";`
    : `import { cFrom, cRpc } from "@/lib/execution/content-mutation";`;
}

function edgeImport(mod) {
  return mod === "contacts"
    ? `import { ctFromEdge as cFromEdge, ctRpcEdge as cRpcEdge } from "../_shared/execution/contacts-mutation.ts";`
    : `import { cFromEdge, cRpcEdge } from "../_shared/execution/content-mutation.ts";`;
}

function edgeImportFromShared(mod) {
  return mod === "contacts"
    ? `import { ctFromEdge as cFromEdge, ctRpcEdge as cRpcEdge } from "./execution/contacts-mutation.ts";`
    : `import { cFromEdge, cRpcEdge } from "./execution/content-mutation.ts";`;
}

function edgeImportPath(file, mod) {
  // supabase/functions/<name>/index.ts → ../_shared/execution/...
  // supabase/functions/_shared/<file>.ts → ./execution/...
  if (file.startsWith("supabase/functions/_shared/")) {
    return edgeImportFromShared(mod);
  }
  return edgeImport(mod);
}

const MUT_RX = /\.(insert|update|upsert|delete)\s*\(/;
const RPC_RX = /\.rpc\s*\(/;

// Lint-trigger pattern — mirrors the actual rule (mutation methods only).
// The rule flags:
//   <builder-root>.from("table")...<insert|update|upsert|delete>(...)
//   <builder-root>("table")...<insert|update|upsert|delete>(...)
//   <builder-root>.rpc("name", ...)
// where <builder-root> matches /^(db|v2db|supabase|sb|client|getClient)$/
// or has the suffix `Db`/`db` (e.g. domainDb, orbitDb).
function hasResidualMutation(text) {
  // Strip line comments and block comments to avoid false positives.
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  // Look for any `<root>.from(...)` followed (within the next ~600 chars,
  // before a semicolon) by a mutation method.
  const fromRx =
    /\b(?:db|v2db|supabase|sb|client|getClient\(\)|\w*[dD]b)\s*\.\s*from\s*\(/g;
  let m;
  while ((m = fromRx.exec(stripped))) {
    const tail = stripped.slice(m.index, m.index + 600);
    const stmtEnd = tail.indexOf(";");
    const window = stmtEnd === -1 ? tail : tail.slice(0, stmtEnd);
    if (/\.(insert|update|upsert|delete)\s*\(/.test(window)) return true;
  }
  // Shorthand: db("table") or v2db("table") followed by mutation.
  const shortRx = /\b(?:db|v2db)\s*\(\s*['"`][^'"`]+['"`]/g;
  while ((m = shortRx.exec(stripped))) {
    const tail = stripped.slice(m.index, m.index + 400);
    const stmtEnd = tail.indexOf(";");
    const window = stmtEnd === -1 ? tail : tail.slice(0, stmtEnd);
    if (/\.(insert|update|upsert|delete)\s*\(/.test(window)) return true;
  }
  // RPC: any builder-root `.rpc(`
  if (/\b(?:db|v2db|supabase|sb|client|\w*[dD]b)\s*\.\s*rpc\s*\(/.test(stripped)) {
    return true;
  }
  return false;
}

function migrateClient(text, mod) {
  let out = text;
  let changed = false;

  // 1. db("table") → cFrom("table") (function-call form, optional `as any`)
  out = out.replace(
    /\bdb\s*\(\s*(['"`][^'"`]+['"`])(?:\s+as\s+\w+)?\s*\)/g,
    (m, lit) => {
      changed = true;
      return `cFrom(${lit})`;
    },
  );

  // 2. db.from("table") → cFrom("table") — allow whitespace/newlines between
  //    `db` and `.from(...)` for the common chained-call layout.
  out = out.replace(
    /\bdb\s*\.\s*from\s*\(\s*(['"`][^'"`]+['"`])(?:\s+as\s+\w+)?\s*\)/g,
    (m, lit) => {
      changed = true;
      return `cFrom(${lit})`;
    },
  );

  // 2a-i. db.from(<identifier>) — dynamic table name. Only transform when a
  // mutation method appears in the same chain (next ~400 chars).
  out = out.replace(
    /\bdb\s*\.\s*from\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g,
    (m, ident, offset) => {
      const tail = text.slice(offset, offset + 400);
      if (!MUT_RX.test(tail)) return m;
      changed = true;
      return `cFrom(${ident})`;
    },
  );

  // 2b. v2db("table") and v2db.from("table") — same shape as db.
  out = out.replace(
    /\bv2db\s*\(\s*(['"`][^'"`]+['"`])(?:\s+as\s+\w+)?\s*\)/g,
    (m, lit) => {
      changed = true;
      return `cFrom(${lit})`;
    },
  );
  out = out.replace(
    /\bv2db\s*\.\s*from\s*\(\s*(['"`][^'"`]+['"`])(?:\s+as\s+\w+)?\s*\)/g,
    (m, lit) => {
      changed = true;
      return `cFrom(${lit})`;
    },
  );

  // 2c. domainDb.<schema>.from("table") → cFrom("table", { schema: "<schema>" })
  out = out.replace(
    /\bdomainDb\s*\.\s*(\w+)\s*\.\s*from\s*\(\s*(['"`][^'"`]+['"`])(?:\s+as\s+\w+)?\s*\)/g,
    (m, schema, lit) => {
      changed = true;
      return `cFrom(${lit}, { schema: "${schema}" })`;
    },
  );

  // 2d. supabase.from("table") (rare in client code but seen)
  out = out.replace(
    /\bsupabase\s*\.\s*from\s*\(\s*(['"`][^'"`]+['"`])(?:\s+as\s+\w+)?\s*\)/g,
    (m, lit) => {
      changed = true;
      return `cFrom(${lit})`;
    },
  );
  out = out.replace(/\bsupabase\s*\.\s*rpc\s*\(/g, (m) => {
    changed = true;
    return "cRpc(";
  });

  // 3. db.rpc("name", args) → cRpc("name", args) — careful with parens.
  out = out.replace(/\bdb\s*\.\s*rpc\s*\(/g, (m) => {
    changed = true;
    return "cRpc(";
  });
  out = out.replace(/\bv2db\s*\.\s*rpc\s*\(/g, (m) => {
    changed = true;
    return "cRpc(";
  });

  if (!changed) return { text, changed: false };

  // Add import (only if not already present)
  const importLine = clientImport(mod);
  if (!out.includes("@/lib/execution/content-mutation") &&
      !out.includes("@/lib/execution/contacts-mutation")) {
    // Insert after the last existing import in the top of file
    const importMatches = [...out.matchAll(/^import .*?;\s*$/gm)];
    if (importMatches.length) {
      const last = importMatches[importMatches.length - 1];
      const idx = last.index + last[0].length;
      out = out.slice(0, idx) + "\n" + importLine + out.slice(idx);
    } else {
      out = importLine + "\n" + out;
    }
  }

  return { text: out, changed: true };
}

function migrateEdge(text, mod, file) {
  let out = text;
  let changed = false;

  // For edge files we don't know the receiver name without an AST. Apply
  // safe, common patterns: any `<ident>.from("table")` followed by a
  // mutation in the same chain, or `<ident>.rpc(`. Keep selects untouched.
  // Pattern: Identifier.from("string") -> cFromEdge(Identifier, "string")
  // We only transform when we can statically see a mutation in the chain
  // (look for .insert/.update/.upsert/.delete within ~300 chars after).
  // Schema-qualified chain: <recv>.schema("s").from("t") → cFromEdge(<recv>.schema("s"), "t")
  const schemaFromRx =
    /\b(supabase|sb|client|admin|sbAdmin|adminClient|db|supabaseAdmin|supabaseClient|serviceClient)\s*\.\s*schema\s*\(\s*(['"`][^'"`]+['"`])\s*\)\s*\.\s*from\s*\(\s*(['"`][^'"`]+['"`])(?:\s+as\s+\w+)?\s*\)/g;
  out = out.replace(schemaFromRx, (m, recv, schemaLit, lit, offset) => {
    const tail = text.slice(offset, offset + 800);
    if (!MUT_RX.test(tail)) return m;
    changed = true;
    return `cFromEdge(${recv}.schema(${schemaLit}), ${lit})`;
  });

  const fromCallRx =
    /\b(supabase|sb|client|admin|sbAdmin|adminClient|db|supabaseAdmin|supabaseClient|serviceClient)\s*\.\s*from\s*\(\s*(['"`][^'"`]+['"`])(?:\s+as\s+\w+)?\s*\)/g;
  out = out.replace(fromCallRx, (m, recv, lit, offset) => {
    const tail = text.slice(offset, offset + 600);
    if (!MUT_RX.test(tail)) return m; // pure read — leave it
    changed = true;
    return `cFromEdge(${recv}, ${lit})`;
  });

  // RPC: <recv>.rpc("name", ...) → cRpcEdge(<recv>, "name", ...)
  const rpcRx =
    /\b(supabase|sb|client|admin|sbAdmin|adminClient|db|supabaseAdmin|supabaseClient|serviceClient)\s*\.\s*rpc\s*\(/g;
  out = out.replace(rpcRx, (m, recv) => {
    changed = true;
    return `cRpcEdge(${recv}, `;
  });

  if (!changed) return { text, changed: false };

  const importLine = edgeImportPath(file, mod);
  if (
    !out.includes("/execution/content-mutation") &&
    !out.includes("/execution/contacts-mutation")
  ) {
    const importMatches = [...out.matchAll(/^import .*?;\s*$/gm)];
    if (importMatches.length) {
      const last = importMatches[importMatches.length - 1];
      const idx = last.index + last[0].length;
      out = out.slice(0, idx) + "\n" + importLine + out.slice(idx);
    } else {
      out = importLine + "\n" + out;
    }
  }

  return { text: out, changed: true };
}

function main() {
  const allow = JSON.parse(fs.readFileSync(ALLOWLIST, "utf8"));
  const p4 = allow.exemptions.filter((e) => e.owning_phase === "P4");
  const report = {
    total: p4.length,
    migrated: [],
    skipped: [],
    residual: [],
    missing: [],
  };
  for (const entry of p4) {
    const file = entry.pattern;
    const abs = path.join(REPO, file);
    if (!fs.existsSync(abs)) {
      report.missing.push(file);
      continue;
    }
    const original = fs.readFileSync(abs, "utf8");
    const mod = pickModule(file);
    const isEdge = file.startsWith("supabase/functions/");
    const result = isEdge
      ? migrateEdge(original, mod, file)
      : migrateClient(original, mod);
    if (!result.changed) {
      report.skipped.push({ file, reason: "no recognised pattern" });
      continue;
    }
    fs.writeFileSync(abs, result.text);
    if (hasResidualMutation(result.text)) {
      report.residual.push({ file, module: mod });
    } else {
      report.migrated.push({ file, module: mod });
    }
  }
  const reportPath = path.join(REPO, ".local", "p4-migration-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    total: report.total,
    migrated_clean: report.migrated.length,
    migrated_with_residual: report.residual.length,
    skipped: report.skipped.length,
    missing: report.missing.length,
  }, null, 2));
}

main();
