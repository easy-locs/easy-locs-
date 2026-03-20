import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function OrderReceiptPage() {
  const navigate = useNavigate();
  const { orderId = "" } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ["order-receipt-page", orderId],
    queryFn: async () => {
      const { data: order, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

      if (error) throw error;

      const { data: items, error: itemsErr } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (itemsErr) throw itemsErr;

      return { order, items: items ?? [] };
    },
    enabled: !!orderId,
    staleTime: 10000,
  });

  const order = data?.order as any;
  const items = data?.items ?? [];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background pb-24">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button
          onClick={() => navigate("/my-orders")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Order Receipt</h1>
          <p className="text-xs text-muted-foreground">
            {orderId ? `#${orderId.slice(0, 8)}` : ""}
          </p>
        </div>
      </header>

      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mt-3 h-16 rounded-2xl bg-muted animate-pulse" />
      ))}

      {!isLoading && !order && (
        <p className="text-center text-xs text-muted-foreground py-12">Receipt not found</p>
      )}

      {!isLoading && order && (
        <>
          <div className="mx-4 rounded-2xl border border-border/20 bg-card p-4 space-y-1">
            <p className="text-sm font-bold text-foreground">Order Summary</p>
            <p className="text-[11px] text-muted-foreground">
              Created {order.created_at ? new Date(order.created_at).toLocaleString() : ""}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Status: {order.status ?? "draft"} · Payment: {order.payment_status ?? "unpaid"}
            </p>
          </div>

          <div className="mx-4 mt-3 rounded-2xl border border-border/20 bg-card p-4 space-y-2">
            <p className="text-sm font-bold text-foreground">Items</p>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">No items found</p>
            ) : (
              items.map((item: any, idx: number) => (
                <div key={item.id ?? idx} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {Number(item.quantity ?? 0)}× {item.item_name || item.name || "Item"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(item.notes ?? "").toString()}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-foreground">
                    {(Number(item.quantity ?? 0) * Number(item.unit_price ?? item.price ?? 0)).toFixed(2)} AED
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="mx-4 mt-3 rounded-2xl border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Total</p>
              <p className="text-base font-bold text-foreground">
                {Number(order.total_amount ?? 0).toFixed(2)} {order.currency ?? "AED"}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/tracking/${order.id}`)}
            className="mx-4 mt-4 w-[calc(100%-2rem)] rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold"
          >
            Track Order
          </button>
        </>
      )}
    </div>
  );
}
