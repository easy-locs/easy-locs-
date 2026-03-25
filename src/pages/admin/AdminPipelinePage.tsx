import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { runMasterPipeline, runQuickPipeline, type PipelineRunResult, type PipelineStageResult } from "@/lib/pipeline/master-data-pipeline";
import { processQueue, getQueueStats, enqueueUnprocessedEntities, recoverStaleItems } from "@/lib/pipeline/queue-driven-pipeline";
import { PIPELINE_STAGES } from "@/lib/pipeline/queue-driven-pipeline";
import { ENGINE_RATIONALIZATION_MAP } from "@/lib/pipeline/vertical-schema-registry";

export default function AdminPipelinePage() {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"full" | "quick" | "queue">("queue");
  const [result, setResult] = useState<PipelineRunResult | null>(null);
  const [quickResult, setQuickResult] = useState<PipelineStageResult[] | null>(null);
  const [queueResult, setQueueResult] = useState<{ processed: number; failed: number; stages: Record<string, number> } | null>(null);
  const [stats, setStats] = useState<{ pending: number; processing: number; done: number; failed: number; byStage: Record<string, number> } | null>(null);
  const [tab, setTab] = useState<"run" | "queue" | "engines">("run");

  const loadStats = async () => {
    try {
      const s = await getQueueStats();
      setStats(s);
    } catch {}
  };

  useEffect(() => { loadStats(); }, []);

  const run = async () => {
    setRunning(true);
    setResult(null);
    setQuickResult(null);
    setQueueResult(null);
    try {
      if (mode === "full") {
        const r = await runMasterPipeline(30);
        setResult(r);
      } else if (mode === "quick") {
        const r = await runQuickPipeline(20);
        setQuickResult(r);
      } else {
        const r = await processQueue(20);
        setQueueResult(r);
        await loadStats();
      }
    } catch (e) {
      console.error("[pipeline] Run failed:", e);
    } finally {
      setRunning(false);
    }
  };

  const handleEnqueue = async () => {
    setRunning(true);
    try {
      const r = await enqueueUnprocessedEntities(100);
      alert(`Enqueued ${r.enqueued} entities`);
      await loadStats();
    } finally { setRunning(false); }
  };

  const handleRecover = async () => {
    const r = await recoverStaleItems(5);
    alert(`Recovered ${r.recovered} stale items`);
    await loadStats();
  };

  const stages = result?.stages ?? quickResult ?? [];
  const engineEntries = Object.entries(ENGINE_RATIONALIZATION_MAP);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Master Pipeline Control</h1>
          <p className="text-[10px] text-muted-foreground">Queue-driven · Real-time · Self-healing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-border/20 pb-2">
        {(["run", "queue", "engines"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >{t === "run" ? "▶ Run" : t === "queue" ? "📋 Queue" : "⚙ Engines"}</button>
        ))}
      </div>

      {/* ════ TAB: RUN ════ */}
      {tab === "run" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {(["queue", "quick", "full"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >{m === "queue" ? "Queue Worker" : m === "quick" ? "Quick (4)" : "Full (11)"}</button>
            ))}
          </div>

          <button onClick={run} disabled={running}
            className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-bold text-sm disabled:opacity-50">
            {running ? "⏳ Running..." : `▶ Run ${mode === "full" ? "Full Pipeline" : mode === "quick" ? "Quick Pipeline" : "Queue Worker (20 items)"}`}
          </button>

          {/* Queue worker result */}
          {queueResult && (
            <div className="rounded-xl border border-border/20 bg-card p-3 space-y-1">
              <p className="text-xs font-bold">Queue Worker Result</p>
              <p className="text-[10px] text-muted-foreground">
                ✅ {queueResult.processed} processed · ❌ {queueResult.failed} failed
              </p>
              {Object.entries(queueResult.stages).map(([stage, count]) => (
                <span key={stage} className="inline-block mr-1.5 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">
                  {stage}: {count}
                </span>
              ))}
            </div>
          )}

          {/* Pipeline stage results */}
          {stages.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold">Stage Results</h2>
                {result && (
                  <span className="text-[10px] text-muted-foreground">
                    {result.totalProcessed} proc · {result.totalErrors} err · {Math.round(result.duration / 1000)}s
                  </span>
                )}
              </div>
              {stages.map((s, i) => (
                <div key={i} className={`rounded-xl border p-2.5 ${s.errors > 0 ? "border-destructive/30 bg-destructive/5" : "border-border/20 bg-card"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.errors > 0 ? "bg-destructive" : s.processed > 0 ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                      <span className="text-[11px] font-bold">{s.stage}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground">{s.engine} · {s.processed} · {s.duration}ms</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════ TAB: QUEUE ════ */}
      {tab === "queue" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={handleEnqueue} disabled={running}
              className="flex-1 rounded-xl bg-primary text-primary-foreground py-2 text-xs font-bold disabled:opacity-50">
              + Enqueue Unprocessed
            </button>
            <button onClick={handleRecover}
              className="rounded-xl bg-muted text-muted-foreground px-3 py-2 text-xs font-bold">
              🔄 Recover Stale
            </button>
            <button onClick={loadStats}
              className="rounded-xl bg-muted text-muted-foreground px-3 py-2 text-xs font-bold">
              ↻
            </button>
          </div>

          {stats && (
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Pending", value: stats.pending, color: "text-yellow-500" },
                { label: "Processing", value: stats.processing, color: "text-blue-500" },
                { label: "Done", value: stats.done, color: "text-green-500" },
                { label: "Failed", value: stats.failed, color: "text-destructive" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-border/20 bg-card p-3 text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {stats && Object.keys(stats.byStage).length > 0 && (
            <div className="rounded-xl border border-border/20 bg-card p-3 space-y-2">
              <h3 className="text-xs font-bold">Items by Stage</h3>
              <div className="space-y-1">
                {PIPELINE_STAGES.map(stage => {
                  const count = stats.byStage[stage] ?? 0;
                  if (count === 0) return null;
                  return (
                    <div key={stage} className="flex items-center justify-between">
                      <span className="text-[10px] font-bold">{stage}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full bg-primary/20" style={{ width: `${Math.min(count * 2, 100)}px` }}>
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (count / Math.max(...Object.values(stats.byStage))) * 100)}%` }} />
                        </div>
                        <span className="text-[9px] text-muted-foreground w-6 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border/20 bg-card p-3 space-y-1">
            <h3 className="text-[10px] font-bold text-muted-foreground">Pipeline Flow</h3>
            <div className="flex flex-wrap gap-1">
              {PIPELINE_STAGES.map((stage, i) => (
                <span key={stage} className="text-[9px]">
                  <span className="font-bold text-foreground">{stage.toUpperCase()}</span>
                  {i < PIPELINE_STAGES.length - 1 && <span className="text-muted-foreground mx-0.5">→</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════ TAB: ENGINES ════ */}
      {tab === "engines" && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">{engineEntries.length} engines rationalized</p>
          {["source", "classify", "clean", "normalize", "rebuild", "enrich", "score", "validate", "publish", "distribute", "digital", "supervision"].map(stage => {
            const stageEngines = engineEntries.filter(([, v]) => v.stage === stage);
            if (stageEngines.length === 0) return null;
            return (
              <div key={stage} className="rounded-xl border border-border/20 bg-card p-3 space-y-1.5">
                <h3 className="text-[11px] font-bold uppercase text-primary">{stage}</h3>
                {stageEngines.map(([name, eng]) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        eng.status === "keep" ? "bg-green-500" : 
                        eng.status === "merge" ? "bg-yellow-500" : 
                        eng.status === "disable" ? "bg-destructive" : "bg-muted-foreground"
                      }`} />
                      <span className="text-[10px] font-medium">{name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                        eng.status === "keep" ? "bg-green-500/10 text-green-600" :
                        eng.status === "merge" ? "bg-yellow-500/10 text-yellow-600" :
                        "bg-muted text-muted-foreground"
                      }`}>{eng.status}</span>
                      <span className="text-[8px] text-muted-foreground">{eng.layer}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
