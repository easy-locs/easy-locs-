import { memo } from "react";
import { motion } from "framer-motion";
import { MapPin, AlertTriangle, Wifi, Monitor, Cpu, Bug, Filter, X } from "lucide-react";
import { useMapErrorAnalytics, type TimeRange } from "@/hooks/useMapErrorAnalytics";
import type { MapErrorType } from "@/lib/analytics/map-error-analytics";

const ERROR_TYPE_CONFIG: Record<MapErrorType, { label: string; icon: typeof AlertTriangle; color: string; bgColor: string }> = {
  token: { label: "Token", icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-500" },
  webgl: { label: "WebGL", icon: Monitor, color: "text-purple-500", bgColor: "bg-purple-500" },
  network: { label: "Network", icon: Wifi, color: "text-orange-500", bgColor: "bg-orange-500" },
  init_failure: { label: "Init", icon: Cpu, color: "text-blue-500", bgColor: "bg-blue-500" },
  runtime: { label: "Runtime", icon: Bug, color: "text-yellow-500", bgColor: "bg-yellow-500" },
  unknown: { label: "Unknown", icon: MapPin, color: "text-muted-foreground", bgColor: "bg-muted-foreground" },
};

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

const MapErrorTrendsWidget = memo(function MapErrorTrendsWidget() {
  const {
    summary,
    timeRange,
    setTimeRange,
    typeFilter,
    setTypeFilter,
    componentFilter,
    setComponentFilter,
    availableComponents,
    clearFilters,
  } = useMapErrorAnalytics();

  const maxTrendCount = Math.max(...summary.trend.map((t) => t.count), 1);
  const hasFilters = typeFilter !== null || componentFilter !== null;
  const hasErrors = summary.total > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent" />
          <h2 className="font-semibold text-foreground">Map Error Trends</h2>
          {summary.total > 0 && (
            <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
              {summary.total}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg bg-muted transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {TIME_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeRange(opt.value)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  timeRange === opt.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {(Object.keys(ERROR_TYPE_CONFIG) as MapErrorType[]).map((type) => {
          const config = ERROR_TYPE_CONFIG[type];
          const count = summary.byType[type];
          const isActive = typeFilter === type;
          const Icon = config.icon;

          return (
            <button
              key={type}
              onClick={() => setTypeFilter(isActive ? null : type)}
              className={`rounded-xl border p-2 text-center transition-all ${
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-border/50 bg-card hover:border-border"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 mx-auto mb-1 ${config.color}`} />
              <p className="text-sm font-bold text-foreground">{count}</p>
              <p className="text-[10px] text-muted-foreground">{config.label}</p>
            </button>
          );
        })}
      </div>

      {availableComponents.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
          <button
            onClick={() => setComponentFilter(null)}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
              !componentFilter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {availableComponents.map((comp) => (
            <button
              key={comp}
              onClick={() => setComponentFilter(componentFilter === comp ? null : comp)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
                componentFilter === comp
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {comp}
            </button>
          ))}
        </div>
      )}

      <div className="bg-card rounded-xl p-4 border border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Error Trend ({timeRange === "7d" ? "Last 7 Days" : "Last 30 Days"})
        </h3>
        {!hasErrors ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <MapPin className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">No map errors recorded</p>
            <p className="text-[11px] opacity-60">Errors will appear here as they occur</p>
          </div>
        ) : (
          <div className="flex items-end gap-px h-28">
            {summary.trend.map((point) => {
              const heightPct = (point.count / maxTrendCount) * 100;
              return (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative"
                >
                  {point.count > 0 && (
                    <span className="text-[9px] font-medium text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      {point.count}
                    </span>
                  )}
                  <div
                    className="w-full rounded-t bg-destructive/70 hover:bg-destructive transition-colors cursor-default"
                    style={{
                      height: `${Math.max(heightPct, point.count > 0 ? 4 : 1)}%`,
                      minHeight: point.count > 0 ? 4 : 1,
                    }}
                  />
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-[9px] px-1.5 py-0.5 rounded shadow-md whitespace-nowrap z-10 pointer-events-none">
                    {point.date.slice(5)} · {point.count} error{point.count !== 1 ? "s" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {hasErrors && (
          <div className="flex justify-between mt-2 text-[9px] text-muted-foreground">
            <span>{summary.trend[0]?.date.slice(5)}</span>
            <span>{summary.trend[summary.trend.length - 1]?.date.slice(5)}</span>
          </div>
        )}
      </div>

      {Object.keys(summary.byComponent).length > 0 && (
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Errors by Component
          </h3>
          <div className="space-y-2">
            {Object.entries(summary.byComponent)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([comp, count]) => {
                const pct = summary.total > 0 ? (count / summary.total) * 100 : 0;
                return (
                  <div key={comp} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground truncate max-w-[60%]">{comp}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                        <span className="text-xs font-bold text-foreground w-6 text-right">{count}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-destructive/70 rounded-full h-1.5 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {summary.recentErrors.length > 0 && (
        <div className="bg-card rounded-xl p-4 border border-border/50">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Recent Errors
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {summary.recentErrors.slice(0, 10).map((err, i) => {
              const config = ERROR_TYPE_CONFIG[err.type] || ERROR_TYPE_CONFIG.unknown;
              return (
                <div
                  key={`${err.timestamp}-${i}`}
                  className="flex items-start gap-2 text-xs border-b border-border/30 pb-2 last:border-0"
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${config.bgColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${config.color}`}>{config.label}</span>
                      <span className="text-muted-foreground">{err.component}</span>
                      <span className="text-muted-foreground/50 ml-auto text-[10px] shrink-0">
                        {new Date(err.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-muted-foreground truncate mt-0.5">{err.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
});

export default MapErrorTrendsWidget;
