import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchIntegrationHealthHistory,
  type IntegrationHealthHistoryResponse,
  type HealthLogPoint,
} from "@/lib/api/integration-health";

const SERVICES = ["plaid", "livekit", "meilisearch"] as const;
type ServiceKey = (typeof SERVICES)[number];

const SERVICE_META: Record<ServiceKey, { label: string; color: string; statusKey: keyof HealthLogPoint }> = {
  plaid:       { label: "Plaid",       color: "#3B82F6", statusKey: "plaid_status" },
  livekit:     { label: "LiveKit",     color: "#8B5CF6", statusKey: "livekit_status" },
  meilisearch: { label: "Meilisearch", color: "#F59E0B", statusKey: "meilisearch_status" },
};

function buildUptimeSeries(points: HealthLogPoint[], svc: ServiceKey): number[] {
  const key = SERVICE_META[svc].statusKey;
  return points.map((p) => (p[key] === "ok" ? 1 : p[key] === "not_configured" ? -1 : 0));
}

function Sparkline({ data, color, width = 120, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length === 0) return null;

  const filtered = data.filter((v) => v >= 0);
  if (filtered.length === 0) return null;

  const bucketCount = Math.min(filtered.length, 48);
  const bucketSize = Math.max(1, Math.floor(filtered.length / bucketCount));
  const buckets: number[] = [];
  for (let i = 0; i < filtered.length; i += bucketSize) {
    const slice = filtered.slice(i, i + bucketSize);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    buckets.push(avg * 100);
  }

  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const step = buckets.length > 1 ? innerW / (buckets.length - 1) : 0;

  const pathPoints = buckets.map((v, i) => {
    const x = padding + i * step;
    const y = padding + innerH - (v / 100) * innerH;
    return `${x},${y}`;
  });

  const linePath = `M${pathPoints.join(" L")}`;
  const areaPath = `${linePath} L${padding + (buckets.length - 1) * step},${height} L${padding},${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <defs>
        <linearGradient id={`spark-grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-grad-${color.replace("#", "")})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

interface IntegrationUptimeSparklinesProps {
  refreshToken?: number;
}

export default function IntegrationUptimeSparklines({ refreshToken }: IntegrationUptimeSparklinesProps) {
  const [data, setData] = useState<IntegrationHealthHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchIntegrationHealthHistory("24h");
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const seriesMap = useMemo(() => {
    if (!data) return null;
    return Object.fromEntries(
      SERVICES.map((svc) => [svc, buildUptimeSeries(data.points, svc)])
    ) as Record<ServiceKey, number[]>;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="h-16 flex items-center justify-center text-[10px] text-muted-foreground">
          Loading uptime…
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-3">
        <div className="text-[10px] text-red-400 bg-red-500/10 rounded-lg p-2">
          {error}
        </div>
      </div>
    );
  }

  if (!data || data.total === 0 || !seriesMap) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-sm font-bold text-foreground">📡 Integration Uptime (24h)</span>
        {error && data && (
          <span className="text-[10px] text-red-400 bg-red-500/10 rounded px-1.5 py-0.5">stale</span>
        )}
      </div>
      <div className="divide-y divide-border/10">
        {SERVICES.map((svc) => {
          const series = seriesMap[svc];
          const configured = series.filter((v) => v >= 0);
          const isNotConfigured = configured.length === 0;
          const uptimePct = data.uptime[svc];
          const meta = SERVICE_META[svc];

          const pctColor =
            uptimePct === null || isNotConfigured
              ? "text-muted-foreground"
              : uptimePct >= 99
              ? "text-emerald-400"
              : uptimePct >= 95
              ? "text-amber-400"
              : "text-red-400";

          const dotColor =
            uptimePct === null || isNotConfigured
              ? "bg-muted-foreground/40"
              : uptimePct >= 99
              ? "bg-emerald-500"
              : uptimePct >= 95
              ? "bg-amber-500"
              : "bg-red-500";

          return (
            <div key={svc} className="flex items-center gap-3 px-4 py-2">
              <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
              <div className="w-20 shrink-0">
                <p className="text-xs font-semibold text-foreground">{meta.label}</p>
                <p className={`text-[10px] font-mono font-bold ${pctColor}`}>
                  {isNotConfigured ? "N/C" : uptimePct === null ? "N/A" : `${uptimePct}%`}
                </p>
              </div>
              <div className="flex-1 flex justify-end">
                {isNotConfigured ? (
                  <span className="text-[10px] text-muted-foreground/50">not configured</span>
                ) : (
                  <Sparkline data={series} color={meta.color} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
