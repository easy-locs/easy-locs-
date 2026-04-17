import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle,
  ChevronRight,
  Cpu,
  Loader2,
  Network,
  Pause,
  RefreshCw,
  ScrollText,
  XCircle,
} from "lucide-react";
import { db } from "@/services/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getSection } from "../sections";

interface EngineRow {
  engine_name: string;
  engine_tier: string | null;
  runtime_class: string | null;
  status: string;
  enabled: boolean;
  last_run_at: string | null;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
  last_duration_ms: number | null;
  consecutive_failures: number;
  total_runs: number;
  total_rows_affected: number;
  success_rate: number;
  frequency_seconds: number | null;
  worker_group: string | null;
  description: string | null;
  kill_switch: boolean;
}

interface RunLogRow {
  id: string;
  engine_name: string;
  started_at: string;
  duration_ms: number | null;
  status: string;
  effect_summary: string | null;
  db_rows_affected: number | null;
  error_message: string | null;
}

type Verdict = "KEEP" | "FIX" | "QUARANTINE" | "DISABLED";

function verdict(engine: EngineRow): Verdict {
  if (!engine.enabled) return "DISABLED";
  if (engine.consecutive_failures >= 5 || engine.status === "error") {
    return "QUARANTINE";
  }
  if (engine.success_rate < 80 || engine.consecutive_failures > 0) return "FIX";
  return "KEEP";
}

function verdictClass(v: Verdict): string {
  if (v === "KEEP") return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (v === "FIX") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (v === "QUARANTINE") return "bg-red-500/15 text-red-400 border-red-500/30";
  return "bg-muted/40 text-muted-foreground border-border/40";
}

function statusBadge(status: string) {
  if (status === "ok") return "bg-emerald-500/15 text-emerald-400";
  if (status === "running") return "bg-sky-500/15 text-sky-400";
  if (status === "error") return "bg-red-500/15 text-red-400";
  if (status === "warning") return "bg-amber-500/15 text-amber-400";
  if (status === "disabled") return "bg-muted/40 text-muted-foreground";
  return "bg-amber-500/15 text-amber-400";
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
}

export default function EnginesSection() {
  const section = getSection("engines");
  const Icon = section.icon;
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const enginesQuery = useQuery({
    queryKey: ["control-engines", "supervisor"],
    queryFn: async () => {
      const { data, error } = await db
        .from("engine_supervisor")
        .select("*")
        .order("engine_name");
      if (error) throw new Error(error.message);
      return (data ?? []) as EngineRow[];
    },
    refetchInterval: 15_000,
  });

  const engines = enginesQuery.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return engines;
    return engines.filter(
      (e) =>
        e.engine_name.toLowerCase().includes(q) ||
        (e.worker_group ?? "").toLowerCase().includes(q) ||
        (e.engine_tier ?? "").toLowerCase().includes(q),
    );
  }, [engines, search]);

  const groups = useMemo(() => {
    const map = new Map<string, EngineRow[]>();
    for (const e of filtered) {
      const g = e.worker_group ?? "ungrouped";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(e);
    }
    return Array.from(map.entries()).sort();
  }, [filtered]);

  const selectedEngine = useMemo(
    () => engines.find((e) => e.engine_name === selected) ?? null,
    [engines, selected],
  );

  const logsQuery = useQuery({
    queryKey: ["control-engines", "logs", selected],
    enabled: !!selected,
    refetchInterval: selected ? 5_000 : false,
    queryFn: async () => {
      const { data, error } = await db
        .from("engine_run_logs")
        .select(
          "id, engine_name, started_at, duration_ms, status, effect_summary, db_rows_affected, error_message",
        )
        .eq("engine_name", selected)
        .order("started_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as RunLogRow[];
    },
  });

  const verdictCounts = useMemo(() => {
    const counts = { KEEP: 0, FIX: 0, QUARANTINE: 0, DISABLED: 0 } as Record<
      Verdict,
      number
    >;
    for (const e of engines) counts[verdict(e)]++;
    return counts;
  }, [engines]);

  return (
    <TooltipProvider>
      <section
        data-testid="control-section-engines"
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
            onClick={() => enginesQuery.refetch()}
            disabled={enginesQuery.isFetching}
            data-testid="engines-refresh"
          >
            {enginesQuery.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </header>

        <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
          {/* Left: registry + dependency graph */}
          <div className="flex w-full flex-col border-b border-border/40 lg:w-[55%] lg:border-b-0 lg:border-r">
            <div className="space-y-3 border-b border-border/40 p-4">
              <div className="grid grid-cols-4 gap-2">
                <VerdictTile label="Keep" value={verdictCounts.KEEP} color="text-emerald-400" />
                <VerdictTile label="Fix" value={verdictCounts.FIX} color="text-blue-400" />
                <VerdictTile label="Quarantine" value={verdictCounts.QUARANTINE} color="text-red-400" />
                <VerdictTile label="Disabled" value={verdictCounts.DISABLED} color="text-muted-foreground" />
              </div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search engine, group or tier…"
                className="h-8 text-xs"
                data-testid="engines-search"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {enginesQuery.isLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : enginesQuery.isError ? (
                <div
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                  data-testid="engines-error"
                >
                  Failed to load engine registry.{" "}
                  {(enginesQuery.error as Error | undefined)?.message}
                </div>
              ) : groups.length === 0 ? (
                <div
                  className="rounded-2xl border border-dashed border-border/60 p-10 text-center"
                  data-testid="engines-empty"
                >
                  <Cpu className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No engines</p>
                </div>
              ) : (
                <div className="space-y-4" data-testid="engines-graph">
                  {groups.map(([group, items]) => (
                    <div
                      key={group}
                      className="rounded-lg border border-border/40 bg-card/40"
                    >
                      <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                        <Network className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {group}
                        </span>
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          {items.length}
                        </Badge>
                      </div>
                      <ul className="divide-y divide-border/30">
                        {items.map((engine) => {
                          const v = verdict(engine);
                          const isSelected = selected === engine.engine_name;
                          return (
                            <li key={engine.engine_name}>
                              <button
                                type="button"
                                onClick={() => setSelected(engine.engine_name)}
                                className={cn(
                                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/40",
                                  isSelected && "bg-muted/50",
                                )}
                                data-testid={`engine-row-${engine.engine_name}`}
                              >
                                <ChevronRight
                                  className={cn(
                                    "h-3 w-3 text-muted-foreground transition-transform",
                                    isSelected && "rotate-90",
                                  )}
                                />
                                <span className="flex-1 truncate font-medium text-foreground">
                                  {engine.engine_name}
                                </span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className={cn(
                                        "rounded px-1.5 py-0.5 text-[10px]",
                                        statusBadge(
                                          engine.enabled ? engine.status : "disabled",
                                        ),
                                      )}
                                    >
                                      {engine.enabled ? engine.status : "off"}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="left">
                                    <div className="space-y-0.5 text-xs">
                                      <div>last run: {timeAgo(engine.last_run_at)}</div>
                                      <div>success: {engine.success_rate}%</div>
                                      <div>
                                        consecutive failures:{" "}
                                        {engine.consecutive_failures}
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                                <span
                                  className={cn(
                                    "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                                    verdictClass(v),
                                  )}
                                >
                                  {v}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: log tail for selected engine */}
          <div className="flex w-full flex-col lg:w-[45%]">
            <div className="border-b border-border/40 p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <ScrollText className="h-4 w-4 text-primary" />
                Live log tail
              </h2>
              {selectedEngine ? (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono">{selectedEngine.engine_name}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5",
                      statusBadge(
                        selectedEngine.enabled
                          ? selectedEngine.status
                          : "disabled",
                      ),
                    )}
                  >
                    {selectedEngine.enabled ? selectedEngine.status : "off"}
                  </span>
                  <span>
                    success {selectedEngine.success_rate}% ·{" "}
                    {selectedEngine.total_runs} runs
                  </span>
                  {selectedEngine.last_error_message && (
                    <span className="text-red-400">
                      · {selectedEngine.last_error_message.slice(0, 80)}
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Select an engine on the left to stream its run logs.
                </p>
              )}
            </div>

            <div
              className="flex-1 overflow-y-auto p-4"
              data-testid="engines-log-tail"
            >
              {!selected ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
                  <Activity className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No engine selected</p>
                  <p className="text-xs text-muted-foreground">
                    Pick a row to inspect dependencies, verdict and live logs.
                  </p>
                </div>
              ) : logsQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : logsQuery.isError ? (
                <div
                  className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                  data-testid="engines-log-error"
                >
                  Failed to load logs.{" "}
                  {(logsQuery.error as Error | undefined)?.message}
                </div>
              ) : (logsQuery.data ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center">
                  <ScrollText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium">No runs yet</p>
                  <p className="text-xs text-muted-foreground">
                    This engine has not produced any logged runs.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1.5 font-mono text-[11px]">
                  {(logsQuery.data ?? []).map((log) => {
                    const StatusIcon =
                      log.status === "success"
                        ? CheckCircle
                        : log.status === "error"
                          ? XCircle
                          : log.status === "skipped"
                            ? Pause
                            : Activity;
                    const color =
                      log.status === "success"
                        ? "text-emerald-400"
                        : log.status === "error"
                          ? "text-red-400"
                          : log.status === "skipped"
                            ? "text-muted-foreground"
                            : "text-amber-400";
                    return (
                      <li
                        key={log.id}
                        className="rounded border border-border/30 bg-card/30 p-2"
                      >
                        <div className="flex items-center gap-2">
                          <StatusIcon className={cn("h-3 w-3", color)} />
                          <span className={cn("uppercase", color)}>
                            {log.status}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(log.started_at).toLocaleTimeString()}
                          </span>
                          {log.duration_ms !== null && (
                            <span className="ml-auto text-muted-foreground">
                              {log.duration_ms}ms
                            </span>
                          )}
                        </div>
                        {log.effect_summary && (
                          <div className="mt-1 break-words text-foreground/80">
                            {log.effect_summary}
                          </div>
                        )}
                        {log.error_message && (
                          <div className="mt-1 break-words text-red-400">
                            {log.error_message}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}

function VerdictTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/40 p-2 text-center">
      <p className={cn("text-lg font-bold", color)}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
