/**
 * TrackingPage — Live order status timeline.
 * Route: /tracking/:orderId
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2, Clock, Package, Truck, MapPin, Headphones } from "lucide-react";
import { motion } from "framer-motion";

const STEPS = [
  { key: "pending", label: "Order placed", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "preparing", label: "Preparing", icon: Package },
  { key: "ready", label: "Ready", icon: Package },
  { key: "on_the_way", label: "On the way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: MapPin },
];

function getStepIndex(status: string) {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function TrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading } = useQuery({
    queryKey: ["tracking-order", orderId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("orders")
        .select("id, status, order_type, created_at, notes")
        .eq("id", orderId)
        .maybeSingle();
      return data;
    },
    enabled: !!orderId,
    staleTime: 10_000,
    refetchInterval: 15_000,
    placeholderData: (prev: any) => prev,
  });

  const currentStep = getStepIndex(order?.status || "pending");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-transform" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Order Tracking</h1>
      </header>

      {/* Map placeholder */}
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ height: 180, background: "hsl(var(--muted))" }}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 mx-auto text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground mt-1">Live tracking</p>
          </div>
        </div>
      </div>

      {/* ETA banner */}
      {!isLoading && order && currentStep < STEPS.length - 1 && (
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

      {/* Timeline */}
      {!isLoading && order && (
        <div className="px-6 mt-4 pb-24">
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;
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
                    {i < STEPS.length - 1 && (
                      <div className="w-0.5 h-8 my-1" style={{ background: i < currentStep ? "hsl(var(--primary))" : "hsl(var(--border))" }} />
                    )}
                  </div>
                  <div className="pt-1.5">
                    <p className={`text-sm font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </p>
                    {active && (
                      <p className="text-xs text-muted-foreground mt-0.5">In progress…</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Support shortcut */}
          <button
            onClick={() => navigate("/settings/support")}
            className="w-full mt-6 flex items-center gap-3 p-3.5 rounded-2xl active:scale-[0.98] transition-transform"
            style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border) / 0.12)" }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "hsl(var(--primary) / 0.08)" }}>
              <Headphones className="w-4.5 h-4.5" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-foreground">Need help?</p>
              <p className="text-[11px] text-muted-foreground">Contact support about this order</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
