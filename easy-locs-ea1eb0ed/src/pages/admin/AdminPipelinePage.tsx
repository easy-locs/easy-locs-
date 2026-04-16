import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { runMasterPipeline, runQuickPipeline, type PipelineRunResult, type PipelineStageResult } from "@/lib/pipeline/master-data-pipeline";
import { processQueue, getQueueStats, enqueueUnprocessedEntities, recoverStaleItems } from "@/lib/pipeline/queue-driven-pipeline";
import { PIPELINE_STAGES } from "@/lib/pipeline/queue-driven-pipeline";
import { ENGINE_RATIONALIZATION_MAP } from "@/lib/pipeline/vertical-schema-registry";
import { runAiCore, getAiMode, setAiMode, type AiCoreResult, type AiExecutionMode } from "@/lib/ai/ai-core-engine";
import { invokeUaeScrape } from "@/repositories/admin-ops.repository";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { getAllPipelineMetrics, getPipelineHealthSummary, subscribePipelineMetrics, type PipelineMetricsSnapshot } from "@/lib/pipeline/pipeline-metrics";
import { getAllReplayEvents, retryEvent, getReplayBufferStats, type ReplayEvent } from "@/lib/runtime/event-replay-buffer";

const UAE_CITIES = ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah"];
const VERTICALS = ["food", "hotel", "services", "grocery"];

export default function AdminPipelinePage() {
  useUiEngine("admin-adminpipelinepage");
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<"full" | "quick" | "queue">("queue");
  const [result, setResult] = useState<PipelineRunResult | null>(null);
  const [quickResult, setQuickResult] = useState<PipelineStageResult[] | null>(null);
  const [queueResult, setQueueResult] = useState<{ processed: number; failed: number; stages: Record<string, number> } | null>(null);
  const [stats, setStats] = useState<{ pending: number; processing: number; done: number; failed: number; byStage: Record<string, number> } | null>(null);
  const [tab, setTab] = useState<"run" | "queue" | "engines" | "ai" | "scrape" | "metrics">("run");
  const [metricsSnapshot, setMetricsSnapshot] = useState<PipelineMetricsSnapshot>(() => getAllPipelineMetrics());
  const [replayEvents, setReplayEvents] = useState<ReplayEvent[]>([]);
  const [replayStats, setReplayStats] = useState<{ total: number; pending: number; retrying: number; dead: number; resolved: number } | null>(null);
  const [replayBusy, setReplayBusy] = useState<string | null>(null);

  // AI Core state
  const [aiMode, setAiModeState] = useState<AiExecutionMode>(getAiMode());
  const [aiResult, setAiResult] = useState<AiCoreResult | null>(null);

  // UAE scrape state
  const [scrapeCity, setScrapeCity] = useState("Dubai");
  const [scrapeVertical, setScrapeVertical] = useState("food");
  const [scrapeResult, setScrapeResult] = useState<any>(null);

  const loadStats = async () => {
    try { setStats(await getQueueStats()); } catch {}
  };

  const loadReplayData = async () => {
    try {
      const [events, stats] = await Promise.all([getAllReplayEvents(), getReplayBufferStats()]);
      setReplayEvents(events);
      setReplayStats(stats);
    } catch {}
  };

  useEffect(() => { loadStats(); }, []);

  useEffect(() => {
    if (tab === "metrics") loadReplayData();
  }, [tab]);

  const handleRetry = async (id: string) => {
    setReplayBusy(id);
    try { await retryEvent(id); } catch {}
    setReplayBusy(null);
    await loadReplayData();
  };

  useEffect(() => {
    const unsub = subscribePipelineMetrics(() => {
      setMetricsSnapshot(getAllPipelineMetrics());
    });
    return unsub;
  }, []);

  const run = async () => {
    setRunning(true);
    setResult(null); setQuickResult(null); setQueueResult(null);
    try {
      if (mode === "full") setResult(await runMasterPipeline(30));
      else if (mode === "quick") setQuickResult(await runQuickPipeline(20));
      else { setQueueResult(await processQueue(20)); await loadStats(); }
    } catch (e) { console.error("[pipeline]", e); }
    finally { setRunning(false); }
  };

  const handleEnqueue = async () => {
    setRunning(true);
    try { const r = await enqueueUnprocessedEntities(100); alert(`Enqueued ${r.enqueued} entities`); await loadStats(); }
    finally { setRunning(false); }
  };

  const handleRecover = async () => {
    const r = await recoverStaleItems(5);
    alert(`Recovered ${r.recovered} stale items`);
    await loadStats();
  };

  const handleAiRun = async () => {
    setRunning(true);
    try {
      setAiMode(aiMode);
      setAiResult(await runAiCore(30));
    } finally { setRunning(false); }
  };

  const handleScrape = async () => {
    setRunning(true);
    setScrapeResult(null);
    try {
      setScrapeResult(await invokeUaeScrape(scrapeCity, scrapeVertical));
    } catch (e: any) {
      setScrapeResult({ error: e?.message ?? "Failed" });
    } finally { setRunning(false); }
  };

  const stages = result?.stages ?? quickResult ?? [];
  const engineEntries = Object.entries(ENGINE_RATIONALIZATION_MAP);

  return (
    <SubPageShell>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold">←</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Master Pipeline Control</h1>
          <p className="text-[0.625rem] text-muted-foreground">Queue-driven · AI-augmented · Self-healing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/20 pb-2 overflow-x-auto">
        {(["run", "queue", "metrics", "ai", "scrape", "engines"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-2.5 py-1.5 text-[0.625rem] font-bold whitespace-nowrap transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >{t === "run" ? "▶ Run" : t === "queue" ? "📋 Queue" : t === "metrics" ? "📊 Metrics" : t === "ai" ? "🧠 AI Core" : t === "scrape" ? "🌍 UAE Scrape" : "⚙ Engines"}</button>
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
            {running ? "⏳ Running..." : `▶ Run ${mode === "full" ? "Full Pipeline" : mode === "quick" ? "Quick Pipeline" : "Queue Worker (20)"}`}
          </button>
          {queueResult && (
            <div className="rounded-xl border border-border/20 bg-card p-3 space-y-1">
              <p className="text-xs font-bold">Queue Worker Result</p>
              <p className="text-[0.625rem] text-muted-foreground">✅ {queueResult.processed} processed · ❌ {queueResult.failed} failed</p>
              {Object.entries(queueResult.stages).map(([stage, count]) => (
                <span key={stage} className="inline-block mr-1.5 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[0.625rem] font-bold">{stage}: {count}</span>
              ))}
            </div>
          )}
          {stages.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold">Stage Results</h2>
                {result && <span className="text-[0.625rem] text-muted-foreground">{result.totalProcessed} proc · {result.totalErrors} err · {Math.round(result.duration / 1000)}s</span>}
              </div>
              {stages.map((s, i) => (
                <div key={i} className={`rounded-xl border p-2.5 ${s.errors > 0 ? "border-destructive/30 bg-destructive/5" : "border-border/20 bg-card"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${s.errors > 0 ? "bg-destructive" : s.processed > 0 ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                      <span className="text-[0.6875rem] font-bold">{s.stage}</span>
                    </div>
                    <span className="text-[0.625rem] text-muted-foreground">{s.engine} · {s.processed} · {s.duration}ms</span>
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
            <button onClick={handleEnqueue} disabled={running} className="flex-1 rounded-xl bg-primary text-primary-foreground py-2 text-xs font-bold disabled:opacity-50">+ Enqueue Unprocessed</button>
            <button onClick={handleRecover} className="rounded-xl bg-muted text-muted-foreground px-3 py-2 text-xs font-bold">🔄 Recover</button>
            <button onClick={loadStats} className="rounded-xl bg-muted text-muted-foreground px-3 py-2 text-xs font-bold">↻</button>
          </div>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "Pending", value: stats.pending, color: "text-yellow-500" },
                { label: "Processing", value: stats.processing, color: "text-blue-500" },
                { label: "Done", value: stats.done, color: "text-green-500" },
                { label: "Failed", value: stats.failed, color: "text-destructive" },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-border/20 bg-card p-3 text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[0.625rem] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}
          {stats && Object.keys(stats.byStage).length > 0 && (
            <div className="rounded-xl border border-border/20 bg-card p-3 space-y-2">
              <h3 className="text-xs font-bold">Items by Stage</h3>
              {PIPELINE_STAGES.map(stage => {
                const count = stats.byStage[stage] ?? 0;
                if (count === 0) return null;
                return (
                  <div key={stage} className="flex items-center justify-between">
                    <span className="text-[0.625rem] font-bold">{stage}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 rounded-full bg-primary/20" style={{ width: `${Math.min(count * 2, 100)}px` }}>
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (count / Math.max(...Object.values(stats.byStage))) * 100)}%` }} />
                      </div>
                      <span className="text-[0.625rem] text-muted-foreground w-6 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ════ TAB: AI CORE ════ */}
      {tab === "ai" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border/20 bg-card p-3 space-y-2">
            <h3 className="text-xs font-bold">🧠 AI Execution Mode</h3>
            <div className="flex gap-2">
              {(["passive", "safe_auto", "active"] as const).map(m => (
                <button key={m} onClick={() => { setAiModeState(m); setAiMode(m); }}
                  className={`rounded-xl px-3 py-1.5 text-[0.625rem] font-bold transition-colors ${aiMode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >{m === "passive" ? "👁 Passive" : m === "safe_auto" ? "🔧 Safe Auto" : "⚡ Active"}</button>
              ))}
            </div>
            <p className="text-[0.625rem] text-muted-foreground">
              {aiMode === "passive" ? "Analyze only, no modifications" : aiMode === "safe_auto" ? "Auto-fix low-risk issues (names, categories, placeholders)" : "Full optimization with pipeline re-triggers"}
            </p>
          </div>

          <button onClick={handleAiRun} disabled={running}
            className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-bold text-sm disabled:opacity-50">
            {running ? "⏳ AI Processing..." : "🧠 Run AI Core"}
          </button>

          {aiResult && (
            <div className="space-y-2">
              <div className="rounded-xl border border-border/20 bg-card p-3">
                <p className="text-xs font-bold mb-2">AI Core Results ({aiResult.duration}ms)</p>
                <div className="grid grid-cols-2 gap-2 text-[0.625rem]">
                  <div className="rounded-lg bg-muted/30 p-2">
                    <p className="font-bold">🧹 Data Cleaner</p>
                    <p className="text-muted-foreground">{aiResult.dataCleaner.cleaned} cleaned</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <p className="font-bold">🏷 Classifier</p>
                    <p className="text-muted-foreground">{aiResult.categoryClassifier.corrected} corrected</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <p className="font-bold">📸 Photo Analyzer</p>
                    <p className="text-muted-foreground">{aiResult.photoAnalyzer.flagged} flagged, {aiResult.photoAnalyzer.hidden} hidden</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <p className="font-bold">⬆ Quality Booster</p>
                    <p className="text-muted-foreground">{aiResult.qualityBooster.boosted} boosted</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2 col-span-2">
                    <p className="font-bold">🔀 Duplicate Detector</p>
                    <p className="text-muted-foreground">{aiResult.duplicateDetector.candidates} candidates</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════ TAB: UAE SCRAPE ════ */}
      {tab === "scrape" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-border/20 bg-card p-3 space-y-3">
            <h3 className="text-xs font-bold">🌍 UAE Business Onboarding</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[0.625rem] text-muted-foreground block mb-1">City</label>
                <select value={scrapeCity} onChange={e => setScrapeCity(e.target.value)}
                  className="w-full rounded-lg border border-border/30 bg-background px-2 py-1.5 text-xs">
                  {UAE_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[0.625rem] text-muted-foreground block mb-1">Vertical</label>
                <select value={scrapeVertical} onChange={e => setScrapeVertical(e.target.value)}
                  className="w-full rounded-lg border border-border/30 bg-background px-2 py-1.5 text-xs">
                  {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button onClick={handleScrape} disabled={running}
            className="w-full rounded-2xl bg-primary text-primary-foreground py-3 font-bold text-sm disabled:opacity-50">
            {running ? "⏳ Scraping..." : `🔍 Scrape ${scrapeCity} — ${scrapeVertical}`}
          </button>

          {scrapeResult && (
            <div className={`rounded-xl border p-3 ${scrapeResult.error ? "border-destructive/30 bg-destructive/5" : "border-border/20 bg-card"}`}>
              {scrapeResult.error ? (
                <p className="text-xs text-destructive">{scrapeResult.error}</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-bold">✅ Scrape Complete</p>
                  <p className="text-[0.625rem] text-muted-foreground">Query: {scrapeResult.query}</p>
                  <div className="flex gap-3 text-[0.625rem]">
                    <span className="text-foreground font-bold">{scrapeResult.resultsFound} found</span>
                    <span className="text-green-600 font-bold">{scrapeResult.onboarded} onboarded</span>
                    <span className="text-muted-foreground">{scrapeResult.skipped} skipped</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border/20 bg-card p-3 space-y-1">
            <h4 className="text-[0.625rem] font-bold text-muted-foreground">Pipeline Flow</h4>
            <p className="text-[0.625rem] text-muted-foreground">Scraped entities auto-enqueue → SOURCE → CLASSIFY → CLEAN → NORMALIZE → REBUILD → ENRICH → SCORE → VALIDATE → PUBLISH</p>
          </div>
        </div>
      )}

      {/* ════ TAB: METRICS ════ */}
      {tab === "metrics" && (
        <div className="space-y-3">
          {/* Health summary */}
          {(() => {
            const summary = getPipelineHealthSummary();
            const color = summary.status === "healthy" ? "text-green-500" : summary.status === "degraded" ? "text-yellow-500" : "text-destructive";
            const border = summary.status === "healthy" ? "border-green-500/20 bg-green-500/5" : summary.status === "degraded" ? "border-yellow-500/20 bg-yellow-500/5" : "border-destructive/20 bg-destructive/5";
            return (
              <div className={`rounded-xl border p-3 ${border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">Pipeline Health</p>
                    <p className="text-[0.625rem] text-muted-foreground mt-0.5">{summary.message}</p>
                  </div>
                  <span className={`text-sm font-black ${color}`}>{summary.status.toUpperCase()}</span>
                </div>
                {summary.topErrorStage && (
                  <p className="text-[0.625rem] text-destructive mt-1">⚠ Highest error rate: <strong>{summary.topErrorStage}</strong></p>
                )}
              </div>
            );
          })()}

          {/* Global metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-border/20 bg-card p-3 text-center">
              <p className="text-lg font-bold text-primary">{metricsSnapshot.totalRuns}</p>
              <p className="text-[0.625rem] text-muted-foreground">Total Runs (1h)</p>
            </div>
            <div className="rounded-xl border border-border/20 bg-card p-3 text-center">
              <p className={`text-lg font-bold ${metricsSnapshot.overallErrorRate > 0.2 ? "text-destructive" : "text-green-500"}`}>
                {(metricsSnapshot.overallErrorRate * 100).toFixed(1)}%
              </p>
              <p className="text-[0.625rem] text-muted-foreground">Error Rate</p>
            </div>
            <div className="rounded-xl border border-border/20 bg-card p-3 text-center">
              <p className="text-lg font-bold text-blue-500">{metricsSnapshot.overallThroughput}</p>
              <p className="text-[0.625rem] text-muted-foreground">Items/min</p>
            </div>
          </div>

          {/* Per-stage metrics */}
          {metricsSnapshot.stages.length === 0 ? (
            <div className="rounded-xl border border-border/20 bg-card p-4 text-center">
              <p className="text-xs text-muted-foreground">No stage metrics yet — run the pipeline to populate metrics</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <h3 className="text-xs font-bold">Per-Stage Metrics (1h rolling window)</h3>
              {metricsSnapshot.stages
                .sort((a, b) => b.totalRuns - a.totalRuns)
                .map(stage => {
                  const errColor = stage.errorRate > 0.5 ? "text-destructive" : stage.errorRate > 0.2 ? "text-yellow-500" : "text-green-500";
                  const isError = stage.errorRate > 0.2;
                  return (
                    <div key={stage.stage} className={`rounded-xl border p-2.5 ${isError ? "border-yellow-500/20 bg-yellow-500/5" : "border-border/20 bg-card"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[0.6875rem] font-bold">{stage.stage}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[0.625rem] font-bold ${errColor}`}>{(stage.errorRate * 100).toFixed(0)}% err</span>
                          <span className="text-[0.625rem] text-muted-foreground">{stage.avgDurationMs}ms avg</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-[0.625rem] text-muted-foreground">
                        <span>Runs: <strong className="text-foreground">{stage.totalRuns}</strong></span>
                        <span>Processed: <strong className="text-foreground">{stage.totalProcessed}</strong></span>
                        <span>Throughput: <strong className="text-blue-500">{stage.throughputPerMin}/min</strong></span>
                      </div>
                      {/* Error rate bar */}
                      <div className="mt-1.5 h-1 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${stage.errorRate > 0.5 ? "bg-destructive" : stage.errorRate > 0.2 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${Math.min(100, stage.errorRate * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Event Replay Buffer (DLQ) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold">Event Replay Buffer (DLQ)</h3>
              <button onClick={loadReplayData} className="text-[0.625rem] text-muted-foreground px-2 py-1 rounded bg-muted">↻</button>
            </div>
            {replayStats && (
              <div className="grid grid-cols-5 gap-1">
                {([["Total", replayStats.total, "text-foreground"], ["Pending", replayStats.pending, "text-yellow-500"], ["Retrying", replayStats.retrying, "text-blue-500"], ["Dead", replayStats.dead, "text-destructive"], ["OK", replayStats.resolved, "text-green-500"]] as const).map(([label, val, cls]) => (
                  <div key={label} className="rounded-lg border border-border/20 bg-card p-2 text-center">
                    <p className={`text-sm font-bold ${cls}`}>{val}</p>
                    <p className="text-[0.5625rem] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            )}
            {replayEvents.length === 0 ? (
              <p className="text-[0.625rem] text-muted-foreground text-center py-2">No events in replay buffer</p>
            ) : (
              <div className="space-y-1">
                {replayEvents.slice(0, 10).map(ev => {
                  const statusColor = ev.status === "dead" ? "text-destructive" : ev.status === "resolved" ? "text-green-500" : ev.status === "retrying" ? "text-blue-500" : "text-yellow-500";
                  const canRetry = ev.status === "pending" || ev.status === "retrying";
                  return (
                    <div key={ev.id} className="rounded-lg border border-border/20 bg-card p-2 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.6875rem] font-mono font-bold truncate">{ev.eventType}</p>
                        <p className="text-[0.5625rem] text-muted-foreground">
                          Attempt {ev.retryCount}/{ev.maxRetries} · <span className={statusColor}>{ev.status}</span>
                          {ev.failureReason && <span className="text-destructive"> · {ev.failureReason.slice(0, 50)}</span>}
                        </p>
                      </div>
                      {canRetry && (
                        <button
                          onClick={() => handleRetry(ev.id)}
                          disabled={replayBusy === ev.id}
                          className="shrink-0 rounded px-2 py-1 text-[0.625rem] font-bold bg-primary text-primary-foreground disabled:opacity-50"
                        >{replayBusy === ev.id ? "…" : "Retry"}</button>
                      )}
                    </div>
                  );
                })}
                {replayEvents.length > 10 && (
                  <p className="text-[0.625rem] text-muted-foreground text-center">+ {replayEvents.length - 10} more events</p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={async () => { setMetricsSnapshot(getAllPipelineMetrics()); await loadReplayData(); }}
            className="w-full rounded-xl bg-muted text-muted-foreground py-2 text-xs font-bold"
          >↻ Refresh All</button>
        </div>
      )}

      {/* ════ TAB: ENGINES ════ */}
      {tab === "engines" && (
        <div className="space-y-2">
          <p className="text-[0.625rem] text-muted-foreground">{engineEntries.length} engines rationalized</p>
          {["source", "classify", "clean", "normalize", "rebuild", "enrich", "score", "validate", "publish", "distribute", "digital", "supervision"].map(stage => {
            const stageEngines = engineEntries.filter(([, v]) => v.stage === stage);
            if (stageEngines.length === 0) return null;
            return (
              <div key={stage} className="rounded-xl border border-border/20 bg-card p-3 space-y-1.5">
                <h3 className="text-[0.6875rem] font-bold uppercase text-primary">{stage}</h3>
                {stageEngines.map(([name, eng]) => (
                  <div key={name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${eng.status === "keep" ? "bg-green-500" : eng.status === "merge" ? "bg-yellow-500" : eng.status === "disable" ? "bg-destructive" : "bg-muted-foreground"}`} />
                      <span className="text-[0.625rem] font-medium">{name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold ${eng.status === "keep" ? "bg-green-500/10 text-green-600" : eng.status === "merge" ? "bg-yellow-500/10 text-yellow-600" : "bg-muted text-muted-foreground"}`}>{eng.status}</span>
                      <span className="text-[0.625rem] text-muted-foreground">{eng.layer}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </SubPageShell>
  );
}
