import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchArchivedOrders } from "@/repositories/customer-orders.repository";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import { useUiEngine } from "@/hooks/useUiEngine";

export default function CustomerOrderArchivePage() {
  useUiEngine("customer-customerorderarchivepage");
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading , isError } = useQuery({
    queryKey: ["customer-order-archive", user?.id],
    queryFn: () => fetchArchivedOrders(user?.id),
    enabled: !!user?.id,
    staleTime: 10000,
  });

  return (
    <div className="app-mobile-page app-mobile-content bg-background">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate("/my-orders")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Order Archive</h1>
          <p className="text-xs text-muted-foreground">Past completed and closed orders</p>
        </div>
      </div>

      {isError && <div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>}
      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && rows.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">No archived orders</p>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any) => (
            <button key={row.id} onClick={() => navigate(`/tracking/${row.id}`)} className="w-full rounded-2xl border border-border/20 bg-card p-4 text-left active:scale-[0.99] transition-transform">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">Order #{String(row.id).slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? ""}</p>
                  <p className="text-[11px] text-muted-foreground/70">{row.created_at ? new Date(row.created_at).toLocaleString() : ""}</p>
                </div>
                <OrderStatusBadge status={row.status || "draft"} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
