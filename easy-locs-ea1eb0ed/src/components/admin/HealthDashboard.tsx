import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity, AlertTriangle, CheckCircle2, XCircle, RefreshCw, Trash2,
  Monitor, Wifi, Zap, ShieldCheck, Clock
} from "lucide-react";
import {
  getMonitoringEvents, subscribeMonitoring, clearEvents, resolveEvent,
  runSyncHealthChecks, type MonitoringEvent, type SyncCheckResult,
} from "@/lib/monitoring";

const statusIcon = (s: string) => {
  if (s === "ok") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (s === "warning") return <AlertTriangle className="h-4 w-4 text-warning" />;
  return <XCircle className="h-4 w-4 text-destructive" />;
};

const typeColor: Record<string, string> = {
  error: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  performance: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  sync_failure: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  ui_issue: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

const HealthDashboard = () => {
  const [events, setEvents] = useState<MonitoringEvent[]>([]);
  const [syncResults, setSyncResults] = useState<SyncCheckResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    setEvents(getMonitoringEvents());
    return subscribeMonitoring(() => setEvents(getMonitoringEvents()));
  }, []);

  const runChecks = useCallback(async () => {
    setChecking(true);
    const results = await runSyncHealthChecks();
    setSyncResults(results);
    setChecking(false);
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);
  const errorCount = events.filter((e) => e.type === "error" && !e.resolved).length;
  const warningCount = events.filter((e) => (e.type === "warning" || e.type === "ui_issue") && !e.resolved).length;
  const perfCount = events.filter((e) => e.type === "performance").length;
  const syncOk = syncResults.filter((r) => r.status === "ok").length;
  const syncTotal = syncResults.length;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{errorCount}</p>
              <p className="text-xs text-muted-foreground">Active Errors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{warningCount}</p>
              <p className="text-xs text-muted-foreground">Warnings</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Zap className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{perfCount}</p>
              <p className="text-xs text-muted-foreground">Perf Issues</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <ShieldCheck className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{syncOk}/{syncTotal}</p>
              <p className="text-xs text-muted-foreground">Sync Checks OK</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Health Checks */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wifi className="h-4 w-4 text-accent" />
              Synchronization Health
            </CardTitle>
            <Button variant="outline" size="sm" onClick={runChecks} disabled={checking}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Checking…" : "Re-check"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {syncResults.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Running health checks…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {syncResults.map((r) => (
                <div key={r.name} className="flex items-start gap-2.5 p-3 rounded-lg border border-border/50 bg-muted/30">
                  {statusIcon(r.status)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground break-words leading-snug">{r.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Log */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="h-4 w-4 text-accent" />
              Live Event Log
              {events.length > 0 && (
                <Badge variant="secondary" className="text-xs">{events.length}</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex bg-muted rounded-md p-0.5">
                {["all", "error", "warning", "performance", "ui_issue", "sync_failure"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f === "all" ? "All" : f.replace("_", " ")}
                  </button>
                ))}
              </div>
              {events.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearEvents}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {events.length === 0 ? "No events captured yet — monitoring active" : "No events match this filter"}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filtered.map((evt) => (
                <div
                  key={evt.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    evt.resolved ? "opacity-50 border-border/30" : typeColor[evt.type] || "border-border/50"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {evt.type === "error" ? <XCircle className="h-4 w-4" /> :
                     evt.type === "performance" ? <Zap className="h-4 w-4" /> :
                     evt.type === "ui_issue" ? <Monitor className="h-4 w-4" /> :
                     <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium uppercase">{evt.type.replace("_", " ")}</span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{evt.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Source: {evt.source}</p>
                  </div>
                  {!evt.resolved && (
                    <Button variant="ghost" size="sm" className="shrink-0" onClick={() => resolveEvent(evt.id)}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthDashboard;
