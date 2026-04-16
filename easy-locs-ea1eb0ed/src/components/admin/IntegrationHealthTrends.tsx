import { useState, useEffect, useCallback, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  fetchIntegrationHealthHistory,
  type HealthRange,
  type IntegrationHealthHistoryResponse,
} from "@/lib/api/integration-health";

const RANGES: { value: HealthRange; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
];

const SERVICE_COLORS: Record<string, string> = {
  plaid: "#3B82F6",
  livekit: "#8B5CF6",
  meilisearch: "#F59E0B",
};

const SERVICE_LABELS: Record<string, string> = {
  plaid: "Plaid",
  livekit: "LiveKit",
  meilisearch: "Meilisearch",
};

function formatTime(iso: string, range: HealthRange): string {
  const d = new Date(iso);
  if (range === "24h") return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (range === "7d") return d.toLocaleDateString([], { weekday: "short", hour: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface ChartPoint {
  time: string;
  plaid: number | null;
  livekit: number | null;
  meilisearch: number | null;
}

function buildLatencyData(data: IntegrationHealthHistoryResponse): ChartPoint[] {
  return data.points.map((p) => ({
    time: formatTime(p.checked_at, data.range),
    plaid: p.plaid_latency_ms,
    livekit: p.livekit_latency_ms,
    meilisearch: p.meilisearch_latency_ms,
  }));
}

interface IntegrationHealthTrendsProps {
  refreshToken?: number;
}

export default function IntegrationHealthTrends({ refreshToken }: IntegrationHealthTrendsProps) {
  const [range, setRange] = useState<HealthRange>("24h");
  const [data, setData] = useState<IntegrationHealthHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (r: HealthRange) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchIntegrationHealthHistory(r);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(range);
  }, [range, load, refreshToken]);

  const latencyData = useMemo(() => (data ? buildLatencyData(data) : []), [data]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card border border-border/20 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold">Health Trends</h2>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                  range === r.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 rounded-lg p-2 mb-3">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
            Loading trends...
          </div>
        )}

        {data && data.total === 0 && (
          <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
            No health data recorded yet. Data will appear after health checks run.
          </div>
        )}

        {data && data.total > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(["plaid", "livekit", "meilisearch"] as const).map((svc) => {
                const pct = data.uptime[svc];
                const color =
                  pct === null
                    ? "text-muted-foreground"
                    : pct >= 99
                    ? "text-green-400"
                    : pct >= 95
                    ? "text-yellow-400"
                    : "text-red-400";
                return (
                  <div key={svc} className="rounded-lg bg-muted/50 p-2 text-center">
                    <div className="text-xs text-muted-foreground">{SERVICE_LABELS[svc]}</div>
                    <div className={`text-lg font-bold font-mono ${color}`}>
                      {pct === null ? "N/A" : `${pct}%`}
                    </div>
                    <div className="text-[0.625rem] text-muted-foreground">uptime</div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-muted-foreground mb-2">Latency (ms)</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(0 0% 50%)" }}
                  width={40}
                  tickFormatter={(v: number) => `${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(226 24% 14%)",
                    border: "1px solid hsl(0 0% 20%)",
                    borderRadius: "8px",
                    fontSize: "0.75rem",
                  }}
                  labelStyle={{ color: "hsl(0 0% 70%)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "0.6875rem" }}
                />
                {(["plaid", "livekit", "meilisearch"] as const).map((svc) => (
                  <Line
                    key={svc}
                    type="monotone"
                    dataKey={svc}
                    name={SERVICE_LABELS[svc]}
                    stroke={SERVICE_COLORS[svc]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            <div className="text-[0.625rem] text-muted-foreground mt-2 text-right">
              {data.total} data points in selected range
            </div>
          </>
        )}
      </div>
    </div>
  );
}
