import SubPageShell from "@/components/layout/SubPageShell";
import { db } from "@/services/db";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusChip } from "@/components/orders/OrderStatusChip";
import { useUiEngine } from "@/hooks/useUiEngine";

const DELIVERY_STATUSES = ["driver_search", "driver_assigned", "picked_up", "on_the_way", "delivered", "completed", "cancelled"];

export default function AdminDeliveryOpsPage() {
  useUiEngine("admin-admindeliveryopspage");
  const navigate = useNavigate();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-delivery-ops"],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("id,status,created_at")
        .in("status", DELIVERY_STATUSES)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10_000,
  });

  const counts = useMemo(() => {
    const get = (s: string) => orders.filter((o: any) => o.status === s).length;
    return {
      search: get("driver_search"),
      assigned: get("driver_assigned"),
      picked: get("picked_up"),
      way: get("on_the_way"),
      delivered: get("delivered"),
      cancelled: get("cancelled"),
    };
  }, [orders]);

  return (
    <SubPageShell noContentPad className="flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate("/admin/marketplace-ops")} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted active:scale-95 transition-transform">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Delivery Operations</h1>
          <p className="text-xs text-muted-foreground">Mission pipeline</p>
        </div>
      </header>

      <div className="px-4 pb-[var(--page-bottom-pad)] space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { title: "Searching", value: counts.search },
            { title: "Assigned", value: counts.assigned },
            { title: "Picked up", value: counts.picked },
            { title: "On the way", value: counts.way },
            { title: "Delivered", value: counts.delivered },
            { title: "Cancelled", value: counts.cancelled },
          ].map((m) => (
            <div key={m.title} className="rounded-2xl border border-border/20 bg-card p-3 text-center">
              <p className="text-[0.625rem] text-muted-foreground font-semibold">{m.title}</p>
              <p className="text-lg font-bold text-foreground">{m.value}</p>
            </div>
          ))}
        </div>

        {isLoading && <Skeleton className="h-32 rounded-2xl" />}

        {!isLoading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Truck className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No delivery flow data yet</p>
          </div>
        )}

        {!isLoading && orders.slice(0, 20).map((order: any) => (
          <div key={order.id} className="rounded-2xl border border-border/20 bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Order #{order.id.slice(0, 8)}</p>
                <p className="text-[0.6875rem] text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <OrderStatusChip status={order.status} variant="admin" />
            </div>
          </div>
        ))}
      </div>
    </SubPageShell>
  );
}
