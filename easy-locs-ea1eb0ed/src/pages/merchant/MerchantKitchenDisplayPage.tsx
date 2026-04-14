import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { merchantService } from "@/services/merchant.service";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function MerchantKitchenDisplayPage() {
  useUiEngine("merchant-merchantkitchendisplaypage");
  const navigate = useNavigate();
  const { merchantId } = useParams();

  const { data: rows = [], isLoading , isError } = useQuery({
    queryKey: ["merchant-kds-orders", merchantId],
    queryFn: () => merchantService.fetchOrders(merchantId!, { statuses: ["paid", "confirmed", "preparing", "ready_for_pickup"], limit: 50 }),
    enabled: !!merchantId,
    staleTime: 5000,
    refetchInterval: 5000,
  });

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Kitchen Display</h1>
          <p className="text-xs text-muted-foreground">Live order queue</p>
        </div>
      </div>

      {isError && <div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>}
      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-[28px] bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-[28px] border border-border/20 bg-card p-6 text-center">
          <div className="text-3xl">🍽️</div>
          <div className="text-base font-bold mt-3">No active orders</div>
          <div className="text-sm text-muted-foreground mt-2">Kitchen queue is clear</div>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">Order #{String(row.id).slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                  row.status === "preparing" ? "bg-amber-500/10 text-amber-500" :
                  row.status === "ready_for_pickup" ? "bg-emerald-500/10 text-emerald-500" :
                  "bg-primary/10 text-primary"
                }`}>
                  {row.status}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? "AED"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
