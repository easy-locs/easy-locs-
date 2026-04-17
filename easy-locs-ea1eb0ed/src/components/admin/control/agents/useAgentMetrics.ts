/**
 * useAgentMetrics — bulk per-agent metric series for the cockpit's
 * sparkline cells. We batch-fetch the last 24h of `execution_tasks`
 * once for every visible agent, then derive three small series per
 * agent (runs / latency p50 / errors) bucketed by hour.
 *
 * One query for N agents instead of N queries — the cockpit must
 * scale to 100+ rows without spamming Supabase.
 */
import { useQuery } from "@tanstack/react-query";
import { domainDb } from "@/services/db";

export interface AgentSeries {
  runs: number[];
  latency: number[];
  errors: number[];
  totalRuns: number;
  totalErrors: number;
  errorRate: number;
  p50LatencyMs: number | null;
}

const BUCKET_COUNT = 24;
const BUCKET_MS = 60 * 60 * 1000;
const EMPTY_SERIES: AgentSeries = {
  runs: new Array(BUCKET_COUNT).fill(0),
  latency: new Array(BUCKET_COUNT).fill(0),
  errors: new Array(BUCKET_COUNT).fill(0),
  totalRuns: 0,
  totalErrors: 0,
  errorRate: 0,
  p50LatencyMs: null,
};

interface RawRow {
  agent_id: string | null;
  status: string | null;
  latency_ms: number | null;
  created_at: string;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export function useAgentMetrics(agentIds: string[]) {
  const key = [...agentIds].sort().join(",");
  return useQuery({
    queryKey: ["admin-agents", "metrics", key],
    enabled: agentIds.length > 0,
    refetchInterval: 60_000,
    queryFn: async (): Promise<Map<string, AgentSeries>> => {
      const since = new Date(Date.now() - BUCKET_COUNT * BUCKET_MS).toISOString();
      const { data, error } = await domainDb.system
        .from("execution_tasks")
        .select("agent_id, status, latency_ms, created_at")
        .in("agent_id", agentIds)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw new Error(`agent metrics: ${error.message}`);

      const now = Date.now();
      const result = new Map<string, AgentSeries>();
      const latencyBuckets = new Map<string, number[][]>();

      for (const r of (data ?? []) as RawRow[]) {
        if (!r.agent_id) continue;
        if (!result.has(r.agent_id)) {
          result.set(r.agent_id, {
            runs: new Array(BUCKET_COUNT).fill(0),
            latency: new Array(BUCKET_COUNT).fill(0),
            errors: new Array(BUCKET_COUNT).fill(0),
            totalRuns: 0,
            totalErrors: 0,
            errorRate: 0,
            p50LatencyMs: null,
          });
          latencyBuckets.set(
            r.agent_id,
            Array.from({ length: BUCKET_COUNT }, () => []),
          );
        }
        const series = result.get(r.agent_id)!;
        const buckets = latencyBuckets.get(r.agent_id)!;
        const ageMs = now - new Date(r.created_at).getTime();
        const idx = BUCKET_COUNT - 1 - Math.floor(ageMs / BUCKET_MS);
        if (idx < 0 || idx >= BUCKET_COUNT) continue;
        series.runs[idx] += 1;
        series.totalRuns += 1;
        if (r.status === "failed" || r.status === "blocked" || r.status === "rejected") {
          series.errors[idx] += 1;
          series.totalErrors += 1;
        }
        if (typeof r.latency_ms === "number" && r.latency_ms > 0) {
          buckets[idx].push(r.latency_ms);
        }
      }

      for (const [id, series] of result.entries()) {
        const buckets = latencyBuckets.get(id)!;
        for (let i = 0; i < BUCKET_COUNT; i++) {
          series.latency[i] = median(buckets[i]) ?? 0;
        }
        const allLat = buckets.flat();
        series.p50LatencyMs = median(allLat);
        series.errorRate =
          series.totalRuns > 0 ? series.totalErrors / series.totalRuns : 0;
      }

      return result;
    },
    select: (data) => data,
  });
}

export function emptySeries(): AgentSeries {
  return EMPTY_SERIES;
}
