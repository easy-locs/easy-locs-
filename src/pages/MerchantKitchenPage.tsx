import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ChefHat, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface KitchenOrder {
  id: string;
  order_id: string;
  source_type: string;
  order_type: string;
  table_number: string | null;
  notes: string | null;
  kitchen_status: string;
  created_at: string;
}

const STATUS_FLOW: Record<string, string> = {
  new: "preparing",
  preparing: "ready",
  ready: "served",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  preparing: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ready: "bg-green-500/20 text-green-400 border-green-500/30",
  served: "bg-[hsl(220,15%,30%)] text-[hsl(220,15%,60%)] border-transparent",
  picked_up: "bg-[hsl(220,15%,30%)] text-[hsl(220,15%,60%)] border-transparent",
};

function elapsed(created: string) {
  const diff = Math.floor((Date.now() - new Date(created).getTime()) / 1000);
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MerchantKitchenPage() {
  const [params] = useSearchParams();
  const merchantProfileId = params.get("id");
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!merchantProfileId) return;

    const load = async () => {
      const { data } = await (supabase as any)
        .from("pos_orders")
        .select("*")
        .in("kitchen_status", ["new", "preparing", "ready"])
        .order("created_at", { ascending: true });
      setOrders(data ?? []);
    };

    load();

    // Realtime subscription
    const channel = supabase
      .channel("kitchen-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "pos_orders" }, () => load())
      .subscribe();

    // Timer tick
    const timer = setInterval(() => setTick(t => t + 1), 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(timer);
    };
  }, [merchantProfileId]);

  const advance = async (order: KitchenOrder) => {
    const next = STATUS_FLOW[order.kitchen_status];
    if (!next) return;

    await (supabase as any).from("pos_orders").update({
      kitchen_status: next,
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);

    toast.success(`Order → ${next.toUpperCase()}`);
  };

  const grouped = {
    new: orders.filter(o => o.kitchen_status === "new"),
    preparing: orders.filter(o => o.kitchen_status === "preparing"),
    ready: orders.filter(o => o.kitchen_status === "ready"),
  };

  return (
    <div className="min-h-screen bg-[hsl(220,30%,6%)] text-white p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ChefHat className="w-7 h-7 text-[hsl(45,80%,55%)]" />
        <h1 className="text-2xl font-bold">Kitchen Display</h1>
        <Badge variant="outline" className="ml-auto border-[hsl(220,20%,25%)] text-[hsl(220,15%,60%)]">
          {orders.length} active
        </Badge>
      </div>

      {/* Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {(["new", "preparing", "ready"] as const).map(status => (
          <div key={status} className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${status === "new" ? "bg-blue-500" : status === "preparing" ? "bg-amber-500" : "bg-green-500"}`} />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[hsl(220,15%,60%)]">
                {status === "new" ? "New Orders" : status === "preparing" ? "Preparing" : "Ready"}
              </h2>
              <span className="text-xs text-[hsl(220,15%,40%)]">({grouped[status].length})</span>
            </div>

            {grouped[status].map(order => (
              <button
                key={order.id}
                onClick={() => advance(order)}
                className={`w-full text-left rounded-xl border p-4 transition-all hover:scale-[1.01] active:scale-[0.99] ${STATUS_COLORS[order.kitchen_status]}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-base font-bold">#{order.order_id.slice(0, 8)}</p>
                    <p className="text-xs opacity-70 capitalize">{order.order_type.replace("_", " ")}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs opacity-70">
                    <Clock className="w-3 h-3" />
                    {elapsed(order.created_at)}
                  </div>
                </div>

                {order.table_number && (
                  <Badge variant="outline" className="text-xs mb-2">Table {order.table_number}</Badge>
                )}

                {order.notes && (
                  <p className="text-xs italic opacity-60 mb-2">"{order.notes}"</p>
                )}

                <div className="flex items-center gap-1 text-xs font-medium mt-2 opacity-80">
                  {STATUS_FLOW[order.kitchen_status] ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tap → {STATUS_FLOW[order.kitchen_status].toUpperCase()}
                    </>
                  ) : (
                    <span className="text-green-400">✓ Complete</span>
                  )}
                </div>
              </button>
            ))}

            {grouped[status].length === 0 && (
              <div className="rounded-xl border border-dashed border-[hsl(220,20%,18%)] p-8 text-center text-[hsl(220,15%,35%)] text-sm">
                No orders
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
