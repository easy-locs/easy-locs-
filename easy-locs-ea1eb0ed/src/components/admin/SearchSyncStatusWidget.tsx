import { useState, useEffect, useCallback } from "react";
import { AppCard, CardContent, CardHeader, CardTitle } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Search, CheckCircle2, XCircle, RefreshCw, Clock,
  AlertTriangle, Activity, Database, Inbox,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SyncLogEntry {
  id: number;
  sync_type: string;
  status: string;
  indexes_synced: string[];
  total_documents: number;
  queue_processed: number;
  errors: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
}

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
  if (status === "completed") {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Completed
      </Badge>
    );
  }
  if (status === "completed_with_errors") {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Partial
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Activity className="h-3 w-3 animate-pulse" />
      Running
    </Badge>
  );
}

export default function SearchSyncStatusWidget() {
  const [logs, setLogs] = useState<SyncLogEntry[]>([]);
  const [queueDepth, setQueueDepth] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsResult, queueResult] = await Promise.all([
        supabase
          .from("search_sync_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20) as Promise<{ data: SyncLogEntry[] | null; error: { message: string } | null }>,
        supabase
          .from("search_sync_queue")
          .select("id", { count: "exact", head: true })
          .is("processed_at", null) as Promise<{ count: number | null; error: { message: string } | null }>,
      ]);

      if (logsResult.error) throw new Error(logsResult.error.message);
      if (queueResult.error) throw new Error(queueResult.error.message);

      setLogs((logsResult.data as SyncLogEntry[]) ?? []);
      setQueueDepth(queueResult.count ?? 0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load sync data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const triggerSync = async (mode: "incremental" | "full") => {
    setTriggering(true);
    try {
      const { error: invokeErr } = await supabase.functions.invoke("sync-meilisearch-cron", {
        body: { mode },
      });
      if (invokeErr) throw invokeErr;
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to trigger sync");
    } finally {
      setTriggering(false);
    }
  };

  const lastSuccess = logs.find((l) => l.status === "completed");
  const totalSynced24h = logs
    .filter((l) => {
      const age = Date.now() - new Date(l.started_at).getTime();
      return age < 86400000 && (l.status === "completed" || l.status === "completed_with_errors");
    })
    .reduce((sum, l) => sum + l.total_documents, 0);
  const failureCount24h = logs.filter((l) => {
    const age = Date.now() - new Date(l.started_at).getTime();
    return age < 86400000 && l.status === "failed";
  }).length;

  return (
    <AppCard>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4 text-accent" />
            Search Index Sync
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerSync("incremental")}
              disabled={triggering || loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${triggering ? "animate-spin" : ""}`} />
              Incremental Sync
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerSync("full")}
              disabled={triggering || loading}
            >
              <Database className="h-3.5 w-3.5 mr-1.5" />
              Full Sync
            </Button>
            <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Last Sync</span>
            </div>
            <p className="text-sm font-medium">{formatTimeAgo(lastSuccess?.completed_at ?? null)}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Docs (24h)</span>
            </div>
            <p className="text-sm font-medium">{totalSynced24h.toLocaleString()}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Queue Depth</span>
            </div>
            <p className="text-sm font-medium">{queueDepth}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Failures (24h)</span>
            </div>
            <p className={`text-sm font-medium ${failureCount24h > 0 ? "text-destructive" : ""}`}>
              {failureCount24h}
            </p>
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {logs.length === 0 && !loading ? (
            <div className="text-center py-8">
              <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No sync history recorded yet</p>
            </div>
          ) : (
            logs.map((entry) => (
              <div
                key={entry.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  entry.status === "failed"
                    ? "border-destructive/30 bg-destructive/5"
                    : entry.status === "running"
                    ? "border-yellow-500/30 bg-yellow-500/5"
                    : "border-border/50"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {entry.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : entry.status === "failed" ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : entry.status === "completed_with_errors" ? (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-medium text-foreground capitalize">
                      {entry.sync_type} sync
                    </span>
                    <StatusBadge status={entry.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.started_at).toLocaleString()}
                    </span>
                    <span>{formatDuration(entry.duration_ms)}</span>
                    <span>{entry.total_documents} docs</span>
                    {entry.queue_processed > 0 && (
                      <span>{entry.queue_processed} queued</span>
                    )}
                    {entry.indexes_synced.length > 0 && (
                      <span>{entry.indexes_synced.join(", ")}</span>
                    )}
                  </div>
                  {entry.error_message && (
                    <p className="text-xs text-destructive mt-1.5 bg-destructive/10 rounded px-2 py-1 truncate">
                      {entry.error_message}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </AppCard>
  );
}
