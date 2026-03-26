/**
 * QrPickupPage — Pickup confirmation entry from QR scan.
 * Route: /qr/pickup?shop=<slug>&qr=<code>
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ArrowLeft, PackageCheck, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export default function QrPickupPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const shopSlug = params.get("shop");

  const { data, isLoading } = useQuery({
    queryKey: ["qr-pickup", shopSlug, user?.id],
    queryFn: async () => {
      const { data: shop } = await (supabase as any)
        .from("storefront_pages")
        .select("id, name, logo_url, address, city")
        .eq("slug", shopSlug)
        .maybeSingle();

      if (!shop) return { shop: null, readyOrders: [] };

      const { data: orders } = await (supabase as any)
        .from("storefront_orders")
        .select("id, status, total, currency, created_at")
        .eq("shop_id", shop.id)
        .eq("buyer_id", user?.id || "anon")
        .in("status", ["ready", "preparing"])
        .order("created_at", { ascending: false })
        .limit(5);

      return { shop, readyOrders: orders ?? [] };
    },
    enabled: !!shopSlug,
  });

  const shop = data?.shop;
  const readyOrders = data?.readyOrders ?? [];

  return (
    <div className="app-mobile-page bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border/10">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted active:scale-95">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground">Pickup Point</h1>
          <p className="text-[11px] text-muted-foreground truncate">{shop?.name || shopSlug}</p>
        </div>
      </header>

      <div className="flex-1 px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Shop location card */}
            {shop && (
              <div className="rounded-2xl bg-card border border-border/10 p-4 flex items-center gap-3">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {shop.name?.[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{shop.name}</p>
                  {(shop.address || shop.city) && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {shop.address || shop.city}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Ready orders */}
            {readyOrders.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-foreground">Your Orders</h2>
                {readyOrders.map((order: any) => (
                  <div key={order.id} className="rounded-2xl bg-card border border-border/10 p-4 flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      order.status === "ready" ? "bg-emerald-500/15" : "bg-amber-500/15"
                    )}>
                      <PackageCheck className={cn(
                        "w-5 h-5",
                        order.status === "ready" ? "text-emerald-400" : "text-amber-400"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {order.total} {order.currency || "AED"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {order.status === "ready" ? "Ready for pickup!" : "Being prepared…"}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-bold px-2.5 py-1 rounded-full",
                      order.status === "ready" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                    )}>
                      {order.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <PackageCheck className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm font-medium text-foreground">No orders to pick up</p>
                <p className="text-xs text-muted-foreground mt-1">Place an order first</p>
                {shopSlug && (
                  <button
                    onClick={() => navigate(`/menu/${shopSlug}`)}
                    className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground"
                  >
                    Order Now
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
