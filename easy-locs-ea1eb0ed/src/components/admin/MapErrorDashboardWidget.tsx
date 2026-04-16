import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  AlertTriangle, Map, RefreshCw, Activity, Shield, Clock, Filter, Radio, Timer,
  ArrowUpDown, ArrowUp, ArrowDown, LayoutList,
} from "lucide-react";
import {
  useMapErrorDashboard,
  type DashboardTimeRange,
  type AutoRefreshInterval,
  type AlertLogEntry,
  type ComponentBreakdown,
} from "@/hooks/useMapErrorDashboard";

const TIME_RANGES: { value: DashboardTimeRange; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "6h", label: "6h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
];

const AUTO_REFRESH_OPTIONS: { value: AutoRefreshInterval; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "30s", label: "30s" },
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
];

const ERROR_TYPES = [
  { value: "all", label: "All Types" },
  { value: "token", label: "Token" },
  { value: "webgl", label: "WebGL" },
  { value: "network", label: "Network" },
  { value: "init_failure", label: "Init Failure" },
  { value: "runtime", label: "Runtime" },
  { value: "unknown", label: "Unknown" },
];

const TYPE_COLORS: Record<string, string> = {
  token: "#ef4444",
  webgl: "#f59e0b",
  network: "#3b82f6",
  init_failure: "#8b5cf6",
  runtime: "#ec4899",
  unknown: "#6b7280",
};

type SortKey = keyof Pick<ComponentBreakdown, "component" | "totalErrors" | "errorRate" | "percentShare" | "lastError" | "mostCommonType">;
type SortDir = "asc" | "desc";

const BREAKDOWN_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "component", label: "Component" },
  { key: "totalErrors", label: "Total Errors" },
  { key: "percentShare", label: "% Share" },
  { key: "errorRate", label: "Error Rate" },
  { key: "lastError", label: "Last Error" },
  { key: "mostCommonType", label: "Most Common Type" },
];

function alertSeverity(alert: AlertLogEntry): "critical" | "warning" {
  return alert.actual_count >= alert.threshold * 2 ? "critical" : "warning";
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatLastRefresh(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatCountdown(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  return `${seconds}s`;
}

export default function MapErrorDashboardWidget() {
  const {
    range, setRange,
    errorType, setErrorType,
    component, setComponent,
    autoRefresh, setAutoRefresh,
    realtimeEnabled, setRealtimeEnabled,
    realtimeConnected,
    lastRefreshTime,
    secondsUntilRefresh,
    buckets, alerts, totalErrors, components, componentBreakdown,
    loading, error, refetch,
  } = useMapErrorDashboard();

  const [sortKey, setSortKey] = useState<SortKey>("totalErrors");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedBreakdown = useMemo(() => {
    const sorted = [...componentBreakdown];
    sorted.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return sorted;
  }, [componentBreakdown, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "component" || key === "mostCommonType" ? "asc" : "desc");
    }
  };

  const activeAlerts = alerts.filter((a) => {
    const age = Date.now() - new Date(a.created_at).getTime();
    return age < a.window_minutes * 60_000 * 2;
  });

  const errorsPerMinute = totalErrors > 0
    ? (totalErrors / (range === "1h" ? 60 : range === "6h" ? 360 : range === "24h" ? 1440 : 10080)).toFixed(2)
    : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Map className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Map Error Rate</h2>
          {activeAlerts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {activeAlerts.length} active alert{activeAlerts.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-muted rounded-md p-0.5">
            {TIME_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  range === r.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-muted rounded-md px-2 py-1">
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.value as AutoRefreshInterval)}
              className="text-xs bg-transparent border-0 text-foreground cursor-pointer outline-none"
              aria-label="Auto-refresh interval"
            >
              {AUTO_REFRESH_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value === "off" ? "Auto: Off" : `Auto: ${opt.label}`}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setRealtimeEnabled(!realtimeEnabled)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
              realtimeEnabled
                ? realtimeConnected
                  ? "bg-green-500/10 text-green-600 border border-green-500/20"
                  : "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
            title={
              realtimeEnabled
                ? realtimeConnected
                  ? "Realtime connected — click to disconnect"
                  : "Realtime connecting..."
                : "Enable realtime updates"
            }
          >
            <Radio className={`h-3.5 w-3.5 ${realtimeEnabled && realtimeConnected ? "animate-pulse" : ""}`} />
            {realtimeEnabled ? (realtimeConnected ? "Live" : "...") : "Live"}
          </button>

          <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Last refresh: {formatLastRefresh(lastRefreshTime)}
        </span>
        {secondsUntilRefresh !== null && (
          <span className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            Next in {formatCountdown(secondsUntilRefresh)}
          </span>
        )}
        {realtimeEnabled && (
          <span className="flex items-center gap-1">
            <Radio className={`h-3 w-3 ${realtimeConnected ? "text-green-500" : "text-yellow-500"}`} />
            {realtimeConnected ? "Realtime connected" : "Connecting..."}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalErrors}</p>
              <p className="text-xs text-muted-foreground">Total Errors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{errorsPerMinute}</p>
              <p className="text-xs text-muted-foreground">Errors / min</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <Shield className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{activeAlerts.length}</p>
              <p className="text-xs text-muted-foreground">Active Alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{alerts.length}</p>
              <p className="text-xs text-muted-foreground">Alert History</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-accent" />
              Errors / Minute Over Time
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <select
                value={errorType}
                onChange={(e) => setErrorType(e.target.value)}
                className="text-xs bg-muted border-0 rounded-md px-2 py-1 text-foreground"
              >
                {ERROR_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={component}
                onChange={(e) => setComponent(e.target.value)}
                className="text-xs bg-muted border-0 rounded-md px-2 py-1 text-foreground"
              >
                <option value="all">All Components</option>
                {components.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-destructive/30 mx-auto mb-2" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={refetch}>
                Retry
              </Button>
            </div>
          ) : loading && buckets.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          ) : buckets.length === 0 ? (
            <div className="text-center py-8">
              <Map className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No error data in this time range</p>
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={buckets}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    allowDecimals={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    fill="#3b82f6"
                    stroke="#3b82f6"
                    fillOpacity={0.3}
                    name="Errors/min"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutList className="h-4 w-4 text-accent" />
            Error Breakdown by Component
            {componentBreakdown.length > 0 && (
              <Badge variant="secondary" className="text-xs">{componentBreakdown.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {componentBreakdown.length === 0 ? (
            <div className="text-center py-8">
              <LayoutList className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No component data in this time range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {BREAKDOWN_COLUMNS.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedBreakdown.map((row) => (
                    <tr
                      key={row.component}
                      onClick={() => setComponent(component === row.component ? "all" : row.component)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setComponent(component === row.component ? "all" : row.component);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-pressed={component === row.component}
                      className={`border-b border-border/50 cursor-pointer transition-colors ${
                        component === row.component
                          ? "bg-accent/15 hover:bg-accent/20"
                          : "hover:bg-muted/50"
                      }`}
                      title={component === row.component ? "Click to clear filter" : `Filter dashboard by ${row.component}`}
                    >
                      <td className="px-3 py-2 font-medium text-foreground">{row.component}</td>
                      <td className="px-3 py-2 text-foreground">{row.totalErrors}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all"
                              style={{ width: `${Math.min(row.percentShare, 100)}%` }}
                            />
                          </div>
                          <span className="text-foreground text-xs tabular-nums">{row.percentShare}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-foreground">{row.errorRate}/min</td>
                      <td className="px-3 py-2 text-muted-foreground">{relativeTime(row.lastError)}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: TYPE_COLORS[row.mostCommonType] ?? TYPE_COLORS.unknown, color: TYPE_COLORS[row.mostCommonType] ?? TYPE_COLORS.unknown }}
                        >
                          {row.mostCommonType.replace(/_/g, " ")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-accent" />
            Alert History
            {alerts.length > 0 && (
              <Badge variant="secondary" className="text-xs">{alerts.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No alerts in this time range</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {alerts.map((alert) => {
                const severity = alertSeverity(alert);
                const detailType = (alert.details as Record<string, string>)?.error_type;
                const detailComp = (alert.details as Record<string, string>)?.component;

                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      severity === "critical"
                        ? "bg-destructive/10 border-destructive/20"
                        : "bg-warning/10 border-warning/20"
                    }`}
                  >
                    <AlertTriangle
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        severity === "critical" ? "text-destructive" : "text-warning"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {alert.alert_type.replace(/_/g, " ")}
                        </span>
                        <Badge
                          variant={severity === "critical" ? "destructive" : "secondary"}
                          className="text-[10px]"
                        >
                          {alert.actual_count}/{alert.threshold}
                        </Badge>
                        {detailType && detailType !== "null" && (
                          <Badge variant="outline" className="text-[10px]">{detailType}</Badge>
                        )}
                        {detailComp && detailComp !== "null" && (
                          <Badge variant="outline" className="text-[10px]">{detailComp}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {alert.actual_count} errors in {alert.window_minutes}min window (threshold: {alert.threshold})
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {relativeTime(alert.created_at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
