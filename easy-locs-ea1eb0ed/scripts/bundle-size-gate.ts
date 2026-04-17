import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const DIST_DIR = path.resolve("dist/assets");
const BASELINE_FILE = path.resolve("bundle-size-baseline.json");
const HISTORY_FILE = path.resolve("bundle-size-history.json");
const REGRESSION_THRESHOLD = Number.parseFloat(
  process.env.BUNDLE_SIZE_THRESHOLD ?? "0.10",
);
const BASELINE_REF = process.env.BUNDLE_SIZE_BASELINE_REF ?? "origin/main";
const TREND_THRESHOLD = Number.parseFloat(
  process.env.BUNDLE_SIZE_TREND_THRESHOLD ?? "0.25",
);
const TREND_WINDOW_DAYS = Number.parseInt(
  process.env.BUNDLE_SIZE_TREND_WINDOW_DAYS ?? "30",
  10,
);
const HISTORY_MAX_ENTRIES = Number.parseInt(
  process.env.BUNDLE_SIZE_HISTORY_MAX_ENTRIES ?? "365",
  10,
);
const TREND_FAIL = process.env.BUNDLE_SIZE_TREND_FAIL === "1" ||
  process.env.BUNDLE_SIZE_TREND_FAIL === "true";

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
  cssBytes: number;
  assetBytes: number;
  pillarChunks: Record<string, number>;
  allChunks: Record<string, number>;
}

function stripHash(file: string): string {
  return file.replace(/-[A-Za-z0-9_-]{6,}(\.[A-Za-z0-9]+)$/, "$1");
}

function snapshotDist(): BundleSnapshot {
  if (!fs.existsSync(DIST_DIR)) {
    console.error(
      `[bundle-size-gate] ${DIST_DIR} not found. Run "npm run build" first.`,
    );
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_DIR);
  const allChunks: Record<string, number> = {};
  const pillarChunks: Record<string, number> = {};
  let totalBytes = 0;
  let mainChunkBytes = 0;
  let cssBytes = 0;
  let assetBytes = 0;

  for (const file of files) {
    const full = path.join(DIST_DIR, file);
    const stat = fs.statSync(full);
    if (!stat.isFile()) continue;
    const size = stat.size;
    const ext = path.extname(file).toLowerCase();

    if (ext === ".js") {
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
    } else if (ext === ".css") {
      cssBytes += size;
    } else {
      assetBytes += size;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    totalBytes,
    mainChunkBytes,
    cssBytes,
    assetBytes,
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
  const body = `${lines.join("\n")}\n`;
  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummary) fs.appendFileSync(stepSummary, body);
  const commentFile = process.env.BUNDLE_SIZE_COMMENT_FILE;
  if (commentFile) fs.writeFileSync(commentFile, body);
}

interface HistoryEntry extends BundleSnapshot {
  sha?: string;
  ref?: string;
}

interface HistoryFile {
  entries: HistoryEntry[];
  _comment?: string;
}

function currentSha(): string | undefined {
  try {
    return execSync("git rev-parse HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

function loadHistory(): HistoryFile {
  if (!fs.existsSync(HISTORY_FILE)) {
    return { entries: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
    if (parsed && Array.isArray(parsed.entries)) return parsed as HistoryFile;
  } catch (err) {
    console.warn(`[bundle-size-gate] Could not parse ${HISTORY_FILE}: ${(err as Error).message}`);
  }
  return { entries: [] };
}

function writeHistory(history: HistoryFile): void {
  const out: HistoryFile = {
    _comment:
      "Append-only bundle size snapshots, written by scripts/bundle-size-gate.ts on each push to main. Used by the trend-check mode to alert on slow drift.",
    entries: history.entries,
  };
  fs.writeFileSync(HISTORY_FILE, `${JSON.stringify(out, null, 2)}\n`);
}

const mode = process.argv[2] ?? "check";
const current = snapshotDist();

if (mode === "update") {
  fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`[bundle-size-gate] Baseline written to ${BASELINE_FILE}`);
  console.log(
    `  Total JS: ${fmtKB(current.totalBytes)} | main: ${fmtKB(current.mainChunkBytes)} | CSS: ${fmtKB(current.cssBytes)} | assets: ${fmtKB(current.assetBytes)}`,
  );
  process.exit(0);
}

if (mode === "append-history") {
  const history = loadHistory();
  const sha = process.env.GITHUB_SHA ?? currentSha();
  const ref = process.env.GITHUB_REF ?? undefined;
  const entry: HistoryEntry = {
    generatedAt: current.generatedAt,
    totalBytes: current.totalBytes,
    mainChunkBytes: current.mainChunkBytes,
    cssBytes: current.cssBytes,
    assetBytes: current.assetBytes,
    pillarChunks: current.pillarChunks,
    // Drop allChunks from history to keep the file small.
    allChunks: {},
    sha,
    ref,
  };
  // Replace any prior entry for the same SHA, otherwise append.
  const existingIdx = sha
    ? history.entries.findIndex((e) => e.sha === sha)
    : -1;
  if (existingIdx >= 0) {
    history.entries[existingIdx] = entry;
  } else {
    history.entries.push(entry);
  }
  // Keep history bounded.
  if (history.entries.length > HISTORY_MAX_ENTRIES) {
    history.entries = history.entries.slice(-HISTORY_MAX_ENTRIES);
  }
  writeHistory(history);
  console.log(
    `[bundle-size-gate] Appended snapshot to ${HISTORY_FILE} (${history.entries.length} entries; sha=${sha ?? "n/a"})`,
  );
  console.log(
    `  Total JS: ${fmtKB(current.totalBytes)} | main: ${fmtKB(current.mainChunkBytes)} | CSS: ${fmtKB(current.cssBytes)} | assets: ${fmtKB(current.assetBytes)}`,
  );
  process.exit(0);
}

if (mode === "trend-check") {
  const history = loadHistory();
  const trendSummary: string[] = [
    "## Bundle Size Trend",
    "",
    `**Window:** ${TREND_WINDOW_DAYS} days  |  **Alert threshold:** +${(TREND_THRESHOLD * 100).toFixed(1)}% rolling growth`,
    "",
  ];

  if (history.entries.length < 2) {
    const msg = `Not enough history yet (${history.entries.length} entr${history.entries.length === 1 ? "y" : "ies"}). Need at least 2 to compute a trend.`;
    console.log(`[bundle-size-gate] ${msg}`);
    trendSummary.push(`_${msg}_`);
    appendSummary(trendSummary);
    process.exit(0);
  }

  const now = Date.now();
  const windowMs = TREND_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const cutoff = now - windowMs;

  const sorted = [...history.entries].sort(
    (a, b) =>
      new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
  );
  const latest = sorted[sorted.length - 1];

  // Pick the oldest entry within the window. If none fall inside, fall back
  // to the newest entry just before the window cutoff so we still report
  // drift across the longest reasonable interval ending at "latest".
  const inWindow = sorted.filter(
    (e) => new Date(e.generatedAt).getTime() >= cutoff,
  );
  let windowStart: HistoryEntry;
  if (inWindow.length > 0) {
    windowStart = inWindow[0];
  } else {
    // sorted is ascending; find the last entry strictly before the cutoff
    // that isn't the latest sample itself.
    const candidates = sorted
      .slice(0, -1)
      .filter((e) => new Date(e.generatedAt).getTime() < cutoff);
    windowStart = candidates.length > 0
      ? candidates[candidates.length - 1]
      : sorted[Math.max(0, sorted.length - 2)];
  }

  const compareMetric = (label: string, cur: number, base: number) => {
    const delta = pct(cur, base);
    const breached = base > 0 && delta / 100 > TREND_THRESHOLD;
    return { label, cur, base, delta, breached };
  };

  const metrics = [
    compareMetric("Total JS", latest.totalBytes, windowStart.totalBytes),
    compareMetric("Main chunk", latest.mainChunkBytes, windowStart.mainChunkBytes),
    compareMetric("CSS", latest.cssBytes ?? 0, windowStart.cssBytes ?? 0),
    compareMetric("Static assets", latest.assetBytes ?? 0, windowStart.assetBytes ?? 0),
  ];

  trendSummary.push(
    `**Window start:** ${windowStart.generatedAt}${windowStart.sha ? ` (${windowStart.sha.slice(0, 7)})` : ""}`,
    `**Latest:** ${latest.generatedAt}${latest.sha ? ` (${latest.sha.slice(0, 7)})` : ""}`,
    `**Samples in window:** ${inWindow.length} / ${sorted.length} total`,
    "",
    "| Metric | Window start | Latest | Δ |",
    "| --- | ---: | ---: | ---: |",
  );
  for (const m of metrics) {
    const deltaStr = m.base === 0
      ? "new"
      : `${m.delta >= 0 ? "+" : ""}${m.delta.toFixed(2)}%`;
    const flag = m.breached ? " ⚠️" : "";
    trendSummary.push(
      `| ${m.label} | ${fmtKB(m.base)} | ${fmtKB(m.cur)} | ${deltaStr}${flag} |`,
    );
  }

  console.log("== Bundle Size Trend ==");
  console.log(
    `Window: ${TREND_WINDOW_DAYS} days | Alert threshold: +${(TREND_THRESHOLD * 100).toFixed(1)}%`,
  );
  console.log(`Window start: ${windowStart.generatedAt}`);
  console.log(`Latest:       ${latest.generatedAt}`);
  for (const m of metrics) {
    console.log(
      `  ${m.label}: ${fmtKB(m.base)} → ${fmtKB(m.cur)} (${m.delta >= 0 ? "+" : ""}${m.delta.toFixed(2)}%)${m.breached ? "  ALERT" : ""}`,
    );
  }

  const breaches = metrics.filter((m) => m.breached);
  if (breaches.length > 0) {
    const summary = breaches
      .map((m) => `${m.label} +${m.delta.toFixed(2)}%`)
      .join(", ");
    const msg = `Bundle size drift exceeds +${(TREND_THRESHOLD * 100).toFixed(1)}% over ${TREND_WINDOW_DAYS}d: ${summary}`;
    // GitHub Actions warning annotation (picked up by the runner UI).
    console.log(`::warning title=Bundle size drift::${msg}`);
    trendSummary.push("", `**Result:** ⚠️ ALERT — ${msg}`);
    appendSummary(trendSummary);
    process.exit(TREND_FAIL ? 1 : 0);
  }

  const okMsg = `All tracked metrics within +${(TREND_THRESHOLD * 100).toFixed(1)}% over the last ${TREND_WINDOW_DAYS} days.`;
  console.log(`\n${okMsg}`);
  trendSummary.push("", `**Result:** ✅ OK — ${okMsg}`);
  appendSummary(trendSummary);
  process.exit(0);
}

console.log("== Bundle Size Gate ==");
console.log(
  `Threshold: +${(REGRESSION_THRESHOLD * 100).toFixed(1)}% on total JS, CSS, and static assets vs baseline (${BASELINE_REF})`,
);
console.log(`Current total JS: ${fmtKB(current.totalBytes)}`);
console.log(`Current main chunk: ${fmtKB(current.mainChunkBytes)}`);
console.log(`Current CSS: ${fmtKB(current.cssBytes)}`);
console.log(`Current static assets: ${fmtKB(current.assetBytes)}`);
for (const p of PILLAR_PATTERNS) {
  const cur = current.pillarChunks[p];
  if (cur) console.log(`  ${p}: ${fmtKB(cur)}`);
}

const baseline = loadBaseline();

const summary: string[] = [
  "## Bundle Size Gate",
  "",
  `**Threshold:** +${(REGRESSION_THRESHOLD * 100).toFixed(1)}% on total JS, CSS, and static assets`,
  "",
  "| Metric | Current | Baseline | Δ |",
  "| --- | ---: | ---: | ---: |",
];

const isUnseeded = (b: BundleSnapshot) =>
  b.totalBytes === 0 && (b.cssBytes ?? 0) === 0 && (b.assetBytes ?? 0) === 0;

if (!baseline || isUnseeded(baseline.data)) {
  const reason = baseline
    ? `placeholder baseline at ${baseline.source} (unseeded)`
    : "no baseline available";
  console.warn(`\n[bundle-size-gate] ${reason}. Skipping comparison.`);
  console.warn(
    "  The next push to main will seed the baseline automatically via the bundle-size-gate workflow.",
  );
  summary.push(
    `| Total JS | ${fmtKB(current.totalBytes)} | _not yet seeded_ | – |`,
    `| CSS | ${fmtKB(current.cssBytes)} | _not yet seeded_ | – |`,
    `| Static assets | ${fmtKB(current.assetBytes)} | _not yet seeded_ | – |`,
  );
  appendSummary(summary);
  process.exit(0);
}

const base = baseline.data;
const baseCssBytes = base.cssBytes ?? 0;
const baseAssetBytes = base.assetBytes ?? 0;

console.log(`\nBaseline source: ${baseline.source} (${base.generatedAt})`);
console.log(`Baseline total JS: ${fmtKB(base.totalBytes)}`);
console.log(`Baseline main chunk: ${fmtKB(base.mainChunkBytes)}`);
console.log(`Baseline CSS: ${fmtKB(baseCssBytes)}`);
console.log(`Baseline static assets: ${fmtKB(baseAssetBytes)}`);

const totalDelta = pct(current.totalBytes, base.totalBytes);
const mainDelta = pct(current.mainChunkBytes, base.mainChunkBytes);
const cssDelta = pct(current.cssBytes, baseCssBytes);
const assetDelta = pct(current.assetBytes, baseAssetBytes);

summary.push(
  `| Total JS | ${fmtKB(current.totalBytes)} | ${fmtKB(base.totalBytes)} | ${totalDelta >= 0 ? "+" : ""}${totalDelta.toFixed(2)}% |`,
  `| Main chunk | ${fmtKB(current.mainChunkBytes)} | ${fmtKB(base.mainChunkBytes)} | ${mainDelta >= 0 ? "+" : ""}${mainDelta.toFixed(2)}% |`,
  `| CSS | ${fmtKB(current.cssBytes)} | ${fmtKB(baseCssBytes)} | ${baseCssBytes === 0 ? "new" : `${cssDelta >= 0 ? "+" : ""}${cssDelta.toFixed(2)}%`} |`,
  `| Static assets | ${fmtKB(current.assetBytes)} | ${fmtKB(baseAssetBytes)} | ${baseAssetBytes === 0 ? "new" : `${assetDelta >= 0 ? "+" : ""}${assetDelta.toFixed(2)}%`} |`,
);
for (const p of PILLAR_PATTERNS) {
  const cur = current.pillarChunks[p] ?? 0;
  const baseSize = base.pillarChunks?.[p] ?? 0;
  if (cur === 0 && baseSize === 0) continue;
  const d = baseSize === 0 ? "new" : `${pct(cur, baseSize).toFixed(2)}%`;
  summary.push(`| ${p} | ${fmtKB(cur)} | ${fmtKB(baseSize)} | ${d} |`);
}

console.log(
  `\nTotal JS Δ ${totalDelta.toFixed(2)}% | main chunk Δ ${mainDelta.toFixed(2)}% | CSS Δ ${cssDelta.toFixed(2)}% | assets Δ ${assetDelta.toFixed(2)}%`,
);

const failures: string[] = [];
const limitPct = (REGRESSION_THRESHOLD * 100).toFixed(1);

if (totalDelta / 100 > REGRESSION_THRESHOLD) {
  failures.push(
    `Total JS grew ${totalDelta.toFixed(2)}% (limit +${limitPct}%).`,
  );
}
if (baseCssBytes > 0 && cssDelta / 100 > REGRESSION_THRESHOLD) {
  failures.push(`CSS grew ${cssDelta.toFixed(2)}% (limit +${limitPct}%).`);
}
if (baseAssetBytes > 0 && assetDelta / 100 > REGRESSION_THRESHOLD) {
  failures.push(
    `Static assets grew ${assetDelta.toFixed(2)}% (limit +${limitPct}%).`,
  );
}

if (failures.length > 0) {
  const msg = `❌ FAIL: ${failures.join(" ")}`;
  console.error(`\n${msg}`);
  summary.push("", `**Result:** ${msg}`);
  appendSummary(summary);
  process.exit(1);
}

const okMsg = `✅ PASS: Total JS, CSS, and static assets within +${limitPct}% of baseline.`;
console.log(`\n${okMsg}`);
summary.push("", `**Result:** ${okMsg}`);
appendSummary(summary);
