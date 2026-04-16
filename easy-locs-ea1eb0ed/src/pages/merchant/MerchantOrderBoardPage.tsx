import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/services/db";
import { createRestaurantService, getFoodStatusMeta, getFoodNextActions } from "@/domains/restaurant/service";
import { toast } from "sonner";
import { useUiEngine } from "@/hooks/useUiEngine";
import { useAuth } from "@/contexts/AuthContext";
import SubPageShell from "@/components/layout/SubPageShell";
import { useFoodOrderRealtime } from "@/hooks/useFoodOrderRealtime";

interface OrderRow {
  id: string;
  status: string;
  created_at: string;
  total_amount?: number;
  total?: number;
  currency?: string;
}

export default function MerchantOrderBoardPage() {
  useUiEngine("merchant-merchantorderboardpage");
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const { user } = useAuth();

  useFoodOrderRealtime(merchantId);

  const { data: rows = [], isLoading, refetch, isError } = useQuery({
    queryKey: ["merchant-order-board", merchantId],
    queryFn: async () => {
      const { data, error } = await db
        .from("storefront_orders")
        .select("id, status, created_at, total, currency")
        .eq("shop_id", merchantId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as OrderRow[];
    },
    enabled: !!merchantId,
    staleTime: 5000,
    refetchInterval: 7000,
  });

  const advance = async (row: OrderRow, nextStatus: string) => {
    try {
      const svc = createRestaurantService({ userId: user?.id ?? "", role: "merchant" });
      let result: { ok: boolean; error?: string };
      if (nextStatus === "accepted") result = await svc.acceptOrder(row.id);
      else if (nextStatus === "preparing") result = await svc.startPreparing(row.id);
      else if (nextStatus === "ready_for_pickup") result = await svc.markReady(row.id);
      else if (nextStatus === "cancelled") result = await svc.rejectOrder(row.id, "Rejected by merchant");
      else { toast.error("Unknown action"); return; }
      if (!result.ok) { toast.error(result.error ?? "Action failed"); return; }
      toast.success(`Order moved to ${nextStatus}`);
      refetch();
    } catch (err: unknown) {
      void err;
      toast.error("Could not update order");
    }
  };

  return (
    <SubPageShell title="Merchant Orders" subtitle="Live order board" onBack={() => navigate(`/merchant/dashboard/${merchantId}`)} noContentPad>
      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {isError && (
          <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
        )}
        {isLoading && [1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl bg-muted/30 h-28 animate-pulse" />
        ))}

        {!isLoading && rows.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">No orders yet</p>
        )}

        {!isLoading && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((row: OrderRow) => {
              const meta = getFoodStatusMeta(row.status || "pending");
              const nextActions = getFoodNextActions(row.status || "pending");

              return (
                <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">
                        Order #{String(row.id).slice(0, 8)}
                      </p>
                      <p className="text-[0.625rem] text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </p>
                      <p className="text-xs font-bold text-foreground">
                        {Number(row.total ?? row.total_amount ?? 0).toFixed(2)} {row.currency ?? "AED"}
                      </p>
                    </div>

                    <span
                      className="text-[0.625rem] font-bold px-2 py-1 rounded-full"
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
    </SubPageShell>
  );
}
