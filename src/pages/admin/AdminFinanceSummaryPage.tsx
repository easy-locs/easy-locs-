import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchFinanceSummaryData } from "@/repositories/admin-ops.repository";

export default function AdminFinanceSummaryPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-finance-summary"],
    queryFn: async () => {
      const raw = await fetchFinanceSummaryData();
      return {
        grossGMV: raw.orders.reduce((sum: number, row: any) => sum + Number(row.total_amount ?? 0), 0),
        capturedOrders: raw.orders.filter((row: any) => ["captured", "paid"].includes(String(row.payment_status ?? ""))).length,
        refundedOrders: raw.orders.filter((row: any) => ["refunded"].includes(String(row.payment_status ?? ""))).length,
        walletIn: raw.ledger.filter((row: any) => row.direction === "in").reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0),
        walletOut: raw.ledger.filter((row: any) => row.direction === "out").reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0),
        totalWalletBalance: raw.wallets.reduce((sum: number, row: any) => sum + Number(row.balance ?? 0), 0),
      };
    },
    staleTime: 10000,
  });

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Finance Summary</h1>
          <p className="text-xs text-muted-foreground">Platform money overview</p>
        </div>
      </div>
      {isLoading && [1, 2, 3].map((i) => <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />)}
      {!isLoading && data && (
        <div className="grid grid-cols-2 gap-3 px-4">
          <Metric title="Gross GMV" value={`${data.grossGMV.toFixed(2)} AED`} />
          <Metric title="Captured Orders" value={String(data.capturedOrders)} />
          <Metric title="Refunded Orders" value={String(data.refundedOrders)} />
          <Metric title="Wallet In" value={`${data.walletIn.toFixed(2)} AED`} />
          <Metric title="Wallet Out" value={`${data.walletOut.toFixed(2)} AED`} />
          <Metric title="Total Wallet Balance" value={`${data.totalWalletBalance.toFixed(2)} AED`} />
        </div>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}
