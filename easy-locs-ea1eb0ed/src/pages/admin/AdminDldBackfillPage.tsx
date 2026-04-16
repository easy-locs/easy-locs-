import { useState } from "react";
import type { ReactNode } from "react";
import SubPageShell from "@/components/layout/SubPageShell";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Play, RefreshCw, AlertTriangle, CheckCircle2, Clock, Database } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";

interface BackfillRun {
  id: string;
  months_requested: number;
  months_processed: number;
  total_fetched: number;
  total_upserted: number;
  total_errors: number;
  start_date: string | null;
  end_date: string | null;
  duration_ms: number;
  month_details: MonthDetail[];
  created_at: string;
}

interface MonthDetail {
  month: string;
  fromDate: string;
  toDate: string;
  fetched: number;
  upserted: number;
  errors: number;
  pages: number;
  skipped: boolean;
  truncated: boolean;
}

interface BackfillStatus {
  totalRecords: number;
  oldestTransaction: string | null;
  newestTransaction: string | null;
  backfillRuns: BackfillRun[];
}

interface BackfillResult {
  monthsProcessed: number;
  totalFetched: number;
  totalUpserted: number;
  totalErrors: number;
  truncatedMonths: number;
  months: MonthDetail[];
  startDate: string;
  endDate: string;
  durationMs: number;
}

async function fetchBackfillStatus(): Promise<BackfillStatus> {
  const { data, error } = await supabase.functions.invoke("dld-analytics", {
    headers: { "x-endpoint": "backfill-status" },
  });
  if (error) throw error;
  return data;
}

async function triggerBackfill(months: number): Promise<BackfillResult> {
  const { data, error } = await supabase.functions.invoke("dld-analytics", {
    headers: {
      "x-endpoint": "backfill",
      "x-params": `months=${months}`,
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export default function AdminDldBackfillPage() {
  useUiEngine("admin-admindldbackfillpage");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [months, setMonths] = useState(6);
  const [lastResult, setLastResult] = useState<BackfillResult | null>(null);

  const { data: status, isLoading, refetch } = useQuery({
    queryKey: ["dld-backfill-status"],
    queryFn: fetchBackfillStatus,
    staleTime: 15_000,
  });

  const backfillMutation = useMutation({
    mutationFn: triggerBackfill,
    onSuccess: (result) => {
      setLastResult(result);
      queryClient.invalidateQueries({ queryKey: ["dld-backfill-status"] });
    },
  });

  return (
    <SubPageShell noContentPad className="bg-background p-4 space-y-4 max-w-lg mx-auto">
      <header className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">DLD Backfill</h1>
          <p className="text-xs text-muted-foreground">Trigger and monitor historical data imports</p>
        </div>
      </header>

      <section className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Data Coverage</p>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center active:scale-95 transition-transform"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-muted/30 h-10 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && status && (
          <div className="grid grid-cols-3 gap-2">
            <StatCard icon={<Database className="w-3.5 h-3.5" />} label="Total Records" value={status.totalRecords.toLocaleString()} />
            <StatCard icon={<Clock className="w-3.5 h-3.5" />} label="Oldest" value={status.oldestTransaction ? formatDate(status.oldestTransaction) : "—"} />
            <StatCard icon={<Clock className="w-3.5 h-3.5" />} label="Newest" value={status.newestTransaction ? formatDate(status.newestTransaction) : "—"} />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Trigger Backfill</p>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Months to backfill</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={36}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="flex-1 accent-primary"
              disabled={backfillMutation.isPending}
            />
            <span className="text-sm font-bold text-foreground w-8 text-right">{months}</span>
          </div>
        </div>

        <button
          onClick={() => backfillMutation.mutate(months)}
          disabled={backfillMutation.isPending}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {backfillMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running backfill…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start Backfill ({months} months)
            </>
          )}
        </button>

        {backfillMutation.isError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive">{(backfillMutation.error as Error).message}</p>
          </div>
        )}
      </section>

      {lastResult && (
        <section className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Latest Run Result</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Fetched" value={lastResult.totalFetched.toLocaleString()} />
            <StatCard label="Upserted" value={lastResult.totalUpserted.toLocaleString()} />
            <StatCard label="Errors" value={lastResult.totalErrors.toLocaleString()} />
            <StatCard label="Duration" value={formatDuration(lastResult.durationMs)} />
          </div>

          {lastResult.truncatedMonths > 0 && (
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                {lastResult.truncatedMonths} month(s) hit the page limit and may have incomplete data.
              </p>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Monthly Breakdown</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {lastResult.months.map((m, i) => (
                <MonthRow key={i} month={m} />
              ))}
            </div>
          </div>
        </section>
      )}

      {!isLoading && status && status.backfillRuns.length > 0 && (
        <section className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Run History</p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {status.backfillRuns.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        </section>
      )}
    </SubPageShell>
  );
}

function StatCard({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/10 bg-muted/20 p-3 space-y-0.5">
      <div className="flex items-center gap-1">
        {icon}
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function MonthRow({ month }: { month: MonthDetail }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/10 bg-muted/10 px-3 py-1.5">
      <span className="text-xs font-medium text-foreground">{month.month}</span>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>{month.fetched} fetched</span>
        <span>{month.upserted} upserted</span>
        {month.errors > 0 && <span className="text-destructive">{month.errors} err</span>}
        {month.truncated && (
          <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-0.5">
            <AlertTriangle className="w-3 h-3" /> truncated
          </span>
        )}
      </div>
    </div>
  );
}

function RunCard({ run }: { run: BackfillRun }) {
  const [expanded, setExpanded] = useState(false);
  const hasErrors = run.total_errors > 0;
  const details = Array.isArray(run.month_details) ? run.month_details : [];
  const hasTruncated = details.some((d) => d.truncated);

  return (
    <div className="rounded-xl border border-border/10 bg-muted/10 p-3 space-y-2">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground">
            {run.months_processed}/{run.months_requested} months
          </span>
          <span className="text-[10px] text-muted-foreground">{formatTimestamp(run.created_at)}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>{run.total_fetched.toLocaleString()} fetched</span>
          <span>{run.total_upserted.toLocaleString()} upserted</span>
          <span>{formatDuration(run.duration_ms)}</span>
          {hasErrors && <span className="text-destructive">{run.total_errors} errors</span>}
          {hasTruncated && <span className="text-yellow-600 dark:text-yellow-400">truncated</span>}
        </div>
      </button>

      {expanded && details.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-border/10">
          {details.map((m, i) => (
            <MonthRow key={i} month={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}
