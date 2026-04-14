import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { fetchActiveOrders } from "@/repositories/customer-orders.repository";
import { motion } from "framer-motion";
import { ArrowLeft, Package, Clock, ChefHat, CheckCircle2, Truck, MapPin, Search, RefreshCw } from "lucide-react";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import { useUiEngine } from "@/hooks/useUiEngine";

const STATUS_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; step: number; label: string }> = {
  paid: { icon: CheckCircle2, color: "hsl(152 60% 42%)", step: 1, label: "Paid" },
  confirmed: { icon: CheckCircle2, color: "hsl(210 80% 52%)", step: 1, label: "Confirmed" },
  preparing: { icon: ChefHat, color: "hsl(var(--warning))", step: 2, label: "Preparing" },
  ready_for_pickup: { icon: Package, color: "hsl(270 60% 55%)", step: 3, label: "Ready" },
  driver_search: { icon: Search, color: "hsl(25 90% 52%)", step: 3, label: "Finding driver" },
  driver_assigned: { icon: Truck, color: "hsl(190 75% 46%)", step: 4, label: "Driver assigned" },
  picked_up: { icon: Truck, color: "hsl(210 80% 52%)", step: 4, label: "Picked up" },
  on_the_way: { icon: MapPin, color: "hsl(152 60% 42%)", step: 5, label: "On the way" },
};

const STEPS = ["Placed", "Preparing", "Ready", "Picked Up", "Arriving"];

export default function CustomerActiveOrdersPage() {
  useUiEngine("customer-customeractiveorderspage");
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: rows = [], isLoading, refetch , isError } = useQuery({
    queryKey: ["customer-active-orders-page", user?.id],
    queryFn: () => fetchActiveOrders(user?.id),
    enabled: !!user?.id,
    staleTime: 5000,
    refetchInterval: 7000,
  });

  return (
    <div className="app-mobile-page app-mobile-content bg-background pb-24">
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/my-orders")}
            className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: "hsl(var(--muted))" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Active Orders</h1>
            <p className="text-xs text-muted-foreground">
              {rows.length > 0 ? `${rows.length} order${rows.length > 1 ? "s" : ""} in progress` : "Track current live orders"}
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="w-8 h-8 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: "hsl(var(--muted))" }}
        >
          <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {isError && <div className="state-container"><p className="text-sm text-destructive">Something went wrong. Please try again.</p></div>}
      {isLoading && [1, 2, 3].map((i) => (
        <div key={i} className="mx-4 mb-3 h-28 rounded-2xl animate-pulse" style={{ background: "hsl(var(--muted) / 0.3)" }} />
      ))}

      {!isLoading && rows.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "hsl(210 80% 52% / 0.08)" }}>
            <Package className="w-8 h-8" style={{ color: "hsl(210 80% 52%)" }} />
          </div>
          <p className="text-sm font-bold text-foreground">No active orders</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Your current orders will appear here with live tracking</p>
          <button
            onClick={() => navigate("/food")}
            className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold text-white active:scale-95 transition-transform"
            style={{ background: "hsl(var(--primary))" }}
          >
            Browse Restaurants
          </button>
        </div>
      )}

      {!isLoading && rows.length > 0 && (
        <div className="px-4 space-y-3">
          {rows.map((row: any, idx: number) => {
            const meta = STATUS_META[row.status] ?? STATUS_META.confirmed;
            const StatusIcon = meta.icon;
            const currentStep = meta.step;
            const isLive = ["on_the_way", "picked_up", "driver_assigned"].includes(row.status);

            return (
              <motion.button
                key={row.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.25 }}
                onClick={() => navigate(`/tracking/${row.id}`)}
                className="w-full rounded-2xl bg-card p-4 text-left active:scale-[0.98] transition-all relative overflow-hidden"
                style={{ border: `1px solid ${meta.color}20` }}
              >
                {isLive && (
                  <div className="absolute top-3 right-3">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: meta.color }} />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: meta.color }} />
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${meta.color}12` }}>
                    <StatusIcon className="w-5 h-5" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-foreground">Order #{String(row.id).slice(0, 8)}</p>
                      <OrderStatusBadge status={row.status || "draft"} />
                    </div>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: meta.color }}>{meta.label}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-foreground tabular-nums">{Number(row.total_amount ?? 0).toFixed(2)} {row.currency ?? ""}</span>
                      <span className="text-[10px] text-muted-foreground">{row.created_at ? new Date(row.created_at).toLocaleString() : ""}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {STEPS.map((step, i) => (
                    <div key={step} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full h-1 rounded-full transition-colors"
                        style={{ background: i < currentStep ? meta.color : "hsl(var(--muted))" }}
                      />
                      <span className="text-[10px] font-semibold" style={{ color: i < currentStep ? meta.color : "hsl(var(--muted-foreground) / 0.3)" }}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
