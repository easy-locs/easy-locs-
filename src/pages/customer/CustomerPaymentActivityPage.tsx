import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CustomerPaymentActivityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["customer-payment-activity", user?.id],
    queryFn: async () => {
      const { data: accounts, error: aErr } = await supabase
        .from("wallet_accounts")
        .select("id")
        .eq("owner_user_id", user!.id);

      if (aErr) throw aErr;
      const ids = (accounts ?? []).map((a: any) => a.id);
      if (!ids.length) return [];

      const { data, error } = await supabase
        .from("wallet_ledger_entries")
        .select("*")
        .in("wallet_account_id", ids)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!user?.id,
    staleTime: 10000,
  });

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button
          onClick={() => navigate("/wallet/hub")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Payment Activity</h1>
          <p className="text-xs text-muted-foreground">Ledger and wallet movement history</p>
        </div>
      </div>

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
              <p className="text-[11px] text-muted-foreground/70 mt-1">
                {row.created_at ? new Date(row.created_at).toLocaleString() : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
