import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, startOfDay, endOfDay } from "date-fns";
import {
  Clock, CheckCircle2, XCircle, RefreshCw, Timer,
  Database, AlertTriangle, Activity, ChevronDown, ChevronUp,
  CalendarIcon,
} from "lucide-react";
import {
  fetchCronExecutionLogs,
  computeCronJobStats,
  type CronExecutionLog,
  type CronJobStats,
} from "@/repositories/admin.repository";
import { useCronFailureAlerts } from "@/hooks/useCronFailureAlerts";
import CronAlertPreferences from "./CronAlertPreferences";

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Success
      </Badge>
    );
  }
  if (status === "failure") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="gap-1">
      <Activity className="h-3 w-3 animate-pulse" />
      Running
    </Badge>
  );
}

function formatJobName(name: string): string {
  return name
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onClear,
}: {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartChange: (d: Date | undefined) => void;
  onEndChange: (d: Date | undefined) => void;
  onClear: () => void;
}) {
  const hasRange = startDate || endDate;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <CalendarIcon className="h-3.5 w-3.5" />
            From: {startDate ? format(startDate, "MMM d, yyyy") : "Any"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={startDate}
            onSelect={onStartChange}
            disabled={(date) => (endDate ? date > endDate : false) || date > new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <CalendarIcon className="h-3.5 w-3.5" />
            To: {endDate ? format(endDate, "MMM d, yyyy") : "Any"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={endDate}
            onSelect={onEndChange}
            disabled={(date) => (startDate ? date < startDate : false) || date > new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {hasRange && (
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onClear}>
          Clear
        </Button>
      )}
      <div className="flex items-center gap-1">
        {[
          { label: "24h", days: 1 },
          { label: "7d", days: 7 },
          { label: "30d", days: 30 },
        ].map(({ label, days }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            className="text-[10px] px-2 py-0.5 h-7"
            onClick={() => {
              const now = new Date();
              const start = new Date(now.getTime() - days * 86400000);
              onStartChange(start);
              onEndChange(now);
            }}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}

const CronJobHistoryWidget = () => {
  const [logs, setLogs] = useState<CronExecutionLog[]>([]);
  const [stats, setStats] = useState<CronJobStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showPrefs, setShowPrefs] = useState(false);

  useCronFailureAlerts(true);

  const fetchIdRef = useRef(0);

  const loadData = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const startISO = startDate ? startOfDay(startDate).toISOString() : undefined;
      const endISO = endDate ? endOfDay(endDate).toISOString() : undefined;
      const data = await fetchCronExecutionLogs(100, startISO, endISO);
      if (id !== fetchIdRef.current) return;
      setLogs(data);
      const newStats = computeCronJobStats(data);
      setStats(newStats);
      setJobFilter((prev) => {
        if (prev === "all") return prev;
        const stillExists = newStats.some((s) => s.job_name === prev);
        return stillExists ? prev : "all";
      });
    } catch (err: unknown) {
      if (id !== fetchIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load cron job history");
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalRuns = stats.reduce((s, j) => s + j.total_runs, 0);
  const totalFailures = stats.reduce((s, j) => s + j.failure_count, 0);
  const successRate = totalRuns > 0 ? Math.round(((totalRuns - totalFailures) / totalRuns) * 100) : 100;

  const jobNames = ["all", ...stats.map((s) => s.job_name)];
  const filteredLogs = jobFilter === "all" ? logs : logs.filter((l) => l.job_name === jobFilter);

  const handleClearDates = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Card className="flex-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CalendarIcon className="h-4 w-4 text-accent" />
                Date Range
              </div>
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartChange={setStartDate}
                onEndChange={setEndDate}
                onClear={handleClearDates}
              />
            </div>
          </CardContent>
        </Card>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPrefs((p) => !p)}
          className="gap-1.5"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {showPrefs ? "Hide Alert Settings" : "Alert Settings"}
        </Button>
      </div>

      {showPrefs && <CronAlertPreferences />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <Database className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.length}</p>
              <p className="text-xs text-muted-foreground">Active Jobs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{successRate}%</p>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Activity className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalRuns}</p>
              <p className="text-xs text-muted-foreground">Total Runs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{totalFailures}</p>
              <p className="text-xs text-muted-foreground">Failures</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="h-4 w-4 text-accent" />
              Job Summary
              {(startDate || endDate) && (
                <Badge variant="secondary" className="text-[10px] font-normal">
                  Filtered
                </Badge>
              )}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Loading…" : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-6">
              <AlertTriangle className="h-8 w-8 text-destructive/40 mx-auto mb-2" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : stats.length === 0 && !loading ? (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No cron job executions recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.map((job) => (
                <div
                  key={job.job_name}
                  className={`rounded-lg border transition-colors ${
                    job.failure_count > 0 && job.last_status === "failure"
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-border/50 bg-muted/30"
                  }`}
                >
                  <button
                    className="w-full flex items-center justify-between p-3 text-left"
                    onClick={() => setExpandedJob(expandedJob === job.job_name ? null : job.job_name)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusBadge status={job.last_status || "success"} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {formatJobName(job.job_name)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last run: {formatTimeAgo(job.last_run)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{job.total_runs} runs</span>
                        <span className="text-green-500">{job.success_count} ok</span>
                        {job.failure_count > 0 && (
                          <span className="text-destructive font-medium">{job.failure_count} failed</span>
                        )}
                        <span>avg {formatDuration(job.avg_duration_ms)}</span>
                        <span>~{job.avg_rows_affected} rows</span>
                      </div>
                      {expandedJob === job.job_name ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  {expandedJob === job.job_name && (
                    <div className="px-3 pb-3 border-t border-border/30">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-sm sm:hidden">
                        <div>
                          <span className="text-muted-foreground text-xs">Runs</span>
                          <p className="font-medium">{job.total_runs}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Success</span>
                          <p className="font-medium text-green-500">{job.success_count}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Failed</span>
                          <p className="font-medium text-destructive">{job.failure_count}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-xs">Avg Duration</span>
                          <p className="font-medium">{formatDuration(job.avg_duration_ms)}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                        {logs
                          .filter((l) => l.job_name === job.job_name)
                          .slice(0, 10)
                          .map((entry) => (
                            <div
                              key={entry.id}
                              className={`flex items-center justify-between text-xs p-2 rounded ${
                                entry.status === "failure"
                                  ? "bg-destructive/10 border border-destructive/20"
                                  : "bg-background/50"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <StatusBadge status={entry.status} />
                                <span className="text-muted-foreground">
                                  {new Date(entry.started_at).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                                <span>{formatDuration(entry.duration_ms)}</span>
                                <span>{entry.rows_affected ?? 0} rows</span>
                              </div>
                              {entry.error_message && (
                                <span className="text-destructive text-[10px] truncate max-w-[200px] ml-2" title={entry.error_message}>
                                  {entry.error_message}
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-accent" />
              Recent Executions
              {filteredLogs.length > 0 && (
                <Badge variant="secondary" className="text-xs">{filteredLogs.length}</Badge>
              )}
            </CardTitle>
            <div className="flex bg-muted rounded-md p-0.5 overflow-x-auto scrollbar-none">
              {jobNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setJobFilter(name)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                    jobFilter === name
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {name === "all" ? "All" : formatJobName(name)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No executions found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredLogs.slice(0, 50).map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    entry.status === "failure"
                      ? "border-destructive/30 bg-destructive/5"
                      : entry.status === "running"
                      ? "border-warning/30 bg-warning/5"
                      : "border-border/50"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {entry.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : entry.status === "failure" ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <Activity className="h-4 w-4 text-warning animate-pulse" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {formatJobName(entry.job_name)}
                      </span>
                      <StatusBadge status={entry.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(entry.started_at).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {formatDuration(entry.duration_ms)}
                      </span>
                      <span>{entry.rows_affected ?? 0} rows affected</span>
                    </div>
                    {entry.error_message && (
                      <p className="text-xs text-destructive mt-1.5 bg-destructive/10 rounded px-2 py-1">
                        {entry.error_message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CronJobHistoryWidget;
