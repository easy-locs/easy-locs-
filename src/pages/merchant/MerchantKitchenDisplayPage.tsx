import { useNavigate, useParams } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

type KitchenOrder = { id: string; code: string; items: number; status: "new" | "preparing" | "ready" };

export default function MerchantKitchenDisplayPage() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [orders, setOrders] = useState<KitchenOrder[]>([
    { id: "1", code: "KT-1001", items: 3, status: "new" },
    { id: "2", code: "KT-1002", items: 2, status: "preparing" },
    { id: "3", code: "KT-1003", items: 1, status: "ready" },
  ]);

  const advance = (id: string) => {
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: o.status === "new" ? "preparing" : "ready" } : o));
    toast.success("Kitchen order updated");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 space-y-4">
      <Header title="Kitchen Display" subtitle="Manage food preparation" onBack={() => navigate(`/merchant/dashboard/${merchantId}`)} />
      <div className="space-y-3">
        {orders.map((order) => (
          <div key={order.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold">{order.code}</div>
                <div className="text-xs text-muted-foreground mt-1">{order.items} item{order.items > 1 ? "s" : ""}</div>
              </div>
              <StatusChip status={order.status} />
            </div>
            {order.status !== "ready" && (
              <button onClick={() => advance(order.id)} className="rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold w-full mt-4">
                {order.status === "new" ? "Start Preparing" : "Mark Ready"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
      <div><h1 className="text-lg font-bold">{title}</h1><p className="text-xs text-muted-foreground">{subtitle}</p></div>
    </div>
  );
}

function StatusChip({ status }: { status: "new" | "preparing" | "ready" }) {
  const cls = status === "new" ? "bg-amber-500/10 text-amber-500" : status === "preparing" ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-500";
  return <div className={`rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>{status}</div>;
}
