import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function MerchantRealtimeOrdersBoard() {
  const navigate = useNavigate();
  const { merchantId = "" } = useParams();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setOrders((prev) => [
        { id: Math.random().toString(), total: (Math.random() * 100).toFixed(2), status: "new" },
        ...prev.slice(0, 5),
      ]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(`/merchant/dashboard/${merchantId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">←</button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Live Orders</h1>
          <p className="text-xs text-muted-foreground">Realtime incoming orders</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-border/20 bg-card p-4">
            <div className="text-sm font-bold text-foreground">Order #{o.id.slice(0, 6)}</div>
            <div className="text-xs text-muted-foreground mt-1">{o.total} AED</div>
            <span className="inline-block mt-2 rounded-full bg-emerald-500/10 text-emerald-500 px-2 py-0.5 text-[10px] font-bold">New</span>
          </div>
        ))}
      </div>
    </div>
  );
}
