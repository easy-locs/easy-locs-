import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchOpsDashboardData } from "@/repositories/admin-ops.repository";
import { projectOpsDashboard } from "@/families/dashboard/dashboard.read-model";
import { useMemo } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { getWalletDefaultCurrency } from "@/lib/wallet/wallet-config";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

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
      </div>
    </SubPageShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
