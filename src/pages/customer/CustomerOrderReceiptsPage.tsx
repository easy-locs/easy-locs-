import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function CustomerOrderReceiptsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["customer-order-receipts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,total_amount,currency,status,created_at,payment_status")
        .eq("customer_user_id", user!.id)
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
        <button onClick={() => navigate("/my-orders")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Order Receipts</h1>
          <p className="text-xs text-muted-foreground">Billing history and payment proof</p>
        </div>
      </div>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">No receipts yet</div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Receipt #{String(row.id).slice(0, 8)}</p>
                  <p className="text-xs text-primary font-semibold mt-1">{Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? ""}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-1">{row.created_at ? new Date(row.created_at).toLocaleString() : ""}</p>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{row.payment_status || "unpaid"}</span>
                  <button onClick={() => navigate(`/tracking/${row.id}`)} className="mt-2 block rounded-xl bg-primary/10 text-primary px-3 py-1.5 text-[11px] font-bold">Open Order</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
