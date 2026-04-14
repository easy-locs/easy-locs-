/**
 * QrTrackingPage — Order tracking entry from QR scan.
 * Route: /qr/track?shop=<slug>&qr=<code>
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { storefrontService } from "@/services";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Package, CheckCircle2, ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiEngine } from "@/hooks/useUiEngine";
import SubPageShell from "@/components/layout/SubPageShell";

const STATUS_STEPS = [
  { key: "pending", label: "Order Placed", icon: Package },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "ready", label: "Ready", icon: CheckCircle2 },
];

export default function QrTrackingPage() {
  useUiEngine("qr-qrtrackingpage");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const shopSlug = params.get("shop");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["qr-tracking", shopSlug, user?.id],
    queryFn: async () => {
      const shop = await storefrontService.fetchPageBySlug(shopSlug!, "id, name, logo_url") as any;

      if (!shop) return { shop: null, orders: [] };

      const orderData = await storefrontService.fetchStorefrontOrdersByShopAndBuyer(shop.id, user?.id || "anon", undefined, 5);

      return { shop, orders: orderData };
    },
    enabled: !!shopSlug,
  });

  const shop = orders?.shop;
  const orderList = orders?.orders ?? [];

  return (
    <SubPageShell title="Order Tracking" subtitle={shop?.name || shopSlug || undefined} onBack={() => navigate(-1)} noContentPad>
      <div className="px-4 py-6">
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
                  <div className="flex items-center gap-1">
                    {STATUS_STEPS.map((step, i) => (
                      <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
                        <div className={cn(
                          "w-full h-1 rounded-full",
                          i <= currentIdx ? "bg-primary" : "bg-muted"
                        )} />
                        <span className={cn(
                          "text-[10px]",
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
    </SubPageShell>
  );
}
