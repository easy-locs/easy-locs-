/**
 * OrderBundlingEngine — MMM. Order Bundling
 * Geographic order grouping for route optimization.
 * PASS93-MMM
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, MapPin, Package, Zap, Clock, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeliveryOrders } from "@/hooks/useDeliveryData";

interface Bundle {
  id: string;
  orders: any[];
  zone: string;
  estimatedDistance: number;
  estimatedTime: number;
  savings: number;
  status: "draft" | "confirmed" | "dispatched";
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clusterOrders(orders: any[], radiusKm: number = 1.5): Bundle[] {
  const used = new Set<string>();
  const bundles: Bundle[] = [];
  const sorted = [...orders].sort((a, b) => (a.priority === "urgent" ? -1 : b.priority === "urgent" ? 1 : 0));

  sorted.forEach(order => {
    if (used.has(order.id)) return;
    const cluster = [order];
    used.add(order.id);

    sorted.forEach(other => {
      if (used.has(other.id)) return;
      const lat1 = order.lat || order.latitude || 0;
      const lng1 = order.lng || order.longitude || 0;
      const lat2 = other.lat || other.latitude || 0;
      const lng2 = other.lng || other.longitude || 0;
      if (lat1 && lng1 && lat2 && lng2) {
        const dist = haversineKm(lat1, lng1, lat2, lng2);
        if (dist <= radiusKm) {
          cluster.push(other);
          used.add(other.id);
        }
      }
    });

    const totalDist = cluster.length > 1
      ? cluster.reduce((s, o, i) => {
          if (i === 0) return 0;
          const prev = cluster[i - 1];
          return s + haversineKm(prev.lat || prev.latitude || 0, prev.lng || prev.longitude || 0, o.lat || o.latitude || 0, o.lng || o.longitude || 0);
        }, 0)
      : 0;
    const individualDist = cluster.reduce((s, o) => s + 3.5, 0);
    const savings = Math.max(0, Math.round((1 - totalDist / Math.max(individualDist, 1)) * 100));

    bundles.push({
      id: `b${bundles.length + 1}`,
      orders: cluster,
      zone: (cluster[0].address || cluster[0].delivery_address || "Zone").split(",").pop()?.trim() || "Zone",
      estimatedDistance: Math.round((totalDist || 2.5) * 10) / 10,
      estimatedTime: Math.round(cluster.length * 8 + (totalDist || 2.5) * 3),
      savings,
      status: "draft",
    });
  });

  return bundles;
}

export default function OrderBundlingEngine({ orgId }: { orgId: string }) {
  const { data: orders = [], isLoading } = useDeliveryOrders(orgId);
  const [tab, setTab] = useState<"pending" | "bundles" | "stats">("pending");
  const [radius, setRadius] = useState(1.5);

  if (isLoading) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  const bundles = clusterOrders(orders, radius);

  const stats = {
    totalOrders: orders.length,
    totalBundles: bundles.length,
    avgPerBundle: Math.round(orders.length / Math.max(bundles.length, 1) * 10) / 10,
    totalSavings: bundles.reduce((s, b) => s + b.savings, 0),
    totalWeight: orders.reduce((s: number, o: any) => s + (o.weight || 0), 0),
    urgentCount: orders.filter((o: any) => o.priority === "urgent").length,
  };

  const priorityCfg: Record<string, { color: string; emoji: string }> = {
    standard: { color: "hsl(var(--success))", emoji: "🟢" },
    express: { color: "hsl(var(--warning))", emoji: "🟠" },
    urgent: { color: "hsl(var(--destructive))", emoji: "🔴" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Regroupement Commandes</h3>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: "hsl(var(--hud-cyan) / 0.1)", color: "hsl(var(--hud-cyan))" }}>
          {orders.length} commandes → {bundles.length} lots
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Commandes", value: stats.totalOrders, color: "--info" },
          { label: "Lots créés", value: stats.totalBundles, color: "--hud-cyan" },
          { label: "Moy/lot", value: stats.avgPerBundle, color: "--success" },
          { label: "Urgentes", value: stats.urgentCount, color: "--destructive" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Radius slider */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Rayon:</span>
        <input type="range" min="0.5" max="5" step="0.5" value={radius}
          onChange={e => setRadius(+e.target.value)}
          className="flex-1 h-1 accent-[hsl(var(--hud-cyan))]" />
        <span className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{radius} km</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "pending" as const, label: "📦 Commandes" },
          { id: "bundles" as const, label: "📋 Lots" },
          { id: "stats" as const, label: "📊 Stats" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
              color: tab === t.id ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "pending" && (
          <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
            {orders.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucune commande</div>
            )}
            {orders.map((o: any) => {
              const p = priorityCfg[o.priority] || priorityCfg.standard;
              return (
                <div key={o.id} className="rounded-lg px-3 py-2 flex items-center gap-2"
                  style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                  <span className="text-xs">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{o.customer_name || o.customerName || "Client"}</p>
                    <p className="text-[10px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{o.address || o.delivery_address || ""}</p>
                  </div>
                  <span className="text-[10px] font-mono shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{o.weight || 0}kg</span>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "bundles" && (
          <motion.div key="bundles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {bundles.map(b => (
              <div key={b.id} className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                <div className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" style={{ color: "hsl(var(--hud-cyan))" }} />
                  <p className="text-[11px] font-bold flex-1" style={{ color: "hsl(var(--hud-text))" }}>
                    {b.zone} — {b.orders.length} commande{b.orders.length > 1 ? "s" : ""}
                  </p>
                  {b.savings > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                      -{b.savings}% trajet
                    </span>
                  )}
                </div>
                <div className="flex gap-3 text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                  <span>📏 {b.estimatedDistance} km</span>
                  <span>⏱️ ~{b.estimatedTime} min</span>
                  <span>📦 {b.orders.reduce((s: number, o: any) => s + (o.weight || 0), 0).toFixed(1)} kg</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {b.orders.map((o: any) => (
                    <span key={o.id} className="text-[10px] px-1.5 py-0.5 rounded-md"
                      style={{ background: `${(priorityCfg[o.priority] || priorityCfg.standard).color}10`, color: (priorityCfg[o.priority] || priorityCfg.standard).color }}>
                      {o.customer_name || o.customerName || "Client"}
                    </span>
                  ))}
                </div>
                <Button size="sm" className="w-full text-xs h-7" style={{ background: "hsl(var(--hud-cyan) / 0.12)", color: "hsl(var(--hud-cyan))" }}>
                  <Zap className="h-3 w-3 mr-1" /> Dispatcher ce lot
                </Button>
              </div>
            ))}
          </motion.div>
        )}

        {tab === "stats" && (
          <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <div className="rounded-xl p-3 space-y-3" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>Impact du regroupement</p>
              {[
                { label: "Commandes regroupées", value: `${orders.length} → ${bundles.length} lots`, color: "hsl(var(--hud-cyan))" },
                { label: "Réduction trajets estimée", value: `${Math.round(bundles.reduce((s, b) => s + b.savings, 0) / Math.max(bundles.length, 1))}%`, color: "hsl(var(--success))" },
                { label: "Temps total estimé", value: `${bundles.reduce((s, b) => s + b.estimatedTime, 0)} min`, color: "hsl(var(--info))" },
                { label: "Distance totale", value: `${bundles.reduce((s, b) => s + b.estimatedDistance, 0).toFixed(1)} km`, color: "hsl(var(--warning))" },
                { label: "Poids total", value: `${stats.totalWeight.toFixed(1)} kg`, color: "hsl(var(--hud-text))" },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>{s.label}</span>
                  <span className="text-[11px] font-bold" style={{ color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
