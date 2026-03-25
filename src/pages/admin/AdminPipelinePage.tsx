import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { runMasterPipeline, runQuickPipeline, type PipelineRunResult, type PipelineStageResult } from "@/lib/pipeline/master-data-pipeline";

export default function AdminPipelinePage() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"full" | "quick">("quick");
  const [result, setResult] = useState<PipelineRunResult | null>(null);
  const [quickResult, setQuickResult] = useState<PipelineStageResult[] | null>(null);

  const run = async () => {
    setRunning(true);
    setResult(null);
    setQuickResult(null);
    try {
      if (mode === "full") {
        const r = await runMasterPipeline(30);
        setResult(r);
      } else {
        const r = await runQuickPipeline(20);
        setQuickResult(r);
      }
    } catch (e) {
      console.error("[pipeline] Run failed:", e);
    } finally {
      setRunning(false);
    }
  };

  const stages = result?.stages ?? quickResult ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Master Data Pipeline</h1>
          <p className="text-xs text-muted-foreground">SOURCE → CLASSIFY → CLEAN → NORMALIZE → REBUILD → ENRICH → SCORE → VALIDATE → PUBLISH</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode("quick")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${mode === "quick" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          Quick (4 stages)
        </button>
        <button
          onClick={() => setMode("full")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${mode === "full" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          Full Pipeline (11 stages)
        </button>
      </div>

      <button
        onClick={run}
        disabled={running}
        className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-bold text-sm disabled:opacity-50"
      >
        {running ? "⏳ Running Pipeline..." : `▶ Run ${mode === "full" ? "Full" : "Quick"} Pipeline`}
      </button>

      {stages.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Pipeline Results</h2>
            {result && (
              <span className="text-[10px] text-muted-foreground">
                {result.totalProcessed} processed · {result.totalErrors} errors · {Math.round(result.duration / 1000)}s
              </span>
            )}
          </div>
          {stages.map((s, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 ${s.errors > 0 ? "border-destructive/30 bg-destructive/5" : "border-border/20 bg-card"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${s.errors > 0 ? "bg-destructive" : s.processed > 0 ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                  <span className="text-xs font-bold">{s.stage}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{s.engine} · {s.processed} · {s.duration}ms</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-border/20 bg-card p-4 space-y-2">
        <h3 className="text-xs font-bold text-muted-foreground">Pipeline Architecture</h3>
        <div className="text-[10px] text-muted-foreground space-y-1">
          <p><span className="font-bold text-foreground">1. SOURCE</span> — source-intake-engine snapshots raw data</p>
          <p><span className="font-bold text-foreground">2. CLASSIFY</span> — vertical-classifier assigns food/hotel/services/grocery</p>
          <p><span className="font-bold text-foreground">3. CLEAN</span> — shop-cleanup + franchise-dedup remove junk & dupes</p>
          <p><span className="font-bold text-foreground">4. NORMALIZE</span> — food-menu / hotel-inventory / service-catalog / grocery normalizers</p>
          <p><span className="font-bold text-foreground">5. REBUILD</span> — menu-rebuild reconstructs clean canonical menus</p>
          <p><span className="font-bold text-foreground">6. ENRICH</span> — category-mapping + adaptive-taxonomy + data-completeness</p>
          <p><span className="font-bold text-foreground">7. SCORE</span> — shop-quality + data-trust compute quality scores</p>
          <p><span className="font-bold text-foreground">8. VALIDATE</span> — strict-quality-gate + vertical publish gates</p>
          <p><span className="font-bold text-foreground">9. PUBLISH</span> — auto-publish / visibility-optimizer / auto-unpublish</p>
          <p><span className="font-bold text-foreground">10. DISTRIBUTE</span> — central-ranking + SEO sync</p>
          <p><span className="font-bold text-foreground">11. PURGE</span> — remove all placeholder/stock images</p>
        </div>
      </div>
    </div>
  );
}
