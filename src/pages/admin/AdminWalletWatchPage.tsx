import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchWalletWatchData } from "@/repositories/admin-ops.repository";

export default function AdminWalletWatchPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({ queryKey: ["admin-wallet-watch"], queryFn: fetchWalletWatchData, staleTime: 10000 });

  const accounts = data?.accounts ?? [];
  const ledger = data?.ledger ?? [];
  const totalBalance = accounts.reduce((sum: number, row: any) => sum + Number(row.balance ?? 0), 0);
  const inCount = ledger.filter((row: any) => row.direction === "in").length;
  const outCount = ledger.filter((row: any) => row.direction === "out").length;

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Wallet Watch</h1>
          <p className="text-xs text-muted-foreground">Wallet accounts and ledger pulse</p>
        </div>
      </div>
      {isLoading ? (
        <>{[1, 2].map((i) => <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />)}</>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 px-4 pb-4">
            <Metric title="Accounts" value={String(accounts.length)} />
            <Metric title="Inflows" value={String(inCount)} />
            <Metric title="Outflows" value={String(outCount)} />
          </div>
          <div className="rounded-2xl border border-border/20 bg-card p-4 mx-4">
            <p className="text-sm font-bold text-foreground">Total Wallet Balance</p>
            <p className="text-2xl font-bold text-foreground mt-1">{Number(totalBalance).toFixed(2)} AED</p>
          </div>
        </>
      )}
    </div>
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
