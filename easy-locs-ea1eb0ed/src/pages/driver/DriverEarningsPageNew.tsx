import { db } from "@/services/db";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { formatMoneyByCountry } from "@/lib/currency-engine";
import { ArrowLeft } from "lucide-react";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function DriverEarningsPageNew() {
  useUiEngine("driver-earnings");
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading , isError } = useQuery({
    queryKey: ["driver-earnings-page-v2", user?.id],
    queryFn: async () => {
      const { data: walletAccounts, error: walletErr } = await db
        .from("wallet_accounts")
        .select("id")
        .eq("owner_user_id", user?.id);

      if (walletErr) throw walletErr;

      const ids = (walletAccounts ?? []).map((r: any) => r.id);
      if (!ids.length) {
        return { total: 0, payouts: [] as any[] };
      }

      const { data: ledgerRows, error: ledgerErr } = await db
        .from("wallet_ledger_entries")
        .select("*")
        .in("wallet_account_id", ids)
        .eq("entry_type", "payout")
        .order("created_at", { ascending: false })
        .limit(200);

      if (ledgerErr) throw ledgerErr;

      const payouts = ledgerRows ?? [];
      const total = payouts.reduce(
        (sum: number, row: any) => sum + Number(row.amount ?? 0),
        0
      );

      return { total, payouts };
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });

  return (
    <div className="app-mobile-page flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
        <button
          onClick={() => navigate("/driver/dashboard")}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted/60 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground tracking-tight">Earnings</h1>
          <p className="text-[11px] text-muted-foreground">Payout history & totals</p>
        </div>
      </header>

      {isError && <div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>}
      {isLoading && [1, 2].map((i) => (
        <div key={i} className="mx-4 mt-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && data && (
        <>
          <div className="mx-4 rounded-2xl border border-border/20 bg-card p-6 text-center">
            <p className="text-xs text-muted-foreground">Total Earnings</p>
            <p className="text-2xl font-bold text-foreground">
              {formatMoneyByCountry(Number(data.total ?? 0))}
            </p>
          </div>

          <div className="px-4 pt-4 pb-24 space-y-3">
            {data.payouts.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                No driver payouts yet
              </p>
            ) : (
              data.payouts.map((row: any) => (
                <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
                  <p className="text-sm font-bold text-foreground">
                    +{formatMoneyByCountry(Number(row.amount ?? 0), null, row.currency)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.note || "Driver payout"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
