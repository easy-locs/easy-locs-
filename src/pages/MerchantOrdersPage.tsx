/**
 * MerchantOrdersPage — Simple order management: New → Preparing → Ready → Completed
 * Real-time via Supabase subscription.
 */
import { useState, useEffect, useCallback, memo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Clock, ChefHat, PackageCheck, CheckCircle2 } from "lucide-react";
import OrderNotificationAlert, { type IncomingOrder } from "@/components/merchant/OrderNotificationAlert";

type OrderStatus = "new" | "preparing" | "ready" | "completed";
interface MerchantOrder {
  id: string;
  status: OrderStatus;
  guest_name: string;
  total_price: number;
  currency: string;
  created_at: string;
  notes?: string;
  items?: Array<{ name: string; qty: number; price: number }>;
}

const TABS: { key: OrderStatus; label: string; icon: any; color: string }[] = [
  { key: "new", label: "New", icon: Clock, color: "hsl(var(--hud-danger))" },
  { key: "preparing", label: "Preparing", icon: ChefHat, color: "hsl(var(--hud-warning))" },
  { key: "ready", label: "Ready", icon: PackageCheck, color: "hsl(var(--hud-cyan))" },
  { key: "completed", label: "Done", icon: CheckCircle2, color: "hsl(var(--hud-success))" },
];

const STATUS_MAP: Record<string, OrderStatus> = {
  pending: "new", confirmed: "preparing", ready: "ready",
  completed: "completed", cancelled: "completed",
};

const OrderCard = memo(function OrderCard({ order, onAction }: { order: MerchantOrder; onAction: (id: string, status: OrderStatus) => void }) {
  const nextStatus: OrderStatus | null =
    order.status === "new" ? "preparing" :
    order.status === "preparing" ? "ready" :
    order.status === "ready" ? "completed" : null;

  const actionLabel = nextStatus === "preparing" ? "Start" : nextStatus === "ready" ? "Ready" : nextStatus === "completed" ? "Complete" : null;

  return (
    <div className="rounded-2xl p-4" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold truncate" style={{ color: "hsl(var(--hud-text))" }}>{order.guest_name}</span>
        <span className="text-[10px] font-medium" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
          {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <p className="text-lg font-black mb-2" style={{ color: "hsl(var(--hud-text))" }}>
        {order.total_price?.toFixed(2)} {order.currency}
      </p>
      {order.notes && <p className="text-[11px] mb-2 truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{order.notes}</p>}
      {nextStatus && actionLabel && (
        <button
          onClick={() => onAction(order.id, nextStatus)}
          className="w-full py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-transform"
          style={{ background: "hsl(var(--hud-cyan))", color: "#fff" }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
});

export default function MerchantOrdersPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<OrderStatus>("new");
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [incomingOrder, setIncomingOrder] = useState<IncomingOrder | null>(null);

  // Fetch orders
  useEffect(() => {
    if (!user?.id) return;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("concierge_orders")
        .select("id, status, guest_name, total_price, currency, created_at, notes")
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) {
        setOrders(data.map((o: any) => ({ ...o, status: STATUS_MAP[o.status] || "new" })));
      }
    };
    fetchOrders();

    // Real-time subscription
    const channel = supabase
      .channel("merchant-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "concierge_orders" }, (payload) => {
        const newOrder = payload.new as any;
        const mapped: MerchantOrder = { ...newOrder, status: "new" };
        setOrders(prev => [mapped, ...prev]);
        // Trigger full-screen alert
        setIncomingOrder({
          id: newOrder.id,
          customerName: newOrder.guest_name || "Customer",
          items: [{ name: "Order", qty: 1, price: newOrder.total_price || 0 }],
          total: newOrder.total_price || 0,
          currency: newOrder.currency || "EUR",
          type: "pickup",
          createdAt: newOrder.created_at,
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: OrderStatus) => {
    const dbStatus = newStatus === "new" ? "pending" : newStatus === "preparing" ? "confirmed" : newStatus;
    await supabase.from("concierge_orders").update({ status: dbStatus }).eq("id", orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  }, []);

  const handleAccept = useCallback((orderId: string) => {
    handleStatusChange(orderId, "preparing");
    setIncomingOrder(null);
  }, [handleStatusChange]);

  const handleReject = useCallback((orderId: string) => {
    handleStatusChange(orderId, "completed");
    setIncomingOrder(null);
  }, [handleStatusChange]);

  const filteredOrders = orders.filter(o => o.status === activeTab);

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--hud-bg))" }}>
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-3 px-4 h-14 border-b" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.1)" }}>
        <button onClick={() => navigate(-1)} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl active:scale-95">
          <ArrowLeft className="w-5 h-5" style={{ color: "hsl(var(--hud-text))" }} />
        </button>
        <span className="text-base font-bold" style={{ color: "hsl(var(--hud-text))" }}>Orders</span>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-3 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => {
          const count = orders.filter(o => o.status === tab.key).length;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 min-h-[40px]"
              style={{
                background: active ? "hsl(var(--hud-cyan) / 0.12)" : "hsl(var(--hud-surface))",
                color: active ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.6)",
                border: `1px solid ${active ? "hsl(var(--hud-cyan) / 0.2)" : "hsl(var(--hud-border) / 0.06)"}`,
              }}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {count > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full text-[9px] font-bold flex items-center justify-center px-1" style={{ background: tab.color, color: "#fff" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Order list */}
      <div className="flex-1 px-4 pb-6 space-y-3">
        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-3xl">📋</span>
            <p className="text-sm font-medium" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>No {activeTab} orders</p>
          </div>
        )}
        {filteredOrders.map((order) => (
          <OrderCard key={order.id} order={order} onAction={handleStatusChange} />
        ))}
      </div>

      {/* Full-screen alert */}
      <OrderNotificationAlert order={incomingOrder} onAccept={handleAccept} onReject={handleReject} />
    </div>
  );
}
