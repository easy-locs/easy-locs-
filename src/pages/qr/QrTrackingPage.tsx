/**
 * QrTrackingPage — Order tracking entry from QR scan.
 * Route: /qr/track?shop=<slug>&qr=<code>
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowLeft, Package, Clock, CheckCircle2, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Package },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "ready", label: "Ready", icon: CheckCircle2 },
];

export default function QrTrackingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const shopSlug = params.get("shop");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["qr-tracking", shopSlug, user?.id],
    queryFn: async () => {
      // Get shop ID from slug
      const { data: shop } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, logo_url")
        .eq("slug", shopSlug)
        .maybeSingle();

      if (!shop) return { shop: null, orders: [] };

      // Get recent orders for this customer at this shop
      const { data: orderData } = await (supabase as any)
        .from("storefront_orders")
        .select("id, status, total, currency, created_at, table_code")
        .eq("shop_id", shop.id)
        .eq("buyer_id", user?.id || "anon")
        .order("created_at", { ascending: false })
        .limit(5);

      return { shop, orders: orderData ?? [] };
    },
    enabled: !!shopSlug,
  });

  const shop = orders?.shop;
  const orderList = orders?.orders ?? [];

  return (
    <div className="app-mobile-page bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted active:scale-95">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground">Order Tracking</h1>
          <p className="text-[11px] text-muted-foreground truncate">{shop?.name || shopSlug}</p>
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : orderList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-foreground">No orders yet</p>
            <p className="text-xs text-muted-foreground mt-1">Place an order to track it here</p>
            {shopSlug && (
              <button
                onClick={() => navigate(`/menu/${shopSlug}`)}
                className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground"
              >
                View Menu
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {orderList.map((order: any) => {
              const currentIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);
              return (
                <div key={order.id} className="rounded-2xl bg-card border border-border/10 p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {order.total} {order.currency || "AED"}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-2.5 py-1 rounded-full",
                      order.status === "ready" ? "bg-emerald-500/15 text-emerald-400" :
                      order.status === "preparing" ? "bg-amber-500/15 text-amber-400" :
                      "bg-primary/10 text-primary"
                    )}>
                      {order.status}
                    </span>
                  </div>
                  {/* Progress steps */}
                  <div className="flex items-center gap-1">
                    {STATUS_STEPS.map((step, i) => (
                      <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
                        <div className={cn(
                          "w-full h-1 rounded-full",
                          i <= currentIdx ? "bg-primary" : "bg-muted"
                        )} />
                        <span className={cn(
                          "text-[9px]",
                          i <= currentIdx ? "text-primary font-medium" : "text-muted-foreground"
                        )}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
