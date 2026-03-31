import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SCAN_DIRS = [
  "src/components",
  "src/hooks",
  "src/lib",
  "src/stores",
  "src/providers",
  "src/domains",
  "src/repositories",
  "src/pages",
  "src/families",
];

const ALLOWED_WRITE_ZONES = [
  // Orbit domain internals
  "src/domains/orbit/flows/",
  "src/domains/orbit/pipelines/",
  "src/domains/orbit/repositories/",
  "src/domains/orbit/controllers/",
  "src/domains/orbit/flow-gate/",
  "src/domains/orbit/core/",
  "src/domains/orbit/stores/",
  "src/domains/orbit/services/",
  "src/domains/orbit/realtime/",
  "src/domains/orbit/bridges/",
  "src/domains/orbit/machines/",
  // Canonical repositories & families
  "src/repositories/",
  "src/families/orbit-dispatch/",
  "src/stores/",
  "src/lib/support/",
  "src/providers/",
  // Domain services & infrastructure (permitted orchestrators)
  "src/lib/engines/",
  "src/lib/orbit/",
  "src/lib/wallet/",
  "src/lib/tracking/",
  "src/lib/rental/",
  "src/lib/realtime",
  "src/lib/notifications/",
  // Domain module components (co-located orchestrators per governance)
  "src/components/pos/",
  "src/components/storefront/",
  "src/components/marketplace/",
  "src/components/public/",
  // Page-level orchestrators
  "src/pages/",
  // Domain hooks acting as service layers
  "src/hooks/useListingSync",
  "src/hooks/useServiceTracking",
];

const FILE_EXT = [".ts", ".tsx", ".js", ".jsx"];

// ── Focused patterns: only real DB / store writes ──
const WRITE_PATTERNS = [
  { label: "supabase_from", regex: /supabase\s*\.\s*from\s*\(/, orbitOnly: false },
  { label: "supabase_rpc", regex: /supabase\s*\.\s*rpc\s*\(/, orbitOnly: false },
  { label: "supabase_functions", regex: /supabase\s*\.functions\s*\.invoke\s*\(/, orbitOnly: false },
  { label: "mergeMessage", regex: /\bmergeMessage\s*\(/, orbitOnly: true },
  { label: "mergeAttachment", regex: /\bmergeAttachment\s*\(/, orbitOnly: true },
  { label: "updateMessageStatus", regex: /\bupdateMessageStatus\s*\(/, orbitOnly: true },
  { label: "reconcileMessage", regex: /\breconcileMessage\s*\(/, orbitOnly: true },
  { label: "insertMessage", regex: /\binsertMessage\s*\(/, orbitOnly: true },
];

const EVENT_PATTERNS = [
  { label: "postgres_changes", regex: /postgres_changes/ },
  { label: "channel_subscribe", regex: /\.channel\s*\([^)]*\)\s*\.\s*on\s*\(/ },
  { label: "realtime_on", regex: /realtime\.on\s*\(/ },
];

const ORBIT_ACTION_PATTERNS = [
  { label: "handleSend", regex: /\bhandleSend\b/ },
  { label: "handleUpload", regex: /\bhandleUpload\b/ },
  { label: "handleVoice", regex: /\bhandleVoice\b|startVoice|stopVoice/ },
  { label: "handleLocation", regex: /\bhandleLocation\b/ },
  { label: "handleCall", regex: /\bhandleCall\b/ },
  { label: "markRead_direct", regex: /\bmarkRead\b|markAsRead/ },
  { label: "createConversation_direct", regex: /\bcreateConversation\b|getOrCreateConversation/ },
];

// ID mixing: same line has 2+ different ID concepts
const ID_MIXING_PAIRS = [
  { a: /conversationId/, b: /threadId|chatId/, label: "conversationId vs threadId/chatId" },
  { a: /orbitId/, b: /userId/, label: "orbitId vs userId" },
  { a: /profileId/, b: /userId/, label: "profileId vs userId" },
];

const ENTRY_MAP = [
  { entry: "message.sendText", keywords: ["send_text", "handleSend", "sendMessage", "sendTextMessage"] },
  { entry: "media.send", keywords: ["sendMedia", "handleUpload", "sendMediaMessage", "uploadMedia"] },
  { entry: "voice.send", keywords: ["sendVoice", "handleVoice", "sendVoiceMessage"] },
  { entry: "location.send", keywords: ["sendLocation", "handleLocation", "sendLocationMessage"] },
  { entry: "receipt.markRead", keywords: ["markRead", "markAsRead"] },
  { entry: "conversation.open", keywords: ["openDirect", "createConversation", "getOrCreateConversation"] },
];

const PIPELINE_MAP = {
  "message.sendText": "pipeline.message.sendText.v1",
  "media.send": "pipeline.media.send.v1",
  "voice.send": "pipeline.voice.send.v1",
  "location.send": "pipeline.location.send.v1",
  "receipt.markRead": "pipeline.receipt.markRead.v1",
  "conversation.open": "pipeline.conversation.open.v1",
};

const OWNER_MAP = {
  "message.sendText": "orbitStore.messages",
  "media.send": "orbitStore.attachments",
  "voice.send": "orbitStore.attachments",
  "location.send": "orbitStore.messages",
  "receipt.markRead": "orbitStore.receipts",
  "conversation.open": "orbitStore.conversations",
};

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp, out);
    else if (FILE_EXT.includes(path.extname(fp))) out.push(fp);
  }
  return out;
}

function rel(fp) { return path.relative(ROOT, fp).replace(/\\/g, "/"); }
function inAllowedZone(r) { return ALLOWED_WRITE_ZONES.some(z => r.startsWith(z)); }
function isUIZone(r) { return r.startsWith("src/components/") || r.startsWith("src/pages/"); }
function isHookZone(r) { return r.startsWith("src/hooks/"); }
function isSkipLine(line) {
  const t = line.trim();
  return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("import ") || t.startsWith("export type") || t.startsWith("export interface") || t.startsWith("type ") || t.startsWith("interface ");
}

function guessEntry(line) {
  const lower = line.toLowerCase();
  for (const m of ENTRY_MAP) {
    if (m.keywords.some(k => lower.includes(k.toLowerCase()))) return m.entry;
  }
  return "UNMAPPED";
}

const files = SCAN_DIRS.flatMap(d => walk(path.join(ROOT, d)));
const audit = [];
const conflicts = [];

for (const fp of files) {
  const r = rel(fp);
  const content = fs.readFileSync(fp, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isSkipLine(line)) continue;

    // ── Write patterns ──
    for (const p of WRITE_PATTERNS) {
      if (!p.regex.test(line)) continue;
      // Skip if it's a read-only supabase query (select without insert/update/delete/upsert)
      if (p.label === "supabase_from" && /\.select\s*\(/.test(line) && !/\.(insert|update|upsert|delete)\s*\(/.test(line)) continue;

      const entry = guessEntry(line);
      const inZone = inAllowedZone(r);
      let severity = "LOW";
      if (!inZone && (isUIZone(r) || isHookZone(r))) severity = "HIGH";
      else if (!inZone) severity = "MEDIUM";

      audit.push({
        file: r, line: i + 1, type: "write", pattern: p.label, severity, entry,
        pipeline: PIPELINE_MAP[entry] || "UNMAPPED",
        owner: OWNER_MAP[entry] || "UNMAPPED",
        message: `${p.label} in ${isUIZone(r) ? "UI" : isHookZone(r) ? "hook" : "module"}`,
        fix: severity === "HIGH" ? "Redirect through orbitDispatch / pipeline." : "Review placement.",
        code: line.trim().slice(0, 140),
      });
    }

    // ── Event patterns ──
    for (const p of EVENT_PATTERNS) {
      if (!p.regex.test(line)) continue;
      audit.push({
        file: r, line: i + 1, type: "event", pattern: p.label, severity: "LOW",
        entry: "UNMAPPED", pipeline: "UNMAPPED", owner: "UNMAPPED",
        message: `${p.label} listener`,
        fix: "Verify single listener per concern.",
        code: line.trim().slice(0, 140),
      });
    }

    // ── Orbit action patterns in UI ──
    if (isUIZone(r) || isHookZone(r)) {
      for (const p of ORBIT_ACTION_PATTERNS) {
        if (!p.regex.test(line)) continue;
        const entry = guessEntry(line);
        audit.push({
          file: r, line: i + 1, type: "action", pattern: p.label, severity: "LOW",
          entry, pipeline: PIPELINE_MAP[entry] || "UNMAPPED", owner: OWNER_MAP[entry] || "UNMAPPED",
          message: `Action handler "${p.label}" in ${isUIZone(r) ? "UI" : "hook"}`,
          fix: "Ensure it delegates to orbitDispatch, not direct write.",
          code: line.trim().slice(0, 140),
        });
      }
    }

    // ── ID mixing (same line) ──
    for (const pair of ID_MIXING_PAIRS) {
      if (pair.a.test(line) && pair.b.test(line)) {
        audit.push({
          file: r, line: i + 1, type: "id", pattern: "id_mixing", severity: "MEDIUM",
          entry: "UNMAPPED", pipeline: "UNMAPPED", owner: "UNMAPPED",
          message: `Potential ID mixing: ${pair.label}`,
          fix: "Normalize to single canonical ID type per context.",
          code: line.trim().slice(0, 140),
        });
      }
    }
  }
}

// ═══ Conflict detection ═══

// 1. Direct writes outside allowed zones
for (const item of audit.filter(x => x.type === "write" && x.severity === "HIGH")) {
  conflicts.push({
    type: "DIRECT_WRITE_OUTSIDE_PIPELINE", severity: "HIGH",
    file: item.file, line: item.line, pattern: item.pattern,
    entry: item.entry,
    message: `Direct write (${item.pattern}) in ${item.file}:${item.line}`,
    fix: "Move behind orbitDispatch / pipeline / repository.",
  });
}

// 2. Realtime + direct write in same file outside owner
for (const fp of files) {
  const r = rel(fp);
  if (inAllowedZone(r)) continue;
  const content = fs.readFileSync(fp, "utf8");
  const hasRealtime = /postgres_changes|realtime\.on|\.channel\s*\(/.test(content);
  const hasWrite = /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|mergeMessage|mergeAttachment|insertMessage/.test(content);
  if (hasRealtime && hasWrite) {
    conflicts.push({
      type: "REALTIME_DIRECT_WRITE", severity: "HIGH",
      file: r,
      message: "Realtime listener + direct write in same file outside owner zone",
      fix: "Route through handleRealtime / owner merge pipeline.",
    });
  }
}

// 3. Duplicate supabase_from writes for same table from different files
const supabaseFromFiles = new Map();
for (const fp of files) {
  const r = rel(fp);
  const content = fs.readFileSync(fp, "utf8");
  const matches = content.matchAll(/supabase\s*\.\s*from\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
  for (const m of matches) {
    const table = m[1];
    // Check if there's a write operation nearby
    const idx = m.index;
    const surrounding = content.slice(idx, idx + 200);
    if (/\.(insert|update|upsert|delete)\s*\(/.test(surrounding)) {
      if (!supabaseFromFiles.has(table)) supabaseFromFiles.set(table, new Set());
      supabaseFromFiles.get(table).add(r);
    }
  }
}
for (const [table, filesSet] of supabaseFromFiles.entries()) {
  const arr = [...filesSet];
  const outsiders = arr.filter(f => !inAllowedZone(f));
  if (outsiders.length > 0) {
    conflicts.push({
      type: "DUPLICATE_TABLE_WRITER", severity: "MEDIUM",
      table, files: arr,
      message: `Table "${table}" written from ${arr.length} files: ${arr.join(", ")}`,
      fix: "Consolidate writes to single repository.",
    });
  }
}

// 4. ID mixing conflicts
for (const item of audit.filter(x => x.type === "id")) {
  conflicts.push({
    type: "ID_MIXING", severity: "MEDIUM",
    file: item.file, line: item.line,
    message: item.message,
    fix: item.fix,
  });
}

// ═══ Output ═══
const outDir = path.join(ROOT, "src/domains/orbit/audit");
fs.mkdirSync(outDir, { recursive: true });

const highConflicts = conflicts.filter(c => c.severity === "HIGH");
const medConflicts = conflicts.filter(c => c.severity === "MEDIUM");

fs.writeFileSync(
  path.join(outDir, "orbit-auto-scan-report.json"),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    auditCount: audit.length,
    conflictCount: conflicts.length,
    highCount: highConflicts.length,
    mediumCount: medConflicts.length,
    audit,
    conflicts,
  }, null, 2)
);

const summary = [
  "# Orbit Auto Scan Summary",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Totals",
  "",
  `| Metric | Count |`,
  `|--------|-------|`,
  `| Total findings | ${audit.length} |`,
  `| Writes | ${audit.filter(a => a.type === "write").length} |`,
  `| HIGH writes | ${audit.filter(a => a.type === "write" && a.severity === "HIGH").length} |`,
  `| Events | ${audit.filter(a => a.type === "event").length} |`,
  `| Actions | ${audit.filter(a => a.type === "action").length} |`,
  `| ID findings | ${audit.filter(a => a.type === "id").length} |`,
  `| **Total conflicts** | **${conflicts.length}** |`,
  `| **HIGH conflicts** | **${highConflicts.length}** |`,
  `| MEDIUM conflicts | ${medConflicts.length} |`,
  "",
  "## ❌ High Severity Conflicts",
  "",
  ...(highConflicts.length === 0
    ? ["✅ No high severity conflicts detected."]
    : highConflicts.slice(0, 100).map(
        c => `- **${c.type}** — \`${c.file || "?"}\`${c.line ? `:${c.line}` : ""} — ${c.message}`
      )),
  "",
  "## ⚠️ Realtime Conflicts",
  "",
  ...(function() {
    const rt = conflicts.filter(c => c.type === "REALTIME_DIRECT_WRITE");
    return rt.length === 0
      ? ["✅ None"]
      : rt.map(c => `- \`${c.file}\` — ${c.message}`);
  })(),
  "",
  "## 🔀 ID Mixing",
  "",
  ...(function() {
    const ids = conflicts.filter(c => c.type === "ID_MIXING");
    return ids.length === 0
      ? ["✅ None"]
      : ids.slice(0, 30).map(c => `- \`${c.file}\`:${c.line} — ${c.message}`);
  })(),
  "",
  "## 📋 Duplicate Table Writers",
  "",
  ...(function() {
    const dt = conflicts.filter(c => c.type === "DUPLICATE_TABLE_WRITER");
    return dt.length === 0
      ? ["✅ None"]
      : dt.map(c => `- **${c.table}** → ${c.files.join(", ")}`);
  })(),
  "",
  "## 🔧 Fix Priority Order",
  "",
  "### P1 — Immediate",
  "1. Direct writes in UI/hooks → redirect to orbitDispatch",
  "2. Realtime direct merge → route through owner",
  "",
  "### P2 — Soon",
  "3. Duplicate table writers → consolidate to single repository",
  "4. ID mixing → normalize identifiers",
  "",
  "### P3 — Later",
  "5. Legacy wrappers → deprecate",
  "",
].join("\n");

fs.writeFileSync(path.join(outDir, "orbit-auto-scan-summary.md"), summary);

console.log("========================================");
console.log("  ORBIT AUTO SCANNER — ZERO CONFLICT");
console.log("========================================");
console.log(`  Findings:        ${audit.length}`);
console.log(`  Conflicts:       ${conflicts.length}`);
console.log(`  HIGH severity:   ${highConflicts.length}`);
console.log(`  MEDIUM severity: ${medConflicts.length}`);
console.log("========================================");
console.log(`  Report:  src/domains/orbit/audit/orbit-auto-scan-report.json`);
console.log(`  Summary: src/domains/orbit/audit/orbit-auto-scan-summary.md`);
console.log("========================================");

if (highConflicts.length > 0) {
  console.log(`\n❌ FAIL: ${highConflicts.length} HIGH conflicts detected.\n`);
  // Print first 10
  for (const c of highConflicts.slice(0, 10)) {
    console.log(`  → ${c.type} | ${c.file}${c.line ? ':' + c.line : ''} | ${c.message}`);
  }
  if (highConflicts.length > 10) console.log(`  ... and ${highConflicts.length - 10} more`);
  process.exit(1);
} else {
  console.log(`\n✅ PASS: 0 HIGH conflicts.\n`);
  process.exit(0);
}
