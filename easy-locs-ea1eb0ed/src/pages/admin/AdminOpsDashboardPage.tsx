import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchOpsDashboardData } from "@/repositories/admin-ops.repository";
import { projectOpsDashboard } from "@/families/dashboard/dashboard.read-model";
import { useMemo } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { getWalletDefaultCurrency } from "@/lib/wallet/wallet-config";
import { Loader2, AlertTriangle, RefreshCw, GitMerge, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";
import {
  fetchMergeConflictRecoveryEvents,
  projectMergeConflictRecoverySummary,
} from "@/repositories/merge-conflict-recovery.repository";

export default function AdminOpsDashboardPage() {
  useUiEngine("admin-adminopsdashboardpage");
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["admin-ops-dashboard"], queryFn: fetchOpsDashboardData, staleTime: 15_000 });

  const walletCurrency = useWalletStore((s) => s.wallet?.currency) ?? getWalletDefaultCurrency();

  const model = useMemo(
    () => projectOpsDashboard(data?.orders ?? [], data?.merchants ?? [], data?.tickets ?? [], walletCurrency),
    [data, walletCurrency],
  );

  return (
    <SubPageShell>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-bold">←</button>
        <div>
          <h1 className="text-lg font-bold">Operations Dashboard</h1>
          <p className="text-xs text-muted-foreground">Marketplace health</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">Failed to load dashboard</p>
          <p className="text-xs text-muted-foreground mb-4">Something went wrong. Please try again.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-2 gap-3">
          {model.metrics.map((m) => (
            <Metric key={m.title} title={m.title} value={m.value} />
          ))}
        </div>
      )}

      <MergeConflictRecoveryWidget onOpen={() => navigate("/admin/merge-conflict-recovery")} />
      </div>
    </SubPageShell>
  );
}

function MergeConflictRecoveryWidget({ onOpen }: { onOpen: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-merge-conflict-recovery-summary"],
    queryFn: fetchMergeConflictRecoveryEvents,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const summary = useMemo(
    () => projectMergeConflictRecoverySummary(data ?? []),
    [data],
  );
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left rounded-2xl border border-border/40 bg-card p-4 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start gap-3">
        <GitMerge className="h-4 w-4 mt-0.5 text-muted-foreground" />
        <div className="flex-1">
          <p className="text-[0.6875rem] uppercase tracking-wider text-muted-foreground font-medium">
            Merge-conflict recovery (14d)
          </p>
          {isLoading ? (
            <p className="text-sm text-muted-foreground mt-1">Loading…</p>
          ) : (
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-xl font-bold tabular-nums">
                {summary.totalEvents}
              </span>
              <span className="text-xs text-muted-foreground">events</span>
              <span className="text-xs text-muted-foreground">
                · {summary.affectedTasks} task{summary.affectedTasks === 1 ? "" : "s"}
              </span>
            </div>
          )}
          {!isLoading && summary.topFiles.length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-1 truncate">
              Top: <code className="font-mono">{summary.topFiles[0].file}</code>
              {" "}({summary.topFiles[0].count})
            </p>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-[0.6875rem] text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
