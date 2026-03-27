import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const blockedPatterns = [
  '.from("messages")',
  ".from('messages')",
  '.from("conversation_threads")',
  ".from('conversation_threads')",
  'from("message_reactions")',
  "from('message_reactions')",
];

// Files in isolated legacy domains are allowed to use legacy tables
const isolatedPrefixes = [
  "src/pages/tenant/",
  "src/pages/client/",
  "src/components/delivery/",
  "src/components/public/",
  "src/components/marketplace/",
  "src/components/explore/",
  "src/components/onboarding/",
  "src/components/communication/",
  "src/components/communication-hub/",
  "src/components/chat/",
];

function walk(dir, out = []) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (["node_modules", "dist", ".git"].includes(item)) continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(item)) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(path.join(ROOT, "src"));
const offenders = [];

for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (isolatedPrefixes.some((p) => rel.startsWith(p))) continue;

  const content = fs.readFileSync(file, "utf8");
  const matched = blockedPatterns.filter((p) => content.includes(p));
  if (matched.length > 0) {
    offenders.push({ file: rel, matched });
  }
}

if (offenders.length > 0) {
  console.error("\n[V2 ONLY AUDIT] Legacy DB access still present in core:\n");
  for (const offender of offenders) {
    console.error(`- ${offender.file}`);
    for (const m of offender.matched) {
      console.error(`  -> ${m}`);
    }
  }
  console.log(`\nTotal: ${offenders.length} file(s) with legacy access in core.`);
  process.exit(1);
}

console.log("[V2 ONLY AUDIT] PASS — no blocked legacy table access found in core.");
