/**
 * BuyerOrderTracker — Buyer-facing order status tracker with realtime updates.
 * Shows order timeline, items, and live status progression.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, CheckCircle, Package, Truck, XCircle, ShoppingBag, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface BuyerOrderTrackerProps {
  orderId?: string;      // Single order detail
  buyerEmail?: string;    // Fallback for guest buyers
}

const statusSteps = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "accepted", label: "Accepted", icon: CheckCircle },
  { key: "preparing", label: "Preparing", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "completed", label: "Completed", icon: CheckCircle },
];

const statusIndex = (s: string) => statusSteps.findIndex((st) => st.key === s);

const fmtPrice = (n: number, c = "EUR") => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency", currency: c,
      minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(n);
  } catch { return `${n} ${c}`; }
};

export default function BuyerOrderTracker({ orderId, buyerEmail }: BuyerOrderTrackerProps) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["buyer-orders", user?.id, orderId, buyerEmail],
    queryFn: async () => {
      let query = (supabase as any)
        .from("storefront_orders")
        .select("*, storefront_order_items(*), storefront_pages!storefront_orders_shop_id_fkey(name, slug, logo_url)")
        .order("created_at", { ascending: false });

      if (orderId) {
        query = query.eq("id", orderId);
      } else if (user?.id) {
        query = query.eq("buyer_id", user.id);
      } else if (buyerEmail) {
        query = query.eq("buyer_email", buyerEmail);
      } else {
        return [];
      }

      const { data } = await query.limit(50);
      return data || [];
    },
    enabled: !!(user?.id || buyerEmail || orderId),
  });

  // Realtime: auto-refresh when order status changes
  useEffect(() => {
    if (!user?.id && !orderId) return;
    const filter = orderId
      ? `id=eq.${orderId}`
      : `buyer_id=eq.${user?.id}`;

    const channel = supabase
      .channel(`buyer-order-track-${orderId || user?.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "storefront_orders",
        filter,
      }, () => {
        qc.invalidateQueries({ queryKey: ["buyer-orders"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, orderId, qc]);

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No orders found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order: any) => {
        const isCancelled = order.status === "cancelled";
        const currentStep = statusIndex(order.status);
        const shop = order.storefront_pages;
        const items = order.storefront_order_items || [];

        return (
          <Card key={order.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-4">
              {/* Shop header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {shop?.logo_url ? (
                    <img src={shop.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShoppingBag className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{shop?.name || "Shop"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString(undefined, {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                {isCancelled ? (
                  <Badge variant="destructive" className="text-[10px]">
                    <XCircle className="h-3 w-3 mr-1" /> Cancelled
                  </Badge>
                ) : order.status === "completed" ? (
                  <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600">
                    <CheckCircle className="h-3 w-3 mr-1" /> Completed
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    In progress
                  </Badge>
                )}
              </div>

              {/* Status timeline */}
              {!isCancelled && (
                <div className="flex items-center gap-1">
                  {statusSteps.map((step, i) => {
                    const StepIcon = step.icon;
                    const isActive = i <= currentStep;
                    const isCurrent = i === currentStep;
                    return (
                      <div key={step.key} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div
                            className={cn(
                              "h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                              isCurrent
                                ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                                : isActive
                                  ? "bg-primary/20 text-primary"
                                  : "bg-muted text-muted-foreground"
                            )}
                          >
                            <StepIcon className="h-3.5 w-3.5" />
                          </div>
                          <span className={cn(
                            "text-[9px] mt-1 text-center",
                            isCurrent ? "font-semibold text-primary" : "text-muted-foreground"
                          )}>
                            {step.label}
                          </span>
                        </div>
                        {i < statusSteps.length - 1 && (
                          <div className={cn(
                            "h-0.5 flex-1 mx-0.5 rounded-full",
                            i < currentStep ? "bg-primary/40" : "bg-muted"
                          )} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Items summary */}
              <div className="space-y-1">
                {items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {item.quantity}× {item.title}
                    </span>
                    <span className="font-medium">
                      {fmtPrice(item.quantity * (item.unit_price || 0), order.currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-sm font-bold text-primary">
                  {fmtPrice(order.total, order.currency)}
                </span>
              </div>

              {/* Link to shop */}
              {shop?.slug && (
                <Link
                  to={`/shop/${shop.slug}`}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Visit shop
                </Link>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
