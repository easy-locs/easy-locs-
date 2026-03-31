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
  "src/domains/orbit/flows/",
  "src/domains/orbit/pipelines/",
  "src/domains/orbit/repositories/",
  "src/domains/orbit/controllers/",
  "src/domains/orbit/flow-gate/",
  "src/domains/orbit/core/",
  "src/domains/orbit/stores/",
  "src/repositories/",
  "src/families/orbit-dispatch/",
  "src/lib/support/",
  "src/stores/",
];

const FILE_EXT = [".ts", ".tsx", ".js", ".jsx"];

const PATTERNS = [
  { type: "write", label: "insert", regex: /\.insert\s*\(/ },
  { type: "write", label: "update", regex: /\.update\s*\(/ },
  { type: "write", label: "upsert", regex: /\.upsert\s*\(/ },
  { type: "write", label: "delete", regex: /\.delete\s*\(/ },
  { type: "write", label: "supabase_from", regex: /supabase\s*\.\s*from\s*\(/ },
  { type: "write", label: "db_from", regex: /\bdb\s*\.\s*from\s*\(/ },
  { type: "write", label: "setState", regex: /\bset[A-Z][A-Za-z0-9_]*\s*\(/ },
  { type: "event", label: "useEffect", regex: /\buseEffect\s*\(/ },
  { type: "event", label: "postgres_changes", regex: /postgres_changes/ },
  { type: "event", label: "realtime_on", regex: /realtime\.on\s*\(/ },
  { type: "event", label: "channel_on", regex: /\.channel\s*\(/ },
  { type: "action", label: "onClick", regex: /\bonClick\s*=/ },
  { type: "action", label: "onSubmit", regex: /\bonSubmit\s*=/ },
  { type: "action", label: "handleSend", regex: /handleSend/ },
  { type: "action", label: "handleUpload", regex: /handleUpload/ },
  { type: "action", label: "handleVoice", regex: /handleVoice|startVoice|stopVoice/ },
  { type: "i18n", label: "hardcoded_string", regex: />([^<{]{8,})</ },
  { type: "seo", label: "canonical", regex: /\bcanonical\b/i },
  { type: "seo", label: "meta_title", regex: /document\.title\s*=|<title[> ]/ },
  { type: "card", label: "card_builder", regex: /buildCard|CardShell/ },
  { type: "id", label: "id_mixing", regex: /(conversationId|threadId|chatId).*(conversationId|threadId|chatId)|(orbitId|userId|profileId).*(orbitId|userId|profileId)/  },
];

const ENTRY_MAP = [
  { entry: "message.sendText", keywords: ["send_text", "handleSend", "sendMessage"] },
  { entry: "media.send", keywords: ["sendMedia", "handleUpload", "sendMediaMessage"] },
  { entry: "voice.send", keywords: ["sendVoice", "handleVoice", "sendVoiceMessage"] },
  { entry: "location.send", keywords: ["sendLocation", "handleLocation"] },
  { entry: "receipt.markRead", keywords: ["markRead", "markAsRead", "read_at"] },
  { entry: "conversation.openDirect", keywords: ["openDirect", "createConversation", "getOrCreateConversation"] },
  { entry: "conversation.createGroup", keywords: ["createGroup", "groupConversation"] },
  { entry: "call.startAudio", keywords: ["startAudioCall", "audioCall"] },
  { entry: "call.startVideo", keywords: ["startVideoCall", "videoCall"] },
];

const PIPELINE_MAP = {
  "message.sendText": "pipeline.message.sendText.v1",
  "media.send": "pipeline.media.send.v1",
  "voice.send": "pipeline.voice.send.v1",
  "location.send": "pipeline.location.send.v1",
  "receipt.markRead": "pipeline.receipt.markRead.v1",
  "conversation.openDirect": "pipeline.conversation.openDirect.v1",
  "conversation.createGroup": "pipeline.conversation.createGroup.v1",
  "call.startAudio": "pipeline.call.startAudio.v1",
  "call.startVideo": "pipeline.call.startVideo.v1",
};

const OWNER_MAP = {
  "message.sendText": "orbitStore.messages",
  "media.send": "orbitStore.attachments",
  "voice.send": "orbitStore.attachments",
  "location.send": "orbitStore.messages",
  "receipt.markRead": "orbitStore.receipts",
  "conversation.openDirect": "orbitStore.conversations",
  "conversation.createGroup": "orbitStore.conversations",
  "call.startAudio": "callStore.sessions",
  "call.startVideo": "callStore.sessions",
};

// Zones where writes are expected (not flagged HIGH)
const ALLOWED_STORE_ZONES = [
  "src/stores/",
  "src/domains/orbit/stores/",
  "src/domains/",
];

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

function rel(fp) {
  return path.relative(ROOT, fp).replace(/\\/g, "/");
}

function inAllowedZone(r) {
  return ALLOWED_WRITE_ZONES.some(z => r.startsWith(z));
}

function isUIZone(r) {
  return r.startsWith("src/components/") || r.startsWith("src/pages/");
}

function isHookZone(r) {
  return r.startsWith("src/hooks/");
}

// Skip common false positives
function isFalsePositive(r, pattern, line) {
  // setState in store definitions is fine
  if (pattern === "setState" && (r.includes("/stores/") || r.includes("/store"))) return true;
  // Type definitions and interfaces
  if (/^\s*(type|interface|export\s+type|export\s+interface)/.test(line)) return true;
  // Import statements
  if (/^\s*import\s/.test(line)) return true;
  // Comments
  if (/^\s*(\/\/|\/\*|\*)/.test(line)) return true;
  // .delete on arrays/maps/sets (not DB)
  if (pattern === "delete" && !(/supabase|from\(/.test(line))) return true;
  // .update/.insert on non-DB objects
  if ((pattern === "update" || pattern === "insert") && !(/supabase|from\(|\.rpc/.test(line))) return true;
  return false;
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
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
    if (trimmed.startsWith("import ")) continue;

    for (const p of PATTERNS) {
      if (!p.regex.test(line)) continue;
      if (isFalsePositive(r, p.label, trimmed)) continue;

      const lower = trimmed.toLowerCase();
      let entry = "UNMAPPED";
      for (const m of ENTRY_MAP) {
        if (m.keywords.some(k => lower.includes(k.toLowerCase()))) {
          entry = m.entry;
          break;
        }
      }

      let severity = "LOW";
      if (p.type === "write") {
        if (isUIZone(r) || isHookZone(r)) severity = "HIGH";
        else if (!inAllowedZone(r)) severity = "MEDIUM";
      }
      if (p.type === "id" && p.label === "id_mixing") severity = "HIGH";

      audit.push({
        file: r,
        line: i + 1,
        type: p.type,
        pattern: p.label,
        severity,
        entry,
        pipeline: PIPELINE_MAP[entry] || "UNMAPPED",
        owner: OWNER_MAP[entry] || "UNMAPPED",
        message: `${p.label} detected in ${isUIZone(r) ? "UI" : isHookZone(r) ? "hook" : "module"} zone`,
        fix: severity === "HIGH"
          ? `Redirect through orbitDispatch / pipeline / repository.`
          : severity === "MEDIUM"
          ? `Consider moving to allowed write zone.`
          : `Review for potential conflict.`,
        code: trimmed.slice(0, 140),
      });
    }
  }
}

// ── Conflict detection ──

// 1. Duplicate entries
const byEntry = new Map();
for (const item of audit.filter(x => x.entry !== "UNMAPPED" && x.type === "write")) {
  if (!byEntry.has(item.entry)) byEntry.set(item.entry, new Set());
  byEntry.get(item.entry).add(item.file);
}
for (const [entry, set] of byEntry.entries()) {
  const filesArr = [...set];
  const outsideZone = filesArr.filter(f => !inAllowedZone(f));
  if (outsideZone.length > 0) {
    conflicts.push({
      type: "DUPLICATE_ENTRY",
      severity: "HIGH",
      entry,
      files: filesArr,
      message: `Multiple files write for entry "${entry}": ${filesArr.join(", ")}`,
      fix: `Route all ${entry} calls through the single official dispatch path.`,
    });
  }
}

// 2. Direct writes outside allowed zones (HIGH only)
for (const item of audit.filter(x => x.type === "write" && x.severity === "HIGH")) {
  conflicts.push({
    type: "DIRECT_WRITE_OUTSIDE_PIPELINE",
    severity: "HIGH",
    file: item.file,
    line: item.line,
    entry: item.entry,
    pattern: item.pattern,
    message: `Direct write (${item.pattern}) in ${item.file}:${item.line}`,
    fix: `Move this write behind orbitDispatch / pipeline / repository.`,
  });
}

// 3. Realtime direct write heuristic
for (const fp of files) {
  const r = rel(fp);
  const content = fs.readFileSync(fp, "utf8");
  if (/postgres_changes|realtime\.on|\.channel\(/.test(content) &&
      /\.insert\(|\.update\(|mergeMessage\(|mergeAttachment\(|setState/.test(content) &&
      !inAllowedZone(r)) {
    conflicts.push({
      type: "REALTIME_DIRECT_WRITE",
      severity: "HIGH",
      file: r,
      message: "Realtime listener + direct write detected outside owner flow",
      fix: "Route listener through handleRealtime / owner merge pipeline.",
    });
  }
}

// 4. ID mixing conflicts
for (const item of audit.filter(x => x.type === "id" && x.severity === "HIGH")) {
  conflicts.push({
    type: "ID_MIXING",
    severity: "HIGH",
    file: item.file,
    line: item.line,
    message: `ID mixing detected: ${item.code.slice(0, 80)}`,
    fix: "Normalize to single canonical ID type per context.",
  });
}

// ── Output ──
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
  `- Total findings: ${audit.length}`,
  `- Writes: ${audit.filter(a => a.type === "write").length}`,
  `- High risk writes: ${audit.filter(a => a.type === "write" && a.severity === "HIGH").length}`,
  `- Events: ${audit.filter(a => a.type === "event").length}`,
  `- Actions: ${audit.filter(a => a.type === "action").length}`,
  `- I18N findings: ${audit.filter(a => a.type === "i18n").length}`,
  `- SEO findings: ${audit.filter(a => a.type === "seo").length}`,
  `- Card findings: ${audit.filter(a => a.type === "card").length}`,
  `- ID findings: ${audit.filter(a => a.type === "id").length}`,
  `- Total conflicts: ${conflicts.length}`,
  `- HIGH conflicts: ${highConflicts.length}`,
  `- MEDIUM conflicts: ${medConflicts.length}`,
  "",
  "## High Severity Conflicts",
  "",
  ...(highConflicts.length === 0
    ? ["✅ No high severity conflicts detected."]
    : highConflicts.slice(0, 80).map(
        c => `- **${c.type}** — \`${c.file || c.entry || "?"}\`${c.line ? `:${c.line}` : ""} — ${c.message}`
      )),
  "",
  "## Duplicate Entries",
  "",
  ...(function() {
    const dupes = conflicts.filter(c => c.type === "DUPLICATE_ENTRY");
    return dupes.length === 0
      ? ["✅ None"]
      : dupes.map(c => `- **${c.entry}** → ${c.files.join(", ")}`);
  })(),
  "",
  "## Realtime Conflicts",
  "",
  ...(function() {
    const rt = conflicts.filter(c => c.type === "REALTIME_DIRECT_WRITE");
    return rt.length === 0
      ? ["✅ None"]
      : rt.map(c => `- \`${c.file}\` — ${c.message}`);
  })(),
  "",
  "## ID Mixing Conflicts",
  "",
  ...(function() {
    const ids = conflicts.filter(c => c.type === "ID_MIXING");
    return ids.length === 0
      ? ["✅ None"]
      : ids.slice(0, 30).map(c => `- \`${c.file}\`:${c.line} — ${c.message}`);
  })(),
  "",
  "## Fix Priority Order",
  "",
  "### P1 — Immediate",
  "1. Direct writes in UI/hooks → redirect to orbitDispatch",
  "2. Duplicate entry points → consolidate to single pipeline",
  "3. Realtime direct merge → route through owner",
  "4. ID mixing → normalize identifiers",
  "",
  "### P2 — Soon",
  "5. Duplicate pipeline logic → merge",
  "6. Duplicate card builders → centralize",
  "7. SEO/i18n duplication → single owner",
  "",
  "### P3 — Later",
  "8. Legacy wrappers → deprecate",
  "9. Dead passive layers → remove",
  "",
].join("\n");

fs.writeFileSync(
  path.join(outDir, "orbit-auto-scan-summary.md"),
  summary
);

console.log("========================================");
console.log("  ORBIT AUTO SCANNER — ZERO CONFLICT");
console.log("========================================");
console.log(`  Findings:       ${audit.length}`);
console.log(`  Conflicts:      ${conflicts.length}`);
console.log(`  HIGH severity:  ${highConflicts.length}`);
console.log(`  MEDIUM severity:${medConflicts.length}`);
console.log("========================================");
console.log(`  Report:  src/domains/orbit/audit/orbit-auto-scan-report.json`);
console.log(`  Summary: src/domains/orbit/audit/orbit-auto-scan-summary.md`);
console.log("========================================");

if (highConflicts.length > 0) {
  console.log(`\n❌ FAIL: ${highConflicts.length} HIGH conflicts detected.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ PASS: 0 HIGH conflicts.\n`);
  process.exit(0);
}
