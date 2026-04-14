import { db } from "@/services/db";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function DriverEarningsSummaryPage() {
  useUiEngine("driver-driverearningssummarypage");
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading , isError } = useQuery({
    queryKey: ["driver-earnings-summary-page", user?.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("wallet_ledger_entries")
        .select("*")
        .eq("reference_type", "order")
        .eq("entry_type", "payout")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = data ?? [];
      const total = rows.reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0);
      return { total, count: rows.length, rows };
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });

  if (isError) return (<div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>);

  return (
    <SubPageShell title="Earnings Summary" subtitle="Driver payout overview" onBack={() => navigate("/driver/dashboard")} noContentPad>

      {isLoading ? (
        <>
          <div className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
          <div className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            <Metric title="Total Earned" value={`${Number(data?.total ?? 0).toFixed(2)} AED`} />
            <Metric title="Payouts" value={String(data?.count ?? 0)} />
          </div>

          <div className="px-4 space-y-3">
            {(data?.rows ?? []).slice(0, 20).map((row: any) => (
              <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
                <p className="text-sm font-bold text-emerald-500 tabular-nums">+{Number(row.amount ?? 0).toFixed(2)} {row.currency ?? "AED"}</p>
                <p className="text-xs text-muted-foreground">{row.note || "Driver payout"}</p>
                <p className="text-[11px] text-muted-foreground/70">{row.created_at ? new Date(row.created_at).toLocaleString() : ""}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </SubPageShell>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4 text-center">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
