import { db } from "@/services/db";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { autoSettleCompletedOrders, refundDisputedOrder } from "@/lib/settlement/orderSettlement";
import { toast } from "sonner";

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/20 bg-card p-4">
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-lg font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}

export default function AdminPaymentsOpsPage() {
  const navigate = useNavigate();

  const { data: orders = [], refetch, isLoading } = useQuery({
    queryKey: ["admin-payments-ops-orders"],
    queryFn: async () => {
      const { data, error } = await db
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10000,
  });

  const captured = orders.filter((o: any) => ["captured", "paid"].includes(String(o.payment_status ?? ""))).length;
  const refunded = orders.filter((o: any) => String(o.payment_status ?? "") === "refunded").length;
  const pendingSettlement = orders.filter((o: any) =>
    String(o.status ?? "") === "completed" &&
    (!o.settlement_status || String(o.settlement_status) === "pending")
  ).length;

  const runSettlement = async () => {
    try {
      const result = await autoSettleCompletedOrders(50);
      const ok = result.filter((r) => r.ok).length;
      toast.success(`Settled ${ok} orders`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Settlement run failed");
    }
  };

  const quickRefund = async (order: any) => {
    try {
      await refundDisputedOrder({
        orderId: order.id,
        customerUserId: order.customer_user_id,
        amount: Number(order.total_amount ?? 0),
        currency: order.currency ?? "AED",
        reason: "admin_refund",
      });
      toast.success("Order refunded");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Refund failed");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold">Payments Operations</h1>
          <p className="text-xs text-muted-foreground">Capture, refund, settlement</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Metric title="Captured" value={String(captured)} />
        <Metric title="Refunded" value={String(refunded)} />
        <Metric title="Pending Settlement" value={String(pendingSettlement)} />
      </div>

      <button onClick={runSettlement} className="w-full rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold">
        Run Auto Settlement
      </button>

      {isLoading && [1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}

      {!isLoading && (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <div key={order.id} className="rounded-2xl border border-border/20 bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Number(order.total_amount ?? 0).toFixed(2)} {order.currency ?? "AED"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    status: {order.status ?? "draft"} · payment: {order.payment_status ?? "unpaid"}
                  </p>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                  {order.settlement_status ?? "pending"}
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => quickRefund(order)}
                  className="flex-1 rounded-xl bg-destructive/10 text-destructive px-3 py-2 text-xs font-bold"
                >
                  Refund
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
