/**
 * TrackingPage — Live order status timeline + map placeholder.
 * Route: /tracking/:orderId
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CheckCircle2, Clock, Package, Truck, MapPin } from "lucide-react";
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
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "hsl(var(--background))" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pb-3" style={{ paddingTop: "max(env(safe-area-inset-top, 12px), 12px)" }}>
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform" style={{ background: "hsl(var(--muted))" }}>
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>
        <h1 className="text-lg font-black tracking-tight">Order Tracking</h1>
      </div>

      {/* Map placeholder */}
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ height: 180, background: "hsl(var(--muted))" }}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 mx-auto text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground mt-1">Live tracking</p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <motion.div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} />
        </div>
      )}

      {/* Timeline */}
      {!isLoading && order && (
        <div className="px-6 mt-6 pb-24">
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <div key={step.key} className="flex gap-4">
                  {/* Line + dot */}
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
                  {/* Label */}
                  <div className="pt-1.5">
                    <p className={`text-sm font-semibold ${done ? "" : "text-muted-foreground"}`} style={done ? { color: "hsl(var(--foreground))" } : {}}>
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
        </div>
      )}
    </div>
  );
}
