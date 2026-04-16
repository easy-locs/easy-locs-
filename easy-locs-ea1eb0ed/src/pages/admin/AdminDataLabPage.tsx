import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import { db } from "@/services/db";

const PIPELINE_STAGES = [
  { key: "source", label: "Source", description: "Data ingestion from external APIs and feeds" },
  { key: "classify", label: "Classify", description: "Entity type classification and routing" },
  { key: "clean", label: "Clean", description: "Data sanitization and deduplication" },
  { key: "normalize", label: "Normalize", description: "Schema normalization and field mapping" },
  { key: "rebuild", label: "Rebuild", description: "Entity graph reconstruction" },
  { key: "enrich", label: "Enrich", description: "Third-party data enrichment" },
  { key: "score", label: "Score", description: "Quality scoring and confidence ranking" },
  { key: "validate", label: "Validate", description: "Business rule validation" },
  { key: "publish", label: "Publish", description: "Entity publication to read replicas" },
  { key: "distribute", label: "Distribute", description: "Fan-out to downstream consumers" },
  { key: "archive", label: "Archive", description: "Cold storage and lifecycle transition" },
] as const;

interface StageMetrics {
  stage: string;
  description: string;
  entityCount: number;
  successRate: number;
  avgProcessingMs: number;
  failedCount: number;
  throughputPerMin: number;
}

interface AnomalyWindow {
  id: string;
  window_key: string;
  error_velocity: number;
  latency_p99: number;
  retry_storm_detected: boolean;
  created_at: string;
}

interface ObservabilityMetric {
  id: string;
  metric_type: string;
  metric_value: number;
  created_at: string;
}

async function loadAnomalyWindows(): Promise<AnomalyWindow[]> {
  try {
    const { data } = await db
      .from("anomaly_detection_windows")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    return (data as unknown as AnomalyWindow[]) || [];
  } catch {
    return [];
  }
}

async function loadObservabilityMetrics(): Promise<ObservabilityMetric[]> {
  try {
    const { data } = await db
      .from("db_observability_metrics")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    return (data as unknown as ObservabilityMetric[]) || [];
  } catch {
    return [];
  }
}

function getStatusColor(rate: number): string {
  if (rate >= 95) return "bg-green-500";
  if (rate >= 80) return "bg-yellow-500";
  return "bg-red-500";
}

export default function AdminDataLabPage() {
  useUiEngine("admin-data-lab");
  const navigate = useNavigate();
  const [anomalies, setAnomalies] = useState<AnomalyWindow[]>([]);
  const [metrics, setMetrics] = useState<ObservabilityMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pipeline" | "lifecycle" | "anomalies" | "observability">("pipeline");
  const [traceEntityId, setTraceEntityId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    const [anomalyData, metricData] = await Promise.all([
      loadAnomalyWindows(),
      loadObservabilityMetrics(),
    ]);
    setAnomalies(anomalyData);
    setMetrics(metricData);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pipelineStages: StageMetrics[] = PIPELINE_STAGES.map((stageDef) => {
    const stageAnomalies = anomalies.filter((a) => a.window_key.includes(stageDef.key));
    const stageMetrics = metrics.filter((m) => m.metric_type.includes(stageDef.key));
    const hasIssues = stageAnomalies.some((a) => a.retry_storm_detected || a.error_velocity > 5);
    const errorCount = stageAnomalies.filter((a) => a.error_velocity > 0).length;
    const totalWindows = stageAnomalies.length || 1;
    const successRate = totalWindows > 0 ? Math.round(((totalWindows - errorCount) / totalWindows) * 100) : (hasIssues ? 85 : 100);
    const entityCount = stageMetrics.reduce((sum, m) => sum + Math.round(m.metric_value), 0);
    const avgLatency = stageAnomalies.length > 0
      ? stageAnomalies.reduce((sum, a) => sum + a.latency_p99, 0) / stageAnomalies.length
      : 0;
    const throughput = stageMetrics.length > 0
      ? stageMetrics.reduce((sum, m) => sum + m.metric_value, 0) / Math.max(1, stageMetrics.length)
      : 0;

    return {
      stage: stageDef.label,
      description: stageDef.description,
      entityCount,
      successRate,
      avgProcessingMs: avgLatency,
      failedCount: errorCount,
      throughputPerMin: Math.round(throughput * 10) / 10,
    };
  });

  const retryStorms = anomalies.filter((a) => a.retry_storm_detected);
  const highErrorVelocity = anomalies.filter((a) => a.error_velocity > 5);

  return (
    <SubPageShell>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/lab-hub")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
          <div>
            <h1 className="text-lg font-bold">Data Lab</h1>
            <p className="text-xs text-muted-foreground">Pipeline monitoring, anomaly detection, observability</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{anomalies.length}</div>
            <div className="text-xs text-muted-foreground">Windows</div>
          </div>
          <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
            <div className={`text-2xl font-bold ${retryStorms.length > 0 ? "text-red-400" : "text-green-400"}`}>
              {retryStorms.length}
            </div>
            <div className="text-xs text-muted-foreground">Retry Storms</div>
          </div>
          <div className="rounded-xl bg-card border border-border/20 p-3 text-center">
            <div className={`text-2xl font-bold ${highErrorVelocity.length > 0 ? "text-yellow-400" : "text-green-400"}`}>
              {highErrorVelocity.length}
            </div>
            <div className="text-xs text-muted-foreground">High Error</div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {(["pipeline", "lifecycle", "anomalies", "observability"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {t === "pipeline" ? "Pipeline" : t === "lifecycle" ? "Lifecycle" : t === "anomalies" ? "Anomalies" : "Observability"}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center text-sm text-muted-foreground py-8">Loading pipeline data...</div>
        )}

        {!loading && tab === "pipeline" && (
          <div className="space-y-2">
            {pipelineStages.map((s, i) => (
              <div key={s.stage} className="rounded-xl bg-card border border-border/20 p-3">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <span className="text-sm font-bold">{s.stage}</span>
                  </div>
                  <span className={`text-xs ${s.failedCount > 0 ? "text-red-400" : "text-green-400"}`}>
                    {s.failedCount > 0 ? `${s.failedCount} issues` : "OK"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mb-1">{s.description}</div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${getStatusColor(s.successRate)}`} style={{ width: `${s.successRate}%` }} />
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2 text-xs text-muted-foreground">
                  <div>
                    <div className="font-bold text-foreground">{s.entityCount.toLocaleString()}</div>
                    <div>entities</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{s.successRate}%</div>
                    <div>success</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{s.avgProcessingMs > 0 ? `${Math.round(s.avgProcessingMs)}ms` : "—"}</div>
                    <div>p99 lat</div>
                  </div>
                  <div>
                    <div className="font-bold text-foreground">{s.throughputPerMin > 0 ? `${s.throughputPerMin}/m` : "—"}</div>
                    <div>throughput</div>
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-xl bg-card border border-border/20 p-3">
              <h3 className="text-sm font-bold mb-2">Stage Flow</h3>
              <div className="flex items-center gap-1 overflow-x-auto">
                {pipelineStages.map((s, i) => (
                  <div key={s.stage} className="flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.625rem] font-bold text-white ${getStatusColor(s.successRate)}`}
                      title={`${s.stage}: ${s.failedCount} issues`}
                    >
                      {i + 1}
                    </div>
                    {i < pipelineStages.length - 1 && <div className="w-3 h-0.5 bg-muted-foreground/30" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && tab === "lifecycle" && (
          <div className="space-y-3">
            <div className="rounded-xl bg-card border border-border/20 p-4">
              <h3 className="text-sm font-bold mb-2">Entity Lifecycle Trace</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Trace a single entity through every pipeline stage — from raw intake to canonical publication.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={traceEntityId}
                  onChange={(e) => setTraceEntityId(e.target.value)}
                  placeholder="Enter entity ID (e.g., prop_abc123)"
                  className="flex-1 rounded-lg bg-muted border border-border/20 px-3 py-2 text-xs"
                />
                <button
                  onClick={() => refresh()}
                  disabled={!traceEntityId.trim()}
                  className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-bold disabled:opacity-50"
                >
                  Trace
                </button>
              </div>
            </div>

            {traceEntityId.trim() && (
              <div className="space-y-1">
                {PIPELINE_STAGES.map((stage, i) => {
                  const stageAnomalies = anomalies.filter((a) =>
                    a.window_key.includes(stage.key) && a.window_key.includes(traceEntityId.trim().slice(0, 8))
                  );
                  const hasError = stageAnomalies.some((a) => a.error_velocity > 0);
                  const latency = stageAnomalies.length > 0 ? stageAnomalies[0].latency_p99 : null;
                  const stageStatus = hasError ? "error" : stageAnomalies.length > 0 ? "processed" : "pending";

                  return (
                    <div key={stage.key} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.625rem] font-bold text-white ${
                          stageStatus === "error" ? "bg-red-500" : stageStatus === "processed" ? "bg-green-500" : "bg-muted-foreground/30"
                        }`}>
                          {i + 1}
                        </div>
                        {i < PIPELINE_STAGES.length - 1 && (
                          <div className={`w-0.5 h-8 ${stageStatus === "processed" ? "bg-green-500/30" : "bg-muted-foreground/20"}`} />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold">{stage.label}</span>
                          <span className={`text-xs ${
                            stageStatus === "error" ? "text-red-400" : stageStatus === "processed" ? "text-green-400" : "text-muted-foreground"
                          }`}>
                            {stageStatus === "error" ? "Error" : stageStatus === "processed" ? "Processed" : "Awaiting data"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">{stage.description}</div>
                        {latency !== null && (
                          <div className="text-xs text-muted-foreground mt-0.5">Latency: {Math.round(latency)}ms</div>
                        )}
                        {hasError && stageAnomalies[0] && (
                          <div className="text-xs text-red-400 mt-0.5">
                            Error velocity: {stageAnomalies[0].error_velocity.toFixed(2)}/s
                            {stageAnomalies[0].retry_storm_detected && " — Retry storm detected"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!traceEntityId.trim() && (
              <div className="text-center text-xs text-muted-foreground py-4">
                Enter an entity ID above to trace its journey through the pipeline stages.
                The trace cross-references anomaly detection windows to show processing status per stage.
              </div>
            )}
          </div>
        )}

        {!loading && tab === "anomalies" && (
          <div className="space-y-2">
            {anomalies.length === 0 ? (
              <div className="text-center text-sm text-green-400 py-8">
                No anomaly windows recorded. The repair pipeline monitors for error velocity spikes and retry storms automatically.
              </div>
            ) : (
              anomalies.map((a) => (
                <div key={a.id} className={`rounded-xl border p-3 ${a.retry_storm_detected ? "bg-red-500/5 border-red-500/20" : "bg-card border-border/20"}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold font-mono">{a.window_key}</span>
                    {a.retry_storm_detected && <span className="text-xs text-red-400 font-bold">RETRY STORM</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Error Velocity</span>
                      <div className={a.error_velocity > 5 ? "text-red-400" : "text-foreground"}>{a.error_velocity.toFixed(2)}/s</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">p99 Latency</span>
                      <div>{Math.round(a.latency_p99)}ms</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleString()}</div>
                </div>
              ))
            )}
          </div>
        )}

        {!loading && tab === "observability" && (
          <div className="space-y-2">
            {metrics.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No observability metrics recorded yet. The db_observability_metrics table collects infrastructure health data.
              </div>
            ) : (
              metrics.map((m) => (
                <div key={m.id} className="rounded-xl bg-card border border-border/20 p-3 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-bold">{m.metric_type}</div>
                    <div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-sm font-bold font-mono">{m.metric_value.toFixed(2)}</div>
                </div>
              ))
            )}
          </div>
        )}

        <button onClick={refresh} className="w-full rounded-xl bg-muted text-muted-foreground py-2 text-xs font-bold">
          Refresh Data
        </button>
      </div>
    </SubPageShell>
  );
}
