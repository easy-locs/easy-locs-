import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE_FILE = path.join(ROOT, "perf-baselines.json");
const DIST_DIR = path.join(ROOT, "dist/assets");
const VITALS_FILE = path.join(ROOT, "public/web-vitals.json");

interface PerfBaseline {
  timestamp: string;
  routes: Record<string, RoutePerf>;
  bundles: Record<string, number>;
}

interface RoutePerf {
  lcp: number;
  fid: number;
  cls: number;
  inp: number;
  score: number;
}

interface VitalsReport {
  route: string;
  lcp?: number;
  fid?: number;
  cls?: number;
  inp?: number;
  fcp?: number;
  ttfb?: number;
  timestamp?: string;
}

const CRITICAL_ROUTES = ["home", "radar", "wallet", "orbit", "me"];

const WEB_VITALS_THRESHOLDS: Record<string, { good: number; poor: number }> = {
  lcp: { good: 2500, poor: 4000 },
  fid: { good: 100, poor: 300 },
  cls: { good: 0.1, poor: 0.25 },
  inp: { good: 200, poor: 500 },
};

const DEFAULT_BASELINE: PerfBaseline = {
  timestamp: new Date().toISOString(),
  routes: Object.fromEntries(
    CRITICAL_ROUTES.map((r) => [
      r,
      { lcp: 2500, fid: 100, cls: 0.1, inp: 200, score: 90 },
    ])
  ),
  bundles: {},
};

function loadBaseline(): PerfBaseline {
  if (fs.existsSync(BASELINE_FILE)) {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, "utf-8"));
  }
  return DEFAULT_BASELINE;
}

function saveBaseline(baseline: PerfBaseline): void {
  const json = JSON.stringify(baseline, null, 2);
  fs.writeFileSync(BASELINE_FILE, json, "utf-8");
  const publicCopy = path.join(ROOT, "public/perf-baselines.json");
  fs.writeFileSync(publicCopy, json, "utf-8");
}

function analyzeBundles(): Record<string, number> {
  const result: Record<string, number> = {};
  if (!fs.existsSync(DIST_DIR)) {
    console.warn("[perf-audit] dist/assets not found — skip bundle analysis");
    return result;
  }
  const files = fs.readdirSync(DIST_DIR).filter((f) => f.endsWith(".js"));
  for (const file of files) {
    const stat = fs.statSync(path.join(DIST_DIR, file));
    result[file] = Math.round((stat.size / 1024) * 100) / 100;
  }
  return result;
}

function bundleDiff(
  current: Record<string, number>,
  baseline: Record<string, number>
): Array<{ name: string; before: number; after: number; delta: number }> {
  const diffs: Array<{ name: string; before: number; after: number; delta: number }> = [];
  const allKeys = new Set([...Object.keys(current), ...Object.keys(baseline)]);

  for (const key of allKeys) {
    const before = baseline[key] ?? 0;
    const after = current[key] ?? 0;
    if (before !== after) {
      diffs.push({ name: key, before, after, delta: after - before });
    }
  }
  return diffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function loadVitals(): VitalsReport[] {
  if (!fs.existsSync(VITALS_FILE)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(VITALS_FILE, "utf-8"));
    return Array.isArray(raw) ? raw as VitalsReport[] : [];
  } catch {
    return [];
  }
}

function scoreRoute(r: RoutePerf): number {
  let score = 100;
  for (const [metric, thresholds] of Object.entries(WEB_VITALS_THRESHOLDS)) {
    const value = r[metric as keyof RoutePerf] as number;
    if (value > thresholds.poor) score -= 25;
    else if (value > thresholds.good) score -= 10;
  }
  return Math.max(0, score);
}

function compareRouteToBaseline(
  current: RoutePerf,
  baseline: RoutePerf
): Array<{ metric: string; before: number; after: number; regression: boolean }> {
  const diffs: Array<{ metric: string; before: number; after: number; regression: boolean }> = [];
  for (const metric of ["lcp", "fid", "cls", "inp"] as const) {
    const before = baseline[metric];
    const after = current[metric];
    if (after > 0 && before > 0) {
      const threshold = metric === "cls" ? 0.05 : before * 0.2;
      diffs.push({
        metric,
        before,
        after,
        regression: after - before > threshold,
      });
    }
  }
  return diffs;
}

function runBundleDiff(): void {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║              Bundle Size Diff Report                        ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");

  const baseline = loadBaseline();
  const currentBundles = analyzeBundles();
  const diffs = bundleDiff(currentBundles, baseline.bundles);

  if (diffs.length === 0) {
    console.log("\n  No bundle changes detected.");
  } else {
    for (const d of diffs) {
      const sign = d.delta > 0 ? "+" : "";
      const marker = Math.abs(d.delta) > 50 ? " ⚠ LARGE CHANGE" : "";
      console.log(
        `  ${d.name}: ${d.before.toFixed(1)}KB → ${d.after.toFixed(1)}KB (${sign}${d.delta.toFixed(1)}KB)${marker}`
      );
    }
  }

  const totalBefore = Object.values(baseline.bundles).reduce((s, v) => s + v, 0);
  const totalAfter = Object.values(currentBundles).reduce((s, v) => s + v, 0);
  const totalDelta = totalAfter - totalBefore;
  console.log(
    `\n  Total: ${(totalBefore / 1024).toFixed(2)}MB → ${(totalAfter / 1024).toFixed(2)}MB (${totalDelta > 0 ? "+" : ""}${(totalDelta / 1024).toFixed(2)}MB)`
  );

  if (totalDelta > 200) {
    console.error("\n❌ REGRESSION: Bundle size increased by more than 200KB");
    process.exit(1);
  }

  console.log("\n╚══════════════════════════════════════════════════════════════╝");
}

function runAudit(): void {
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║              Performance Audit Report                       ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");

  const baseline = loadBaseline();
  const currentBundles = analyzeBundles();
  const vitals = loadVitals();

  if (vitals.length > 0) {
    console.log("\n▸ Live Web Vitals (from browser reporter):");
    for (const v of vitals) {
      const perf: RoutePerf = {
        lcp: v.lcp ?? 0,
        fid: v.fid ?? 0,
        cls: v.cls ?? 0,
        inp: v.inp ?? 0,
        score: 0,
      };
      perf.score = scoreRoute(perf);
      const status = perf.score >= 90 ? "✅" : perf.score >= 50 ? "⚠️" : "❌";
      console.log(
        `  ${status} /${v.route}: LCP=${perf.lcp.toFixed(0)}ms FID=${perf.fid.toFixed(0)}ms CLS=${perf.cls.toFixed(3)} INP=${perf.inp.toFixed(0)}ms Score=${perf.score}`
      );

      const baselineRoute = baseline.routes[v.route];
      if (baselineRoute) {
        const regressions = compareRouteToBaseline(perf, baselineRoute);
        for (const r of regressions) {
          if (r.regression) {
            console.log(`     ⚠ ${r.metric.toUpperCase()} regression: ${r.before} → ${r.after}`);
          }
        }
      }

      baseline.routes[v.route] = perf;
    }
  }

  console.log("\n▸ Route Performance Baselines:");
  for (const route of CRITICAL_ROUTES) {
    const perf = baseline.routes[route];
    if (perf) {
      const status = perf.score >= 90 ? "✅" : perf.score >= 50 ? "⚠️" : "❌";
      console.log(
        `  ${status} /${route}: LCP=${perf.lcp}ms FID=${perf.fid}ms CLS=${perf.cls} INP=${perf.inp}ms Score=${perf.score}`
      );
    }
  }

  if (Object.keys(currentBundles).length > 0) {
    console.log("\n▸ Bundle Size Diff:");
    const diffs = bundleDiff(currentBundles, baseline.bundles);
    if (diffs.length === 0) {
      console.log("  No bundle changes detected.");
    } else {
      for (const d of diffs.slice(0, 15)) {
        const sign = d.delta > 0 ? "+" : "";
        const marker = Math.abs(d.delta) > 50 ? " ⚠" : "";
        console.log(
          `  ${d.name}: ${d.before.toFixed(1)}KB → ${d.after.toFixed(1)}KB (${sign}${d.delta.toFixed(1)}KB)${marker}`
        );
      }
    }

    const totalBefore = Object.values(baseline.bundles).reduce((s, v) => s + v, 0);
    const totalAfter = Object.values(currentBundles).reduce((s, v) => s + v, 0);
    const totalDelta = totalAfter - totalBefore;
    console.log(
      `\n  Total: ${(totalBefore / 1024).toFixed(2)}MB → ${(totalAfter / 1024).toFixed(2)}MB (${totalDelta > 0 ? "+" : ""}${(totalDelta / 1024).toFixed(2)}MB)`
    );

    if (totalDelta > 200) {
      console.error("\n❌ REGRESSION: Bundle size increased by more than 200KB");
      process.exit(1);
    }
  }

  console.log("\n╚══════════════════════════════════════════════════════════════╝");

  const isFirstRun = !fs.existsSync(BASELINE_FILE);
  if (isFirstRun || process.argv.includes("--update-baseline")) {
    const updated: PerfBaseline = {
      timestamp: new Date().toISOString(),
      routes: baseline.routes,
      bundles: currentBundles,
    };
    saveBaseline(updated);
    console.log(isFirstRun ? "\n✅ Initial baseline created." : "\n✅ Baseline updated.");
  }
}

const subcommand = process.argv[2];
if (subcommand === "bundle-diff") {
  runBundleDiff();
} else {
  runAudit();
}
