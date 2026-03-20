import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getV1WalletAccounts, getV1WalletLedger } from "@/lib/v1/v1WalletCore";

export default function V1WalletHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: accounts = [] } = useQuery({
    queryKey: ["v1-wallet-accounts", user?.id],
    queryFn: () => getV1WalletAccounts(user!.id),
    enabled: !!user?.id,
    staleTime: 10000,
  });

  const { data: ledger = [] } = useQuery({
    queryKey: ["v1-wallet-ledger", user?.id],
    queryFn: () => getV1WalletLedger(user!.id),
    enabled: !!user?.id,
    staleTime: 10000,
  });

  const totalBalance = accounts.reduce((sum: number, row: any) => sum + Number(row.balance ?? 0), 0);

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-5">
      <div className="rounded-[28px] border border-border/20 bg-card p-6 text-center">
        <div className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground">Total Balance</div>
        <div className="text-3xl font-bold mt-2">{totalBalance.toFixed(2)} AED</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Scan QR", path: "/pay/scan" },
          { label: "Pay", path: "/wallet/hub" },
          { label: "Receive", path: "/wallet/hub" },
        ].map((row) => (
          <button key={row.label} onClick={() => navigate(row.path)} className="rounded-[24px] border border-border/20 bg-card px-3 py-4 text-center text-xs font-bold active:scale-[0.98] transition-transform">
            {row.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {ledger.map((row: any) => (
          <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold">{row.entry_type || "entry"}</div>
              <div className="text-xs text-muted-foreground mt-1">{new Date(row.created_at).toLocaleString()}</div>
            </div>
            <div className={`text-sm font-bold ${row.direction === "in" ? "text-emerald-500" : "text-destructive"}`}>
              {row.direction === "in" ? "+" : "-"}{Number(row.amount ?? 0).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
