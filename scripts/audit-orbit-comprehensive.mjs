#!/usr/bin/env node
/**
 * COMPREHENSIVE ORBIT AUDIT SCANNER
 * Detects: duplicate paths, cross-conversation leaks, inline writes,
 * fake retries, receipt double paths, global attachment reads,
 * status overwrites, and more.
 *
 * Run: node scripts/audit-orbit-comprehensive.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const findings = [];

// ── Severity levels ──
const HIGH = "HIGH";
const MEDIUM = "MEDIUM";
const LOW = "LOW";

function addFinding(severity, code, file, line, detail) {
  findings.push({ severity, code, file, line, detail });
}

function walk(dir, out = []) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (["node_modules", "dist", ".git", "supabase", ".lovable"].includes(item)) continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(item) && !item.endsWith(".d.ts") && !item.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(path.join(ROOT, "src"));

// ── Allowed zones for DB writes ──
const WRITE_ZONES = [
  "src/repositories/", "src/lib/db/", "src/integrations/", "src/services/",
  "src/domains/orbit/flow-gate/", "src/domains/orbit/services/",
  "src/domains/orbit/pipelines/", "src/domains/orbit/controllers/",
  "src/domains/orbit/realtime/", "src/families/orbit-dispatch/pipeline/",
  "src/stores/", "src/domains/orbit/stores/",
];

const ORBIT_TABLES = ["conversations_v2", "chat_messages_v2", "ghost_call_sessions", "chat_attachments"];
const WRITE_OPS = /\.\s*(insert|update|upsert|delete)\s*\(/;
const FROM_PATTERN = /from\s*\(\s*["']([\w]+)["']\s*\)/;

for (const file of files) {
  const rel = path.relative(ROOT, file);
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");
  const isUI = rel.startsWith("src/components/") || rel.startsWith("src/pages/");
  const isHook = rel.startsWith("src/hooks/");
  const isOrbitUI = isUI && (rel.includes("orbit") || rel.includes("chat") || rel.includes("communication") || rel.includes("call"));
  const isAllowedZone = WRITE_ZONES.some(z => rel.startsWith(z));

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;

    // ── 1. DIRECT_WRITE_OUTSIDE_PIPELINE (orbit tables only) ──
    if (!isAllowedZone) {
      for (const table of ORBIT_TABLES) {
        const rx = new RegExp(`from\\s*\\(\\s*["']${table}["']\\s*\\)\\s*\\.\\s*(insert|update|upsert|delete)\\s*\\(`);
        if (rx.test(line)) {
          addFinding(HIGH, "DIRECT_WRITE_OUTSIDE_PIPELINE", rel, i + 1, `${table} write outside pipeline`);
        }
      }
    }

    // ── 2. GLOBAL_ATTACHMENT_RENDER ──
    if (isUI || isHook) {
      if (/Object\.values\s*\(\s*(?:.*\.)?attachments\s*\)/.test(line)) {
        addFinding(HIGH, "GLOBAL_ATTACHMENT_RENDER", rel, i + 1, "Global attachment map iteration");
      }
    }

    // ── 3. GLOBAL_MESSAGE_RENDER ──
    if (isUI) {
      if (/Object\.values\s*\(\s*(?:.*\.)?messages\s*\)/.test(line) && !rel.includes("selector")) {
        addFinding(HIGH, "GLOBAL_MESSAGE_RENDER", rel, i + 1, "Global message map iteration in UI");
      }
    }

    // ── 4. INLINE_STATUS_WRITE ──
    if (isUI || isHook) {
      if (/\.status\s*=\s*["'](delivered|read|sent|failed)["']/.test(line)) {
        addFinding(HIGH, "INLINE_STATUS_WRITE", rel, i + 1, "Direct status mutation outside machine");
      }
    }

    // ── 5. RECEIPT_DIRECT_STATUS_WRITE ──
    if (isOrbitUI) {
      if (/delivered_at|read_at/.test(line) && WRITE_OPS.test(line)) {
        addFinding(HIGH, "RECEIPT_DIRECT_STATUS_WRITE", rel, i + 1, "Receipt status written inline in UI");
      }
    }

    // ── 6. CROSS_CONVERSATION_SELECTOR — attachment without conversationId check ──
    if (isUI && /selectAttachment\s*\(/.test(line) && !/conversationId/.test(lines.slice(Math.max(0, i - 3), i + 3).join(" "))) {
      // Soft check — only flag in orbit components
      if (isOrbitUI) {
        addFinding(MEDIUM, "CROSS_CONVERSATION_SELECTOR", rel, i + 1, "Attachment selector without visible conversationId scope");
      }
    }

    // ── 7. PREVIEW_GLOBAL_STATE ──
    if (isUI && /useState.*preview/.test(line) && /URL\.createObjectURL/.test(content)) {
      addFinding(LOW, "PREVIEW_GLOBAL_STATE", rel, i + 1, "Component-local preview state (check if scoped)");
    }

    // ── 8. MULTIPLE_OVERLAY_OWNERS ──
    if (isUI && /setShowCallOverlay|setCallOverlay|showCallScreen/.test(line)) {
      addFinding(MEDIUM, "MULTIPLE_OVERLAY_OWNERS", rel, i + 1, "Call overlay state set in component");
    }

    // ── 9. QR_DIRECT_NAVIGATION ──  
    if (rel.includes("qr") && /navigate\s*\(/.test(line) && !rel.includes("executor") && !rel.includes("dispatch")) {
      addFinding(MEDIUM, "QR_DIRECT_NAVIGATION", rel, i + 1, "QR component navigates directly");
    }

    // ── 10. BUBBLE_FAMILY_UNSTABLE ──
    if (isUI && /message_type|messageType/.test(line) && /===?\s*["']/.test(line) && rel.includes("Bubble")) {
      // Message type check inside bubble — should be in router
      if (!rel.includes("Router") && !rel.includes("router")) {
        addFinding(LOW, "BUBBLE_FAMILY_UNSTABLE", rel, i + 1, "Type check in bubble instead of router");
      }
    }
  }

  // ── 11. RECEIPT_DOUBLE_PATH — file-level check ──
  if (rel.includes("realtime") && content.includes("handleRealtimeReceipt") && content.includes("mergeMessage")) {
    // Check if there's proper gating
    if (!content.includes("isReceiptOnlyUpdate")) {
      addFinding(HIGH, "RECEIPT_DOUBLE_PATH", rel, 0, "handleRealtimeReceipt + mergeMessage without isReceiptOnlyUpdate guard");
    }
  }

  // ── 12. RETRY_FAKE_RESEND ──
  if (rel.includes("retry") || rel.includes("Retry")) {
    if (content.includes("updateMessageFields") && !content.includes("transport") && !content.includes("upload") && !content.includes("from(")) {
      if (!rel.includes(".test.")) {
        addFinding(MEDIUM, "RETRY_FAKE_RESEND", rel, 0, "Retry helper updates fields without transport call");
      }
    }
  }

  // ── 13. DUPLICATE_ENTRY check ──
  if (isUI && /supabase\s*\.\s*from\s*\(\s*["']chat_messages_v2["']/.test(content)) {
    addFinding(HIGH, "DUPLICATE_ENTRY", rel, 0, "UI component accesses chat_messages_v2 directly");
  }
}

// ── Summary ──
const high = findings.filter(f => f.severity === HIGH);
const medium = findings.filter(f => f.severity === MEDIUM);
const low = findings.filter(f => f.severity === LOW);

console.log(`\n╔══════════════════════════════════════════════╗`);
console.log(`║  COMPREHENSIVE ORBIT AUDIT RESULTS           ║`);
console.log(`╠══════════════════════════════════════════════╣`);
console.log(`║  HIGH:   ${String(high.length).padStart(3)}                                  ║`);
console.log(`║  MEDIUM: ${String(medium.length).padStart(3)}                                  ║`);
console.log(`║  LOW:    ${String(low.length).padStart(3)}                                  ║`);
console.log(`║  TOTAL:  ${String(findings.length).padStart(3)}                                  ║`);
console.log(`╚══════════════════════════════════════════════╝\n`);

if (high.length > 0) {
  console.log("── HIGH FINDINGS ──");
  for (const f of high) {
    console.log(`  ❌ [${f.code}] ${f.file}:${f.line}`);
    console.log(`     ${f.detail}`);
  }
}

if (medium.length > 0) {
  console.log("\n── MEDIUM FINDINGS ──");
  for (const f of medium) {
    console.log(`  ⚠️  [${f.code}] ${f.file}:${f.line}`);
    console.log(`     ${f.detail}`);
  }
}

if (low.length > 0) {
  console.log("\n── LOW FINDINGS ──");
  for (const f of low) {
    console.log(`  ℹ️  [${f.code}] ${f.file}:${f.line}`);
    console.log(`     ${f.detail}`);
  }
}

console.log(`\nScanned ${files.length} files.`);
process.exit(high.length > 0 ? 1 : 0);
