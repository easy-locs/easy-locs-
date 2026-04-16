import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

interface RoutePerf {
  route: string;
  lcp: number;
  fid: number;
  cls: number;
  inp: number;
  score: number;
}

interface BaselineEntry {
  name: string;
  sizeKB: number;
}

const CRITICAL_ROUTES = ["home", "radar", "wallet", "orbit", "me"];

const VITALS_STORAGE_KEY = "el_web_vitals_snapshots";

function loadStoredVitals(): RoutePerf[] {
  try {
    const raw = localStorage.getItem(VITALS_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as RoutePerf[];
  } catch {}
  return [];
}

function captureCurrentVitals(): Promise<RoutePerf[]> {
  return new Promise((resolve) => {
    const results: RoutePerf[] = [];
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const route = window.location.pathname.replace("/", "") || "home";
        const existing = results.find((r) => r.route === route);
        if (existing) continue;
        results.push({
          route,
          lcp: entry.entryType === "largest-contentful-paint" ? entry.startTime : 0,
          fid: 0,
          cls: 0,
          inp: 0,
          score: 0,
        });
      }
    });
    try {
      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
    setTimeout(() => {
      observer.disconnect();
      if (results.length === 0) {
        const stored = loadStoredVitals();
        resolve(stored);
      } else {
        resolve(results);
      }
    }, 1000);
  });
}

function computeScore(r: RoutePerf): number {
  let score = 100;
  if (r.lcp > 4000) score -= 30;
  else if (r.lcp > 2500) score -= 15;
  if (r.fid > 300) score -= 20;
  else if (r.fid > 100) score -= 10;
  if (r.cls > 0.25) score -= 25;
  else if (r.cls > 0.1) score -= 10;
  if (r.inp > 500) score -= 20;
  else if (r.inp > 200) score -= 10;
  return Math.max(0, score);
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-400";
  if (score >= 50) return "text-yellow-400";
  return "text-red-400";
}

function getMetricStatus(value: number, good: number, poor: number): string {
  if (value <= good) return "text-green-400";
  if (value <= poor) return "text-yellow-400";
  return "text-red-400";
}

async function loadBaselines(): Promise<BaselineEntry[]> {
  try {
    const resp = await fetch("/perf-baselines.json");
    if (!resp.ok) return [];
    const data = await resp.json();
    if (data && typeof data === "object" && data.bundles) {
      return Object.entries(data.bundles as Record<string, number>).map(
        ([name, sizeKB]) => ({ name, sizeKB: sizeKB as number })
      );
    }
  } catch {}
  return [];
}

export default function AdminPerformanceLabPage() {
  useUiEngine("admin-performance-lab");
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<RoutePerf[]>([]);
  const [bundles, setBundles] = useState<BaselineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"vitals" | "bundles" | "cli">("vitals");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [vitals, baselineData] = await Promise.all([
      captureCurrentVitals(),
      loadBaselines(),
    ]);

    const routeMap = new Map<string, RoutePerf>();
    for (const v of vitals) routeMap.set(v.route, v);

    const routeData = CRITICAL_ROUTES.map((route) => {
      const existing = routeMap.get(route);
      if (existing) {
        existing.score = computeScore(existing);
        return existing;
      }
      return { route, lcp: 0, fid: 0, cls: 0, inp: 0, score: 0 };
    });

    setRoutes(routeData);
    setBundles(baselineData);
    setLoading(false);

    localStorage.setItem(VITALS_STORAGE_KEY, JSON.stringify(routeData));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const measuredRoutes = routes.filter((r) => r.lcp > 0 || r.fid > 0 || r.cls > 0 || r.inp > 0);
  const avgScore = measuredRoutes.length
    ? Math.round(measuredRoutes.reduce((s, r) => s + r.score, 0) / measuredRoutes.length)
    : 0;

  return (
    <SubPageShell>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/lab-hub")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
          <div>
            <h1 className="text-lg font-bold">Performance Lab</h1>
            <p className="text-xs text-muted-foreground">Web Vitals, bundle size, regression detection</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
            <div className={`text-2xl font-bold ${measuredRoutes.length > 0 ? getScoreColor(avgScore) : "text-muted-foreground"}`}>
              {measuredRoutes.length > 0 ? avgScore : "—"}
            </div>
            <div className="text-xs text-muted-foreground">Avg Score</div>
          </div>
          <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{measuredRoutes.length}</div>
            <div className="text-xs text-muted-foreground">Measured</div>
          </div>
          <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{bundles.length}</div>
            <div className="text-xs text-muted-foreground">Bundles</div>
          </div>
        </div>

        <div className="flex gap-2">
          {(["vitals", "bundles", "cli"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t === "vitals" ? "Web Vitals" : t === "bundles" ? "Bundle Size" : "CLI"}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-sm text-muted-foreground py-8">Loading performance data...</div>
        )}

        {!loading && tab === "vitals" && (
          <div className="space-y-3">
            {measuredRoutes.length === 0 && (
              <div className="rounded-xl bg-card border border-border/20 p-4 text-center">
                <p className="text-sm text-muted-foreground">No Web Vitals data collected yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Navigate through the app to start collecting metrics. The web-vitals-reporter captures LCP, FID, CLS, TTFB, INP, and FCP as you use the app.</p>
              </div>
            )}
            {routes.map((r) => (
              <div key={r.route} className="rounded-xl bg-card border border-border/20 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm capitalize">/{r.route}</span>
                  <span className={`text-sm font-bold ${r.lcp > 0 ? getScoreColor(r.score) : "text-muted-foreground"}`}>
                    {r.lcp > 0 ? Math.round(r.score) : "—"}
                  </span>
                </div>
                {r.lcp > 0 || r.fid > 0 || r.cls > 0 || r.inp > 0 ? (
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">LCP</div>
                      <div className={getMetricStatus(r.lcp, 2500, 4000)}>{r.lcp > 0 ? `${Math.round(r.lcp)}ms` : "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">FID</div>
                      <div className={getMetricStatus(r.fid, 100, 300)}>{r.fid > 0 ? `${Math.round(r.fid)}ms` : "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">CLS</div>
                      <div className={getMetricStatus(r.cls, 0.1, 0.25)}>{r.cls > 0 ? r.cls.toFixed(3) : "—"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">INP</div>
                      <div className={getMetricStatus(r.inp, 200, 500)}>{r.inp > 0 ? `${Math.round(r.inp)}ms` : "—"}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Not yet measured — visit this route to collect data</div>
                )}
              </div>
            ))}
            <button onClick={refresh} className="w-full rounded-xl bg-muted text-muted-foreground py-2 text-xs font-bold">
              Refresh Vitals
            </button>
          </div>
        )}

        {!loading && tab === "bundles" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-card border border-border/20 p-4">
              <h3 className="text-sm font-bold mb-3">Bundle Size from Baseline</h3>
              {bundles.length === 0 ? (
                <div className="text-xs text-muted-foreground">
                  <p>No baseline data found. Run the performance audit to generate baselines:</p>
                  <pre className="bg-muted px-2 py-1 rounded mt-2 font-mono">npm run perf:audit</pre>
                </div>
              ) : (
                <div className="space-y-2">
                  {bundles.map((b) => (
                    <div key={b.name} className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{b.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${b.sizeKB > 200 ? "bg-red-500" : b.sizeKB > 100 ? "bg-yellow-500" : "bg-green-500"}`}
                            style={{ width: `${Math.min(100, (b.sizeKB / 200) * 100)}%` }}
                          />
                        </div>
                        <span className="font-mono w-16 text-right">{b.sizeKB.toFixed(1)}KB</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && tab === "cli" && (
          <div className="rounded-xl bg-card border border-border/20 p-4">
            <h3 className="text-sm font-bold mb-3">Performance CLI Commands</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div>
                <code className="bg-muted px-2 py-1 rounded font-mono block">npm run perf:audit</code>
                <p className="mt-1">Run bundle size comparison against baselines and flag regressions (&gt;200KB total increase).</p>
              </div>
              <div>
                <code className="bg-muted px-2 py-1 rounded font-mono block">npm run check:bundle</code>
                <p className="mt-1">Check individual chunk sizes against the 200KB per-chunk threshold.</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              These checks are also integrated into the UI Quality Gate and run automatically during CI.
            </div>
          </div>
        )}
      </div>
    </SubPageShell>
  );
}
