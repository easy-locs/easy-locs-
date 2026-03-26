/**
 * OrdersPage — User's order history.
 * Route: /orders
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Package, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
  draft: "hsl(var(--muted-foreground))",
  pending: "hsl(45 90% 55%)",
  confirmed: "hsl(var(--primary))",
  preparing: "hsl(30 90% 55%)",
  ready: "hsl(150 60% 45%)",
  picked_up: "hsl(200 80% 50%)",
  on_the_way: "hsl(200 80% 50%)",
  delivered: "hsl(150 70% 40%)",
  cancelled: "hsl(0 70% 55%)",
  paid: "hsl(150 70% 40%)",
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["user-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase as any)
        .from("orders")
        .select("id, status, order_type, total_amount, currency, created_at, notes, merchant_profile_id")
        .eq("customer_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!user,
    staleTime: 30_000,
    placeholderData: (prev: any) => prev,
  });

  return (
    <div className="app-mobile-page flex flex-col" style={{ background: "hsl(var(--background))" }}>
      <div className="flex items-center gap-3 px-4 pt-safe pb-3" style={{ paddingTop: "max(env(safe-area-inset-top, 12px), 12px)" }}>
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-black tracking-tight">My Orders</h1>
      </div>

      <div className="flex-1 px-4 pb-24" style={{ minHeight: 200 }}>
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <motion.div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Package className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No orders yet</p>
          </div>
        )}

        <div className="space-y-2">
          {(orders as any[]).map((order: any) => (
            <button
              key={order.id}
              onClick={() => navigate(`/order/${order.id}`)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl active:scale-[0.98] transition-transform text-left"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.1)" }}>
                <Package className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate capitalize">
                    {(order.order_type || "order").replace(/_/g, " ")}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                    style={{ background: `${STATUS_COLORS[order.status] || "hsl(var(--muted))"}20`, color: STATUS_COLORS[order.status] || "hsl(var(--muted-foreground))" }}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(order.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
