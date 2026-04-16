import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchWalletActivity } from "@/repositories/payments.repository";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function CustomerPaymentActivityPage() {
  useUiEngine("customer-customerpaymentactivitypage");
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ["customer-payment-activity", user?.id],
    queryFn: () => fetchWalletActivity(user?.id),
    enabled: !!user?.id,
    staleTime: 10000,
  });

  return (
    <SubPageShell title="Payment Activity" subtitle="Ledger and wallet movement history" onBack={() => navigate("/wallet")} noContentPad>
      {isError && (
        <div className="px-4 py-4">
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
        </div>
      )}
      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">
          No payment activity yet
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <p className={`text-sm font-bold ${row.direction === "in" ? "text-emerald-500" : "text-destructive"}`}>
                {row.direction === "in" ? "+" : "-"}
                {Number(row.amount ?? 0).toFixed(2)} {row.currency ?? ""}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {row.entry_type || "transaction"}
              </p>
              <p className="text-[0.6875rem] text-muted-foreground/70 mt-1">
                {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </SubPageShell>
  );
}
