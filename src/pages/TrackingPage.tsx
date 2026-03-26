/**
 * TrackingPage — Live order status timeline with support ticket integration.
 * Route: /tracking/:orderId
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2, Clock, Package, Truck, MapPin, Headphones, ChefHat, Search, CreditCard } from "lucide-react";
import { motion } from "framer-motion";
import { OrderStatusChip } from "@/components/orders/OrderStatusChip";
import { getStatusMeta, normalizeStatus } from "@/lib/orders/order-status";
import SupportTicketForm from "@/components/support/SupportTicketForm";
import { lazy, Suspense } from "react";

const LiveTrackingMap = lazy(() => import("@/components/tracking/LiveTrackingMap"));

const STEPS = [
  { key: "pending_payment", label: "Order placed", icon: CreditCard },
  { key: "paid", label: "Payment received", icon: CheckCircle2 },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing", icon: ChefHat },
  { key: "ready_for_pickup", label: "Ready", icon: Package },
  { key: "driver_search", label: "Finding driver", icon: Search },
  { key: "driver_assigned", label: "Driver assigned", icon: Truck },
  { key: "picked_up", label: "Picked up", icon: Package },
  { key: "on_the_way", label: "On the way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: MapPin },
  { key: "completed", label: "Completed", icon: CheckCircle2 },
];

function getStepIndex(status: string) {
  const normalized = normalizeStatus(status);
  const idx = STEPS.findIndex((s) => s.key === normalized);
  return idx >= 0 ? idx : 0;
}

export default function TrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [showSupport, setShowSupport] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["tracking-order", orderId],
    queryFn: async () => {
      // Authoritative: storefront_orders + snapshot items
      const { data: sfOrder } = await (supabase as any)
        .from("storefront_orders")
        .select("id, status, payment_status, created_at, notes, total, currency, shop_id, fulfillment_type, updated_at, storefront_order_items(*), storefront_pages!storefront_orders_shop_id_fkey(name, slug, logo_url)")
        .eq("id", orderId)
        .maybeSingle();
      if (sfOrder) return { ...sfOrder, order_type: sfOrder.fulfillment_type || "delivery" };

      // Temporary legacy fallback — will be removed after migration
      const { data } = await (supabase as any)
        .from("orders")
        .select("id, status, order_type, created_at, notes, total_amount, currency")
        .eq("id", orderId)
        .maybeSingle();
      return data;
    },
    enabled: !!orderId,
    staleTime: 10_000,
    refetchInterval: 15_000,
    placeholderData: (prev: any) => prev,
  });

  const normalizedStatus = normalizeStatus(order?.status || "pending_payment");
  const currentStep = getStepIndex(normalizedStatus);
  const statusMeta = getStatusMeta(normalizedStatus);
  const isTerminal = statusMeta.isTerminal;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Order Tracking</h1>
        {order && <OrderStatusChip status={normalizedStatus} variant="customer" />}
      </header>

      {/* Map placeholder */}
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ height: 160, background: "hsl(var(--muted))" }}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 mx-auto text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground mt-1">Live tracking</p>
          </div>
        </div>
      </div>

      {/* ETA banner */}
      {!isLoading && order && !isTerminal && (
        <div className="mx-4 mt-3 rounded-2xl p-4 flex items-center gap-3" style={{ background: "hsl(var(--primary) / 0.08)" }}>
          <Clock className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--primary))" }} />
          <div>
            <p className="text-sm font-bold text-foreground">Estimated delivery</p>
            <p className="text-xs text-muted-foreground">25–35 min</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <motion.div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
        </div>
      )}

      {/* Not found */}
      {!isLoading && !order && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
          <Package className="w-12 h-12 text-muted-foreground" />
          <p className="text-sm font-semibold text-muted-foreground">Order not found</p>
          <button onClick={() => navigate("/my-orders")} className="text-xs font-bold text-primary">View all orders</button>
        </div>
      )}

      {/* Timeline */}
      {!isLoading && order && (
        <div className="px-6 mt-4 pb-24 space-y-6">
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;
              if (!done && i > currentStep + 2) return null; // hide far future steps
              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        background: done ? "hsl(var(--primary))" : "hsl(var(--muted))",
                        boxShadow: active ? "0 0 12px hsl(var(--primary) / 0.4)" : "none",
                      }}
                    >
                      <step.icon className="w-4 h-4" style={{ color: done ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))" }} />
                    </div>
                    {i < STEPS.length - 1 && i <= currentStep + 1 && (
                      <div className="w-0.5 h-8 my-1" style={{ background: i < currentStep ? "hsl(var(--primary))" : "hsl(var(--border))" }} />
                    )}
                  </div>
                  <div className="pt-1.5">
                    <p className={`text-sm font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>{step.label}</p>
                    {active && <p className="text-xs text-muted-foreground mt-0.5">In progress…</p>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Item snapshots (from storefront_order_items, NOT live catalog) */}
          {order.storefront_order_items?.length > 0 && (
            <div className="rounded-2xl p-4 space-y-2" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.1)" }}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Items</p>
              {order.storefront_order_items.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-foreground">{item.quantity}× {item.title}</span>
                  <span className="text-muted-foreground font-medium">{Number(item.total_price || 0).toFixed(2)} {order.currency}</span>
                </div>
              ))}
              <div className="border-t border-border/10 pt-2 mt-2 flex justify-between text-sm font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{Number(order.total || order.total_amount || 0).toFixed(2)} {order.currency}</span>
              </div>
            </div>
          )}

          {/* Shop info */}
          {order.storefront_pages && (
            <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.1)" }}>
              {order.storefront_pages.logo_url && (
                <img src={order.storefront_pages.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">{order.storefront_pages.name}</p>
                <p className="text-[11px] text-muted-foreground">Order #{order.id?.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
          )}

          {showSupport ? (
            <SupportTicketForm
              orderId={orderId}
              defaultType="order_issue"
              onClose={() => setShowSupport(false)}
              onSuccess={() => setShowSupport(false)}
            />
          ) : (
            <button
              onClick={() => setShowSupport(true)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.98] transition-transform"
              style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.08)" }}>
                <Headphones className="w-4.5 h-4.5" style={{ color: "hsl(var(--primary))" }} />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Need help?</p>
                <p className="text-[11px] text-muted-foreground">Report an issue with this order</p>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
