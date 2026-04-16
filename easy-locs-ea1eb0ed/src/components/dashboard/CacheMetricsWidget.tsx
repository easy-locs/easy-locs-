import { memo } from "react";
import { motion } from "framer-motion";
import {
  Database,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRightLeft,
  Timer,
  HardDrive,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useCacheMetrics, type CacheMetricsSnapshot } from "@/hooks/useCacheMetrics";

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMin}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatTtl(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  return `${minutes}m`;
}

type TrendDirection = "up" | "down" | "flat";

function getTrend(current: number, previous: number | undefined): TrendDirection {
  if (previous === undefined) return "flat";
  if (current > previous) return "up";
  if (current < previous) return "down";
  return "flat";
}

function TrendIcon({ direction, higherIsGood }: { direction: TrendDirection; higherIsGood: boolean }) {
  if (direction === "flat") return <Minus className="h-3 w-3 text-muted-foreground" />;

  const isPositiveChange = (direction === "up" && higherIsGood) || (direction === "down" && !higherIsGood);
  const colorClass = isPositiveChange ? "text-green-500" : "text-red-500";

  if (direction === "up") {
    return <TrendingUp className={`h-3 w-3 ${colorClass}`} />;
  }
  return <TrendingDown className={`h-3 w-3 ${colorClass}`} />;
}

function hitRateColor(rate: number): string {
  if (rate >= 80) return "text-green-500";
  if (rate >= 50) return "text-yellow-500";
  return "text-red-500";
}

function hitRateBgColor(rate: number): string {
  if (rate >= 80) return "bg-green-500";
  if (rate >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

interface KpiCardProps {
  icon: typeof Database;
  label: string;
  value: string | number;
  trend?: TrendDirection;
  higherIsGood: boolean;
  color: string;
}

function KpiCard({ icon: Icon, label, value, trend, higherIsGood, color }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1.5 ${color}`} />
      <div className="flex items-center justify-center gap-1">
        <p className="text-lg font-bold text-foreground">{value}</p>
        {trend && <TrendIcon direction={trend} higherIsGood={higherIsGood} />}
      </div>
      <p className="text-[0.625rem] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function CapacityBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const barColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Cache Capacity</span>
        <span className="font-semibold text-foreground">
          {current} / {max}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`${barColor} rounded-full h-2 transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[0.625rem] text-muted-foreground">
        <span>{pct.toFixed(1)}% used</span>
        <span>Max {max} entries</span>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-foreground">{value}</span>
        {subValue && (
          <span className="text-[0.625rem] text-muted-foreground ml-1.5">{subValue}</span>
        )}
      </div>
    </div>
  );
}

const CacheMetricsWidget = memo(function CacheMetricsWidget() {
  const { metrics, previousMetrics, loading, error, lastFetchedAt, refresh } = useCacheMetrics();

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <RefreshCw className="h-5 w-5 animate-spin mr-2" />
        Loading cache metrics…
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mb-2 text-destructive/50" />
        <p className="text-sm font-medium text-destructive">{error}</p>
        <button
          onClick={refresh}
          className="mt-3 text-xs font-medium text-accent hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  const prev: Partial<CacheMetricsSnapshot> = previousMetrics ?? {};
  const hitRateTrend = getTrend(metrics.hitRate, prev.hitRate);
  const totalRequests = metrics.hits + metrics.misses;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent" />
          <h2 className="font-semibold text-foreground">Article Cache Metrics</h2>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${hitRateColor(metrics.hitRate)} ${
              metrics.hitRate >= 80
                ? "bg-green-500/10"
                : metrics.hitRate >= 50
                  ? "bg-yellow-500/10"
                  : "bg-red-500/10"
            }`}
          >
            {metrics.hitRate}% hit rate
          </span>
        </div>
        <div className="flex items-center gap-2">
          {lastFetchedAt && (
            <span className="text-[0.625rem] text-muted-foreground">
              {new Date(lastFetchedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            onClick={refresh}
            className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            title="Refresh metrics"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <KpiCard
          icon={TrendingUp}
          label="Hit Rate"
          value={`${metrics.hitRate}%`}
          trend={hitRateTrend}
          higherIsGood={true}
          color={hitRateColor(metrics.hitRate)}
        />
        <KpiCard
          icon={HardDrive}
          label="Current Size"
          value={metrics.currentSize}
          trend={getTrend(metrics.currentSize, prev.currentSize)}
          higherIsGood={false}
          color="text-blue-500"
        />
        <KpiCard
          icon={ArrowRightLeft}
          label="Evictions"
          value={metrics.evictions}
          trend={getTrend(metrics.evictions, prev.evictions)}
          higherIsGood={false}
          color="text-orange-500"
        />
        <KpiCard
          icon={Timer}
          label="Expirations"
          value={metrics.expirations}
          trend={getTrend(metrics.expirations, prev.expirations)}
          higherIsGood={false}
          color="text-purple-500"
        />
      </div>

      <div className="bg-card rounded-xl p-4 border border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Hit Rate
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`${hitRateBgColor(metrics.hitRate)} rounded-full h-3 transition-all`}
                style={{ width: `${metrics.hitRate}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-lg font-bold ${hitRateColor(metrics.hitRate)}`}>
              {metrics.hitRate}%
            </span>
            <TrendIcon direction={hitRateTrend} higherIsGood={true} />
          </div>
        </div>
        <div className="flex justify-between mt-2 text-[0.6875rem] text-muted-foreground">
          <span>{metrics.hits} hits / {metrics.misses} misses</span>
          <span>{totalRequests} total requests</span>
        </div>
      </div>

      <div className="bg-card rounded-xl p-4 border border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Cache Capacity
        </h3>
        <CapacityBar current={metrics.currentSize} max={metrics.maxSize} />
      </div>

      <div className="bg-card rounded-xl p-4 border border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Details
        </h3>
        <div>
          <MetricRow label="Cache Hits" value={metrics.hits} />
          <MetricRow label="Cache Misses" value={metrics.misses} />
          <MetricRow label="Total Stores" value={metrics.stores} />
          <MetricRow label="Evictions" value={metrics.evictions} />
          <MetricRow label="Expirations" value={metrics.expirations} />
          <MetricRow label="Average Size" value={metrics.averageSize} subValue="entries" />
          <MetricRow label="TTL" value={formatTtl(metrics.ttlMs)} />
          <MetricRow
            label="Uptime"
            value={formatUptime(metrics.uptimeMs)}
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Last refresh failed: {error}</span>
        </div>
      )}
    </motion.div>
  );
});

export default CacheMetricsWidget;
