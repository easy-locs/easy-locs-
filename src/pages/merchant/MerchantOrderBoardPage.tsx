import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStatusMeta, getNextActions } from "@/lib/orders/order-status";
import { setOrderStatus } from "@/lib/orders/orderActions";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export default function MerchantOrderBoardPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["merchant-order-board", merchantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("orders")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: !!merchantId,
    staleTime: 5000,
    refetchInterval: 7000,
  });

  const advance = async (row: any, nextStatus: string) => {
    try {
      await setOrderStatus({
        orderId: row.id,
        currentStatus: row.status,
        nextStatus: nextStatus as any,
      });
      toast.success(`Order moved to ${nextStatus}`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Could not update order");
    }
  };

  return (
    <div className="app-mobile-page bg-background p-4 space-y-4 max-w-lg mx-auto">
      <header className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/merchant/dashboard/${merchantId}`)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Merchant Orders</h1>
          <p className="text-xs text-muted-foreground">Live order board</p>
        </div>
      </header>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl bg-muted/30 h-28 animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-8">
          No orders yet
        </p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row: any) => {
            const meta = getStatusMeta(row.status || "draft");
            const nextActions = getNextActions(row.status || "draft");

            return (
              <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">
                      Order #{String(row.id).slice(0, 8)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </p>
                    <p className="text-xs font-bold text-foreground">
                      {Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? "AED"}
                    </p>
                  </div>

                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-full"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {meta.merchantLabel}
                  </span>
                </div>

                {nextActions.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {nextActions.slice(0, 4).map((action) => (
                      <button
                        key={action.nextStatus}
                        onClick={() => advance(row, action.nextStatus)}
                        className="rounded-xl bg-primary/10 text-primary px-3 py-2 text-xs font-bold"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
