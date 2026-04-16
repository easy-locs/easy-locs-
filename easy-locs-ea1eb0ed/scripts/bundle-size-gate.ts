import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const DIST_DIR = path.resolve("dist/assets");
const BASELINE_FILE = path.resolve("bundle-size-baseline.json");
const REGRESSION_THRESHOLD = Number.parseFloat(
  process.env.BUNDLE_SIZE_THRESHOLD ?? "0.10",
);
const BASELINE_REF = process.env.BUNDLE_SIZE_BASELINE_REF ?? "origin/main";

const PILLAR_PATTERNS = [
  "pillar-dashboard",
  "pillar-radar",
  "pillar-orbit",
  "pillar-wallet",
  "pillar-me",
] as const;

interface BundleSnapshot {
  generatedAt: string;
  totalBytes: number;
  mainChunkBytes: number;
  pillarChunks: Record<string, number>;
  allChunks: Record<string, number>;
}

function stripHash(file: string): string {
  return file.replace(/-[A-Za-z0-9_-]{6,}\.js$/, ".js");
}

function snapshotDist(): BundleSnapshot {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(
      `[bundle-size-gate] ${DIST_DIR} not found. Run "npm run build" first.`,
    );
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_DIR).filter((f) => f.endsWith(".js"));
  const allChunks: Record<string, number> = {};
  const pillarChunks: Record<string, number> = {};
  let totalBytes = 0;
  let mainChunkBytes = 0;

  for (const file of files) {
    const size = fs.statSync(path.join(DIST_DIR, file)).size;
    const stable = stripHash(file);
    allChunks[stable] = (allChunks[stable] ?? 0) + size;
    totalBytes += size;

    if (/^index(-|\.)/.test(file)) {
      mainChunkBytes += size;
    }
    for (const p of PILLAR_PATTERNS) {
      if (file.includes(p)) {
        pillarChunks[p] = (pillarChunks[p] ?? 0) + size;
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totalBytes,
    mainChunkBytes,
    pillarChunks,
    allChunks,
  };
}

function loadBaseline(): { source: string; data: BundleSnapshot } | null {
  try {
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    const rel = path.relative(gitRoot, BASELINE_FILE).split(path.sep).join("/");
    const json = execSync(`git show ${BASELINE_REF}:${rel}`, {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
    return { source: `${BASELINE_REF}:${rel}`, data: JSON.parse(json) };
  } catch {
    /* fall through */
  }
  if (fs.existsSync(BASELINE_FILE)) {
    return {
      source: "local file",
      data: JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8")),
    };
  }
  return null;
}

const fmtKB = (b: number) => `${(b / 1024).toFixed(1)} KB`;
const pct = (cur: number, base: number) =>
  base === 0 ? 0 : ((cur - base) / base) * 100;

function appendSummary(lines: string[]): void {
  const file = process.env.GITHUB_STEP_SUMMARY;
  if (!file) return;
  fs.appendFileSync(file, `${lines.join("\n")}\n`);
}

const mode = process.argv[2] ?? "check";
const current = snapshotDist();

if (mode === "update") {
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`[bundle-size-gate] Baseline written to ${BASELINE_FILE}`);
  console.log(
    `  Total: ${fmtKB(current.totalBytes)} | main: ${fmtKB(current.mainChunkBytes)}`,
  );
  process.exit(0);
}

console.log("== Bundle Size Gate ==");
console.log(
  `Threshold: +${(REGRESSION_THRESHOLD * 100).toFixed(1)}% on total JS vs baseline (${BASELINE_REF})`,
);
console.log(`Current total JS: ${fmtKB(current.totalBytes)}`);
console.log(`Current main chunk: ${fmtKB(current.mainChunkBytes)}`);
for (const p of PILLAR_PATTERNS) {
  const cur = current.pillarChunks[p];
  if (cur) console.log(`  ${p}: ${fmtKB(cur)}`);
}

const baseline = loadBaseline();

const summary: string[] = [
  "## Bundle Size Gate",
  "",
  `**Threshold:** +${(REGRESSION_THRESHOLD * 100).toFixed(1)}% on total JS`,
  "",
  "| Metric | Current | Baseline | Δ |",
  "| --- | ---: | ---: | ---: |",
];

if (!baseline || baseline.data.totalBytes === 0) {
  const reason = baseline
    ? `placeholder baseline at ${baseline.source} (totalBytes=0)`
    : "no baseline available";
  console.warn(`\n[bundle-size-gate] ${reason}. Skipping comparison.`);
  console.warn(
    "  The next push to main will seed the baseline automatically via the bundle-size-gate workflow.",
  );
  summary.push(
    `| Total JS | ${fmtKB(current.totalBytes)} | _not yet seeded_ | – |`,
  );
  appendSummary(summary);
  process.exit(0);
}

const base = baseline.data;
console.log(`\nBaseline source: ${baseline.source} (${base.generatedAt})`);
console.log(`Baseline total JS: ${fmtKB(base.totalBytes)}`);
console.log(`Baseline main chunk: ${fmtKB(base.mainChunkBytes)}`);

const totalDelta = pct(current.totalBytes, base.totalBytes);
const mainDelta = pct(current.mainChunkBytes, base.mainChunkBytes);

summary.push(
  `| Total JS | ${fmtKB(current.totalBytes)} | ${fmtKB(base.totalBytes)} | ${totalDelta >= 0 ? "+" : ""}${totalDelta.toFixed(2)}% |`,
  `| Main chunk | ${fmtKB(current.mainChunkBytes)} | ${fmtKB(base.mainChunkBytes)} | ${mainDelta >= 0 ? "+" : ""}${mainDelta.toFixed(2)}% |`,
);
for (const p of PILLAR_PATTERNS) {
  const cur = current.pillarChunks[p] ?? 0;
  const baseSize = base.pillarChunks?.[p] ?? 0;
  if (cur === 0 && baseSize === 0) continue;
  const d = baseSize === 0 ? "new" : `${pct(cur, baseSize).toFixed(2)}%`;
  summary.push(`| ${p} | ${fmtKB(cur)} | ${fmtKB(baseSize)} | ${d} |`);
}

console.log(
  `\nTotal JS Δ ${totalDelta.toFixed(2)}% | main chunk Δ ${mainDelta.toFixed(2)}%`,
);

if (totalDelta / 100 > REGRESSION_THRESHOLD) {
  const msg = `❌ FAIL: Total JS grew ${totalDelta.toFixed(2)}% (limit +${(REGRESSION_THRESHOLD * 100).toFixed(1)}%).`;
  console.error(`\n${msg}`);
  summary.push("", `**Result:** ${msg}`);
  appendSummary(summary);
  process.exit(1);
}

const okMsg = `✅ PASS: Total JS within +${(REGRESSION_THRESHOLD * 100).toFixed(1)}% of baseline.`;
console.log(`\n${okMsg}`);
summary.push("", `**Result:** ${okMsg}`);
appendSummary(summary);
