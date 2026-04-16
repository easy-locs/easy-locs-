import { useState, useEffect, useCallback, useRef } from "react";
import { useVisibilityAwareInterval } from "@/hooks/useVisibilityAwareInterval";
import { db } from "@/services/db";
import { structuredLogger } from "@/lib/observability/structured-logger";

interface SlowQuery {
  id: number;
  query_text: string;
  calls: number;
  mean_exec_time_ms: number;
  max_exec_time_ms: number;
  rows_returned: number;
  snapshot_at: string;
}

interface EdgeFunctionMetric {
  function_name: string;
  total_calls: number;
  avg_ms: number;
  p95_ms: number;
  p99_ms: number;
  max_ms: number;
  cache_hits: number;
  cache_hit_pct: number;
  error_count: number;
  last_call: string;
}

interface SearchAnalyticEntry {
  query_text: string;
  search_count: number;
  last_searched_at: string;
}

interface ApmData {
  slowQueries: SlowQuery[];
  edgeMetrics: EdgeFunctionMetric[];
  searchAnalytics: SearchAnalyticEntry[];
  sentryErrors: SentryErrorSummary[];
  clientLogs: ClientLogSummary[];
}

interface SentryErrorSummary {
  domain: string;
  action: string;
  message: string;
  level: string;
  count: number;
}

interface ClientLogSummary {
  domain: string;
  total: number;
  errors: number;
  warnings: number;
}

function ApmDashboard() {
  const [data, setData] = useState<ApmData>({
    slowQueries: [],
    edgeMetrics: [],
    searchAnalytics: [],
    sentryErrors: [],
    clientLogs: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "queries" | "edge" | "search" | "logs">("overview");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [slowQueryResult, edgeMetricResult, searchResult] = await Promise.allSettled([
        db.from("admin_slow_query_log")
          .select("id, query_text, calls, mean_exec_time_ms, max_exec_time_ms, rows_returned, snapshot_at")
          .order("mean_exec_time_ms", { ascending: false })
          .limit(50),
        db.from("edge_function_metrics")
          .select("function_name, duration_ms, status_code, cache_hit, recorded_at")
          .order("recorded_at", { ascending: false })
          .limit(500),
        db.from("search_analytics")
          .select("query_text, search_count, last_searched_at")
          .order("search_count", { ascending: false })
          .limit(50),
      ]);

      const slowQueries = slowQueryResult.status === "fulfilled"
        ? (slowQueryResult.value.data ?? []) as SlowQuery[]
        : [];

      const rawEdgeMetrics = edgeMetricResult.status === "fulfilled"
        ? (edgeMetricResult.value.data ?? []) as Array<{
            function_name: string;
            duration_ms: number;
            status_code: number;
            cache_hit: boolean;
            recorded_at: string;
          }>
        : [];

      const edgeMetricsMap = new Map<string, {
        calls: number;
        totalMs: number;
        durations: number[];
        cacheHits: number;
        errors: number;
        lastCall: string;
      }>();

      for (const m of rawEdgeMetrics) {
        const existing = edgeMetricsMap.get(m.function_name) || {
          calls: 0,
          totalMs: 0,
          durations: [],
          cacheHits: 0,
          errors: 0,
          lastCall: "",
        };
        existing.calls++;
        existing.totalMs += m.duration_ms;
        existing.durations.push(m.duration_ms);
        if (m.cache_hit) existing.cacheHits++;
        if (m.status_code >= 500) existing.errors++;
        if (m.recorded_at && m.recorded_at > existing.lastCall) {
          existing.lastCall = m.recorded_at;
        }
        edgeMetricsMap.set(m.function_name, existing);
      }

      const edgeMetrics: EdgeFunctionMetric[] = Array.from(edgeMetricsMap.entries()).map(([name, stats]) => {
        const sorted = stats.durations.sort((a, b) => a - b);
        const p95Index = Math.floor(sorted.length * 0.95);
        const p99Index = Math.floor(sorted.length * 0.99);
        return {
          function_name: name,
          total_calls: stats.calls,
          avg_ms: Math.round((stats.totalMs / stats.calls) * 100) / 100,
          p95_ms: sorted[p95Index] || 0,
          p99_ms: sorted[p99Index] || 0,
          max_ms: Math.max(...stats.durations),
          cache_hits: stats.cacheHits,
          cache_hit_pct: stats.calls > 0 ? Math.round((stats.cacheHits / stats.calls) * 1000) / 10 : 0,
          error_count: stats.errors,
          last_call: stats.lastCall,
        };
      });

      const searchAnalytics = searchResult.status === "fulfilled"
        ? (searchResult.value.data ?? []) as SearchAnalyticEntry[]
        : [];

      const logBuffer = structuredLogger.getBuffer();
      const domainMap = new Map<string, { total: number; errors: number; warnings: number }>();
      for (const entry of logBuffer) {
        const existing = domainMap.get(entry.domain) || { total: 0, errors: 0, warnings: 0 };
        existing.total++;
        if (entry.level === "error" || entry.level === "critical") existing.errors++;
        if (entry.level === "warn") existing.warnings++;
        domainMap.set(entry.domain, existing);
      }

      const clientLogs: ClientLogSummary[] = Array.from(domainMap.entries())
        .map(([domain, stats]) => ({ domain, ...stats }))
        .sort((a, b) => b.errors - a.errors);

      const errorEntries = logBuffer.filter(e => e.level === "error" || e.level === "critical");
      const errorMap = new Map<string, SentryErrorSummary>();
      for (const entry of errorEntries) {
        const key = `${entry.domain}:${entry.action}`;
        const existing = errorMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          errorMap.set(key, {
            domain: entry.domain,
            action: entry.action,
            message: entry.message,
            level: entry.level,
            count: 1,
          });
        }
      }
      const sentryErrors = Array.from(errorMap.values()).sort((a, b) => b.count - a.count);

      setData({ slowQueries, edgeMetrics, searchAnalytics, sentryErrors, clientLogs });
      setLastRefresh(new Date());
    } catch (err) {
      console.error("[ApmDashboard] fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useVisibilityAwareInterval(fetchData, 60);

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "queries" as const, label: "Slow Queries" },
    { id: "edge" as const, label: "Edge Functions" },
    { id: "search" as const, label: "Search" },
    { id: "logs" as const, label: "Client Logs" },
  ];

  return (
    <div style={{ padding: "1.5rem", fontFamily: "system-ui, sans-serif", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>APM Dashboard</h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#666" }}>
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            style={{ padding: "0.4rem 0.8rem", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer", fontSize: "0.85rem" }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid #eee", paddingBottom: "0.5rem" }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: activeTab === tab.id ? 600 : 400,
              background: activeTab === tab.id ? "#2563eb" : "transparent",
              color: activeTab === tab.id ? "#fff" : "#333",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>Loading metrics...</div>
      ) : (
        <>
          {activeTab === "overview" && <OverviewTab data={data} />}
          {activeTab === "queries" && <SlowQueriesTab queries={data.slowQueries} />}
          {activeTab === "edge" && <EdgeFunctionsTab metrics={data.edgeMetrics} />}
          {activeTab === "search" && <SearchTab analytics={data.searchAnalytics} />}
          {activeTab === "logs" && <ClientLogsTab logs={data.clientLogs} errors={data.sentryErrors} />}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div style={{ background: "#f9fafb", borderRadius: 8, padding: "1rem", border: "1px solid #e5e7eb" }}>
      <div style={{ fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: color || "#111", marginTop: "0.25rem" }}>
        {value}{unit && <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "#6b7280" }}> {unit}</span>}
      </div>
    </div>
  );
}

function OverviewTab({ data }: { data: ApmData }) {
  const totalErrors = data.sentryErrors.reduce((sum, e) => sum + e.count, 0);
  const avgLatency = data.edgeMetrics.length > 0
    ? Math.round(data.edgeMetrics.reduce((sum, m) => sum + m.avg_ms, 0) / data.edgeMetrics.length)
    : 0;
  const cacheHitRate = data.edgeMetrics.length > 0
    ? Math.round(data.edgeMetrics.reduce((sum, m) => sum + m.cache_hit_pct, 0) / data.edgeMetrics.length * 10) / 10
    : 0;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <MetricCard label="Slow Queries (24h)" value={data.slowQueries.length} color={data.slowQueries.length > 10 ? "#dc2626" : "#059669"} />
        <MetricCard label="Edge Functions" value={data.edgeMetrics.length} />
        <MetricCard label="Avg Latency" value={avgLatency} unit="ms" color={avgLatency > 100 ? "#dc2626" : "#059669"} />
        <MetricCard label="Cache Hit Rate" value={`${cacheHitRate}%`} color={cacheHitRate > 50 ? "#059669" : "#d97706"} />
        <MetricCard label="Client Errors" value={totalErrors} color={totalErrors > 0 ? "#dc2626" : "#059669"} />
        <MetricCard label="Top Searches" value={data.searchAnalytics.length} />
      </div>

      {data.sentryErrors.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem" }}>Recent Errors</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Domain</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Action</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Message</th>
                <th style={{ textAlign: "right", padding: "0.5rem" }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {data.sentryErrors.slice(0, 10).map((e, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.5rem", color: "#dc2626", fontWeight: 500 }}>{e.domain}</td>
                  <td style={{ padding: "0.5rem" }}>{e.action}</td>
                  <td style={{ padding: "0.5rem", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message}</td>
                  <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: 600 }}>{e.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SlowQueriesTab({ queries }: { queries: SlowQuery[] }) {
  return (
    <div>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        Slow Queries ({queries.length})
      </h3>
      {queries.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No slow queries captured in the last 24 hours.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Query</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Calls</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Avg (ms)</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Max (ms)</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Rows</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Snapshot</th>
            </tr>
          </thead>
          <tbody>
            {queries.map((q) => (
              <tr key={q.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "0.5rem", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", fontSize: "0.75rem" }}>
                  {q.query_text.slice(0, 120)}
                </td>
                <td style={{ padding: "0.5rem", textAlign: "right" }}>{q.calls}</td>
                <td style={{ padding: "0.5rem", textAlign: "right", color: q.mean_exec_time_ms > 1000 ? "#dc2626" : "#333", fontWeight: q.mean_exec_time_ms > 1000 ? 600 : 400 }}>
                  {q.mean_exec_time_ms.toFixed(1)}
                </td>
                <td style={{ padding: "0.5rem", textAlign: "right" }}>{q.max_exec_time_ms.toFixed(1)}</td>
                <td style={{ padding: "0.5rem", textAlign: "right" }}>{q.rows_returned}</td>
                <td style={{ padding: "0.5rem", textAlign: "right", fontSize: "0.75rem", color: "#6b7280" }}>
                  {new Date(q.snapshot_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function EdgeFunctionsTab({ metrics }: { metrics: EdgeFunctionMetric[] }) {
  return (
    <div>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        Edge Function Performance ({metrics.length} functions)
      </h3>
      {metrics.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No edge function metrics collected yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Function</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Calls</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Avg (ms)</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>p95 (ms)</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>p99 (ms)</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Cache %</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Errors</th>
            </tr>
          </thead>
          <tbody>
            {metrics.sort((a, b) => b.total_calls - a.total_calls).map((m) => (
              <tr key={m.function_name} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "0.5rem", fontFamily: "monospace", fontSize: "0.75rem" }}>{m.function_name}</td>
                <td style={{ padding: "0.5rem", textAlign: "right" }}>{m.total_calls}</td>
                <td style={{ padding: "0.5rem", textAlign: "right", color: m.avg_ms > 100 ? "#d97706" : "#059669" }}>{m.avg_ms}</td>
                <td style={{ padding: "0.5rem", textAlign: "right", color: m.p95_ms > 100 ? "#dc2626" : "#333" }}>{m.p95_ms}</td>
                <td style={{ padding: "0.5rem", textAlign: "right" }}>{m.p99_ms}</td>
                <td style={{ padding: "0.5rem", textAlign: "right", color: m.cache_hit_pct > 50 ? "#059669" : "#6b7280" }}>{m.cache_hit_pct}%</td>
                <td style={{ padding: "0.5rem", textAlign: "right", color: m.error_count > 0 ? "#dc2626" : "#059669", fontWeight: m.error_count > 0 ? 600 : 400 }}>
                  {m.error_count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SearchTab({ analytics }: { analytics: SearchAnalyticEntry[] }) {
  return (
    <div>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        Popular Searches ({analytics.length})
      </h3>
      {analytics.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No search analytics data yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Query</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Count</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Last Searched</th>
            </tr>
          </thead>
          <tbody>
            {analytics.map((a, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "0.5rem", fontWeight: 500 }}>{a.query_text}</td>
                <td style={{ padding: "0.5rem", textAlign: "right" }}>{a.search_count}</td>
                <td style={{ padding: "0.5rem", textAlign: "right", fontSize: "0.8rem", color: "#6b7280" }}>
                  {new Date(a.last_searched_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ClientLogsTab({ logs, errors }: { logs: ClientLogSummary[]; errors: SentryErrorSummary[] }) {
  return (
    <div>
      <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Client Log Summary by Domain</h3>
      {logs.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No client logs in current session.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Domain</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Total</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Errors</th>
              <th style={{ textAlign: "right", padding: "0.5rem" }}>Warnings</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.domain} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "0.5rem", fontWeight: 500 }}>{l.domain}</td>
                <td style={{ padding: "0.5rem", textAlign: "right" }}>{l.total}</td>
                <td style={{ padding: "0.5rem", textAlign: "right", color: l.errors > 0 ? "#dc2626" : "#059669" }}>{l.errors}</td>
                <td style={{ padding: "0.5rem", textAlign: "right", color: l.warnings > 0 ? "#d97706" : "#059669" }}>{l.warnings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {errors.length > 0 && (
        <>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>Error Breakdown</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Domain</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Action</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Message</th>
                <th style={{ textAlign: "right", padding: "0.5rem" }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((e, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.5rem", color: "#dc2626" }}>{e.domain}</td>
                  <td style={{ padding: "0.5rem" }}>{e.action}</td>
                  <td style={{ padding: "0.5rem", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.message}</td>
                  <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: 600 }}>{e.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default ApmDashboard;
