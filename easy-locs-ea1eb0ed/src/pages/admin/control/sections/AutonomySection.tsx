import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  RotateCcw,
  Shield,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchAutonomyDashboardData,
  triggerAutonomySystem,
  type AutonomyDashboardData,
  type AutonomySystem,
} from "@/services/domain/dashboard.service";
import { db } from "@/services/db";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getSection } from "../sections";

const STATUS_CONFIG: Record<
  AutonomySystem["status"],
  { label: string; bg: string; text: string; dot: string }
> = {
  green: {
    label: "Healthy",
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    dot: "bg-emerald-500",
  },
  yellow: {
    label: "Degraded",
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    dot: "bg-amber-500",
  },
  red: {
    label: "Down",
    bg: "bg-red-500/15",
    text: "text-red-400",
    dot: "bg-red-500",
  },
  unknown: {
    label: "Unknown",
    bg: "bg-zinc-500/15",
    text: "text-zinc-400",
    dot: "bg-zinc-500",
  },
};

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

type DlqAction = "replay" | "purge";

export default function AutonomySection() {
  const section = getSection("autonomy");
  const Icon = section.icon;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [triggering, setTriggering] = useState<string | null>(null);
  const [zoom, setZoom] = useState<"compact" | "wide">("compact");
  const [dlqDialog, setDlqDialog] = useState<DlqAction | null>(null);

  const dataQuery = useQuery({
    queryKey: ["control-autonomy"],
    queryFn: () => fetchAutonomyDashboardData(),
    refetchInterval: 30_000,
  });

  const data: AutonomyDashboardData | undefined = dataQuery.data;

  const handleTrigger = useCallback(
    async (systemName: string) => {
      setTriggering(systemName);
      try {
        await triggerAutonomySystem(systemName);
        toast({
          title: "Triggered",
          description: `${systemName} run requested.`,
        });
        await dataQuery.refetch();
      } catch (e) {
        toast({
          title: "Trigger failed",
          description: e instanceof Error ? e.message : String(e),
          variant: "destructive",
        });
      } finally {
        setTriggering(null);
      }
    },
    [dataQuery, toast],
  );

  const dlqMutation = useMutation({
    mutationFn: async (action: DlqAction) => {
      if (action === "replay") {
        const { error, count } = await db
          .from("dead_letter_queue")
          .update(
            {
              status: "pending",
              retry_count: 0,
              updated_at: new Date().toISOString(),
            },
            { count: "exact" },
          )
          .in("status", ["dead", "retrying"]);
        if (error) throw new Error(error.message);
        return { action, count: count ?? 0 };
      }
      const { error, count } = await db
        .from("dead_letter_queue")
        .update(
          {
            status: "resolved",
            updated_at: new Date().toISOString(),
          },
          { count: "exact" },
        )
        .eq("status", "dead");
      if (error) throw new Error(error.message);
      return { action, count: count ?? 0 };
    },
    onSuccess: ({ action, count }) => {
      toast({
        title: action === "replay" ? "DLQ replay queued" : "DLQ purged",
        description: `${count} entr${count === 1 ? "y" : "ies"} updated.`,
      });
      qc.invalidateQueries({ queryKey: ["control-autonomy"] });
    },
    onError: (err: Error) => {
      toast({
        title: "DLQ action failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const autonomyScore = useMemo(() => {
    const systems = data?.systems ?? [];
    if (systems.length === 0) return 0;
    const weights: Record<string, number> = {
      green: 100,
      yellow: 50,
      red: 0,
      unknown: 0,
    };
    return Math.round(
      systems.reduce((sum, s) => sum + (weights[s.status] ?? 0), 0) /
        systems.length,
    );
  }, [data?.systems]);

  const uptime = data?.uptimeHistory ?? [];
  const visibleUptime = useMemo(
    () =>
      [...uptime].reverse().slice(0, zoom === "wide" ? uptime.length : 20),
    [uptime, zoom],
  );

  // Chart-friendly normalisation: at least 8% so the bar always renders.
  const maxLatency = useMemo(
    () => Math.max(50, ...visibleUptime.map((u) => u.total_ms)),
    [visibleUptime],
  );

  return (
    <TooltipProvider>
      <section
        data-testid="control-section-autonomy"
        className="flex h-full flex-col"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/40 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg border border-border/40 bg-card/60 p-2">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                {section.label}
              </h1>
              <p className="text-xs text-muted-foreground">
                {section.description}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dataQuery.refetch()}
            disabled={dataQuery.isFetching}
            data-testid="autonomy-refresh"
          >
            {dataQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {dataQuery.isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : dataQuery.isError ? (
            <div
              className="m-6 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              data-testid="autonomy-error"
            >
              Failed to load autonomy data.{" "}
              {(dataQuery.error as Error | undefined)?.message}
            </div>
          ) : !data ? (
            <div
              className="m-6 rounded-2xl border border-dashed border-border/60 p-10 text-center"
              data-testid="autonomy-empty"
            >
              <Shield className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium">No autonomy data</p>
            </div>
          ) : (
            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <ScoreCard label="Autonomy" value={`${autonomyScore}%`} />
                <ScoreCard
                  label="Online"
                  value={`${data.systems.filter((s) => s.status === "green").length}/${data.systems.length}`}
                />
                <ScoreCard label="DLQ pending" value={String(data.dlqStats.pending)} />
                <ScoreCard label="Jobs queued" value={String(data.jobStats.pending)} />
              </div>

              {/* DLQ panel with inline replay/purge actions */}
              <div className="rounded-xl border border-border/40 bg-card/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    Dead Letter Queue
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={dlqMutation.isPending}
                      onClick={() => setDlqDialog("replay")}
                      data-testid="dlq-replay"
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      Replay
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={dlqMutation.isPending}
                      onClick={() => setDlqDialog("purge")}
                      data-testid="dlq-purge"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Purge
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <DlqStat label="Pending" value={data.dlqStats.pending} color="text-amber-400" />
                  <DlqStat label="Retrying" value={data.dlqStats.retrying} color="text-sky-400" />
                  <DlqStat label="Dead" value={data.dlqStats.dead} color="text-red-400" />
                  <DlqStat label="Resolved" value={data.dlqStats.resolved} color="text-emerald-400" />
                </div>
              </div>

              {/* Systems list */}
              <div className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  System status
                </h2>
                <div className="space-y-2">
                  {data.systems.map((s) => {
                    const cfg = STATUS_CONFIG[s.status];
                    const total = s.success_count_24h + s.fail_count_24h;
                    const successRate =
                      total > 0
                        ? Math.round((s.success_count_24h / total) * 100)
                        : 0;
                    return (
                      <div
                        key={s.system_name}
                        className={`${cfg.bg} flex items-center justify-between rounded-lg border border-border/40 p-3`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${cfg.dot} animate-pulse`}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {s.display_name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              last run {timeAgo(s.last_run_at)} · success{" "}
                              {successRate}% ({total})
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-2 py-0.5 text-[11px] font-medium ${cfg.bg} ${cfg.text}`}
                          >
                            {cfg.label}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            disabled={triggering === s.system_name}
                            onClick={() => handleTrigger(s.system_name)}
                            data-testid={`autonomy-trigger-${s.system_name}`}
                            title="Manual trigger"
                          >
                            {triggering === s.system_name ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Uptime chart with tooltips + zoom toggle */}
              <div className="rounded-xl border border-border/40 bg-card/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Clock className="h-4 w-4 text-emerald-400" />
                    Uptime checks ({visibleUptime.length})
                  </h3>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      setZoom((z) => (z === "compact" ? "wide" : "compact"))
                    }
                    data-testid="autonomy-uptime-zoom"
                  >
                    {zoom === "compact" ? (
                      <>
                        <ZoomIn className="mr-1 h-3 w-3" /> Wide
                      </>
                    ) : (
                      <>
                        <ZoomOut className="mr-1 h-3 w-3" /> Compact
                      </>
                    )}
                  </Button>
                </div>
                {visibleUptime.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No uptime samples yet.
                  </p>
                ) : (
                  <>
                    <div
                      className="flex h-16 items-end gap-1"
                      data-testid="autonomy-uptime-chart"
                    >
                      {visibleUptime.map((u, i) => {
                        const color =
                          u.status === "healthy"
                            ? "bg-emerald-500"
                            : u.status === "degraded"
                              ? "bg-amber-500"
                              : "bg-red-500";
                        const heightPct = Math.max(
                          12,
                          Math.min(100, (u.total_ms / maxLatency) * 100),
                        );
                        return (
                          <Tooltip key={`${u.created_at}-${i}`}>
                            <TooltipTrigger asChild>
                              <div
                                className={`${color} min-w-[4px] flex-1 rounded-sm transition-opacity hover:opacity-80`}
                                style={{ height: `${heightPct}%` }}
                                data-testid={`autonomy-uptime-bar-${i}`}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <div className="space-y-0.5 text-xs">
                                <div className="font-medium capitalize">
                                  {u.status}
                                </div>
                                <div className="text-muted-foreground">
                                  {u.total_ms} ms ·{" "}
                                  {u.consecutive_failures} consecutive fail
                                </div>
                                <div className="text-muted-foreground">
                                  {new Date(u.created_at).toLocaleString()}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                      <span>oldest</span>
                      <span>latest</span>
                    </div>
                  </>
                )}
              </div>

              {data.dbHealth && (
                <div className="rounded-xl border border-border/40 bg-card/60 p-4">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Activity className="h-4 w-4 text-sky-400" />
                    DB Health
                  </h3>
                  {data.dbHealth.criticalAlerts.length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-400">
                      <CheckCircle className="h-4 w-4" />
                      All metrics healthy ({data.dbHealth.alertCount} warnings)
                    </div>
                  ) : (
                    <ul className="space-y-1 text-xs text-red-400">
                      {data.dbHealth.criticalAlerts.map((alert) => (
                        <li key={alert}>· {alert}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <AlertDialog
          open={dlqDialog !== null}
          onOpenChange={(o) => !o && setDlqDialog(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {dlqDialog === "replay"
                  ? "Replay dead letter queue?"
                  : "Purge dead entries?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {dlqDialog === "replay"
                  ? "All dead and retrying entries will be reset to pending so the DLQ processor can attempt them again."
                  : "All entries in 'dead' state will be marked as resolved and removed from active processing. This is irreversible."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (dlqDialog) dlqMutation.mutate(dlqDialog);
                  setDlqDialog(null);
                }}
                data-testid="dlq-confirm"
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </TooltipProvider>
  );
}

function ScoreCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function DlqStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
