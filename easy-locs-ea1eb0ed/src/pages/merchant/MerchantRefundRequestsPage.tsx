import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { merchantService } from "@/services/merchant.service";
import { toast } from "sonner";

export default function MerchantRefundRequestsPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();

  const { data: rows = [], isLoading, refetch , isError } = useQuery({
    queryKey: ["merchant-refund-requests", merchantId],
    queryFn: () => merchantService.fetchOrders(merchantId, { statuses: ["disputed", "refunded"], orderBy: "updated_at", limit: 200 }),
    enabled: !!merchantId,
    staleTime: 5000,
  });

  const markReviewed = async (orderId: string) => {
    try {
      await merchantService.updateOrder(orderId, { refund_reviewed_at: new Date().toISOString() });
      toast.success("Refund request marked reviewed");
      refetch();
    } catch {
      toast.error("Could not update request");
    }
  };

  return (
    <div className="app-mobile-page bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Refund Requests</h1>
          <p className="text-xs text-muted-foreground">Disputes and refunded orders</p>
        </div>
      </div>

      {isError && <div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>}
      {isLoading && [1, 2].map((i) => (<div key={i} className="mx-4 mb-3 h-20 rounded-2xl bg-muted animate-pulse" />))}

      {!isLoading && rows.length === 0 && (
        <div className="px-4 py-12 text-center text-sm text-muted-foreground">No refund requests</div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <div key={row.id} className="rounded-2xl border border-border/20 bg-card p-4">
              <p className="text-sm font-bold text-foreground">Order #{String(row.id).slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground mt-1">{row.status} · {Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? "AED"}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-1">{row.updated_at ? new Date(row.updated_at).toLocaleString() : ""}</p>
              <button onClick={() => markReviewed(row.id)} className="mt-3 w-full rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm font-bold">Mark Reviewed</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
