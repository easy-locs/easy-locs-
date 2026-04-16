/**
 * QrPickupPage — Pickup confirmation entry from QR scan.
 * Route: /qr/pickup?shop=<slug>&qr=<code>
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storefrontService } from "@/services";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, PackageCheck, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

export default function QrPickupPage() {
  useUiEngine("qr-qrpickuppage");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const shopSlug = params.get("shop");

  const { data, isLoading } = useQuery({
    queryKey: ["qr-pickup", shopSlug, user?.id],
    queryFn: async () => {
      const shop = await storefrontService.fetchPageBySlug(shopSlug!, "id, name, logo_url, address, city") as any;

      if (!shop) return { shop: null, readyOrders: [] };

      const readyOrders = await storefrontService.fetchStorefrontOrdersByShopAndBuyer(shop.id, user?.id || "anon", ["ready", "preparing"], 5);

      return { shop, readyOrders };
    },
    enabled: !!shopSlug,
  });

  const shop = data?.shop;
  const readyOrders = data?.readyOrders ?? [];

  return (
    <SubPageShell title="Pickup Point" subtitle={shop?.name || shopSlug || undefined} onBack={() => navigate(-1)} noContentPad>
      <div className="px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {shop && (
              <div className="rounded-2xl bg-card border border-border/10 p-4 flex items-center gap-3">
                {shop.logo_url ? (
                  <img loading="lazy" src={shop.logo_url} alt={`${shop.name || "Shop"} logo`} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {shop.name?.[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground line-clamp-1 break-words">{shop.name}</p>
                  {(shop.address || shop.city) && (
                    <p className="text-[0.6875rem] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {shop.address || shop.city}
                    </p>
                  )}
                </div>
              </div>
            )}

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
                      <p className="text-[0.625rem] text-muted-foreground">
                        {order.status === "ready" ? "Ready for pickup!" : "Being prepared…"}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[0.625rem] font-bold px-2.5 py-1 rounded-full",
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
    </SubPageShell>
  );
}
