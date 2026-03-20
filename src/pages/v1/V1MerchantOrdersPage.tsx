import { toast } from "sonner";
import { useMerchantV1Orders } from "@/hooks/useMerchantV1Orders";
import { advanceMerchantOrderStatus, getMerchantNextStatuses } from "@/lib/v1/merchantOrderFlow";

export default function V1MerchantOrdersPage({ merchantId }: { merchantId: string }) {
  const { data: rows = [], isLoading, refetch } = useMerchantV1Orders(merchantId);

  const handleAdvance = async (row: any, nextStatus: string) => {
    try {
      await advanceMerchantOrderStatus({
        orderId: row.id,
        currentStatus: row.status,
        nextStatus,
      });
      toast.success(`Order moved to ${nextStatus}`);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Could not update order");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <h1 className="text-lg font-bold text-foreground">Merchant Orders</h1>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-[28px] bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <div className="rounded-[28px] border border-border/20 bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">No orders yet</p>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="space-y-3">
          {rows.map((row: any) => {
            const actions = getMerchantNextStatuses(row.status || "draft");

            return (
              <div key={row.id} className="rounded-[28px] border border-border/20 bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      Order #{String(row.id).slice(0, 8)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? "AED"}
                    </div>
                  </div>

                  <div className="rounded-full bg-primary/10 text-primary px-3 py-1 text-[11px] font-bold">
                    {row.status || "draft"}
                  </div>
                </div>

                {actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {actions.map((action) => (
                      <button
                        key={action}
                        onClick={() => handleAdvance(row, action)}
                        className="rounded-2xl bg-muted px-3 py-3 text-xs font-bold text-foreground"
                      >
                        {action}
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
