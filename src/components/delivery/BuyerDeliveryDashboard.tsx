/**
 * BuyerDeliveryDashboard — Buyer dashboard to track orders and deliveries.
 * PASS83-Y: Buyer Dashboard
 */
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Package, MapPin, Clock, CheckCircle2, Loader2, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  className?: string;
}

interface BuyerOrder {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  package_description: string | null;
  delivery_fee: number | null;
  currency: string | null;
  created_at: string | null;
  delivered_at: string | null;
  scheduled_at: string | null;
  confirmation_code: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  pending: { label: "En attente", emoji: "⏳", color: "var(--warning)" },
  assigned: { label: "Assigné", emoji: "📩", color: "var(--info)" },
  accepted: { label: "Accepté", emoji: "✅", color: "var(--success)" },
  in_progress: { label: "En route", emoji: "🚗", color: "var(--hud-cyan)" },
  completed: { label: "Livré", emoji: "🏁", color: "var(--success)" },
  cancelled: { label: "Annulé", emoji: "❌", color: "var(--destructive)" },
};

export default function BuyerDeliveryDashboard({ className }: Props) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Buyer sees orders where they are associated (via order_id or org membership)
      const { data } = await supabase
        .from("delivery_jobs")
        .select("id, status, pickup_address, dropoff_address, package_description, delivery_fee, currency, created_at, delivered_at, scheduled_at, confirmation_code")
        .or(`seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(50);

      setOrders((data || []) as BuyerOrder[]);
    } catch (err) {
      console.error("[buyer-dashboard]", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`buyer-orders-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "delivery_jobs" }, () => {
        refresh();
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user, refresh]);

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan) / 0.3)" }} />
    </div>;
  }

  const active = orders.filter(o => ["pending", "assigned", "accepted", "in_progress"].includes(o.status));
  const past = orders.filter(o => ["completed", "cancelled"].includes(o.status));

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "En cours", value: active.length, color: "--hud-cyan" },
          { label: "Livrées", value: past.filter(o => o.status === "completed").length, color: "--success" },
          { label: "Total", value: orders.length, color: "--hud-text-dim" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-2.5 text-center"
            style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-lg font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Refresh */}
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={refresh} className="text-[10px] h-7">
          <RefreshCw className="h-3 w-3 mr-1" /> Actualiser
        </Button>
      </div>

      {/* Active orders */}
      {active.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold px-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
            🔴 Livraisons en cours
          </p>
          {active.map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            return (
              <motion.div key={order.id} layout
                className="rounded-xl overflow-hidden"
                style={{ background: "hsl(var(--hud-surface))", border: `1px solid hsl(${cfg.color} / 0.15)` }}>
                <button className="w-full text-left px-3 py-3 flex items-center gap-3"
                  onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                  <span className="text-lg">{cfg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>
                      {order.package_description || "Colis"}
                    </p>
                    <p className="text-[9px] truncate" style={{ color: `hsl(${cfg.color})` }}>{cfg.label}</p>
                  </div>
                  {order.delivery_fee != null && (
                    <span className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>
                      {order.delivery_fee.toFixed(2)}€
                    </span>
                  )}
                </button>
                {expandedId === order.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }}
                    className="px-3 pb-3 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "hsl(var(--info))" }} />
                      <div>
                        <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Collecte</p>
                        <p className="text-[10px]" style={{ color: "hsl(var(--hud-text))" }}>{order.pickup_address}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "hsl(var(--success))" }} />
                      <div>
                        <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Livraison</p>
                        <p className="text-[10px]" style={{ color: "hsl(var(--hud-text))" }}>{order.dropoff_address}</p>
                      </div>
                    </div>
                    {order.confirmation_code && (
                      <div className="rounded-lg px-3 py-2 text-center"
                        style={{ background: "hsl(var(--warning) / 0.06)", border: "1px solid hsl(var(--warning) / 0.1)" }}>
                        <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Code de confirmation</p>
                        <p className="text-lg font-black tracking-widest" style={{ color: "hsl(var(--warning))" }}>
                          {order.confirmation_code}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Past orders */}
      {past.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold px-1" style={{ color: "hsl(var(--hud-text-dim))" }}>
            📋 Historique
          </p>
          {past.slice(0, 10).map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            return (
              <div key={order.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                <span className="text-sm">{cfg.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium truncate" style={{ color: "hsl(var(--hud-text))" }}>
                    {order.package_description || "Colis"}
                  </p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>
                    {order.delivered_at ? new Date(order.delivered_at).toLocaleDateString("fr") : order.created_at ? new Date(order.created_at).toLocaleDateString("fr") : ""}
                  </p>
                </div>
                {order.delivery_fee != null && (
                  <span className="text-[10px] font-bold" style={{ color: `hsl(${cfg.color})` }}>
                    {order.delivery_fee.toFixed(2)}€
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {orders.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-8 w-8 mx-auto mb-2" style={{ color: "hsl(var(--hud-text-dim) / 0.15)" }} />
          <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>Aucune livraison</p>
        </div>
      )}
    </div>
  );
}
