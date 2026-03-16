/**
 * OrderBundlingEngine — MMM. Order Bundling
 * Geographic order grouping for route optimization.
 * PASS93-MMM
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, MapPin, Package, Zap, Clock, TrendingUp, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Order {
  id: string;
  address: string;
  lat: number;
  lng: number;
  weight: number;
  priority: "standard" | "express" | "urgent";
  status: "pending" | "bundled" | "dispatched";
  createdAt: string;
  customerName: string;
}

interface Bundle {
  id: string;
  orders: Order[];
  zone: string;
  estimatedDistance: number;
  estimatedTime: number;
  savings: number;
  status: "draft" | "confirmed" | "dispatched";
}

const MOCK_ORDERS: Order[] = [
  { id: "o1", address: "12 Rue de Rivoli, Paris 1er", lat: 48.856, lng: 2.359, weight: 2.5, priority: "standard", status: "pending", createdAt: "2026-03-16T09:00", customerName: "Alice M." },
  { id: "o2", address: "45 Rue du Faubourg, Paris 1er", lat: 48.858, lng: 2.361, weight: 1.2, priority: "standard", status: "pending", createdAt: "2026-03-16T09:15", customerName: "Bruno C." },
  { id: "o3", address: "8 Place Vendôme, Paris 1er", lat: 48.868, lng: 2.329, weight: 0.5, priority: "express", status: "pending", createdAt: "2026-03-16T09:20", customerName: "Claire D." },
  { id: "o4", address: "120 Bd Haussmann, Paris 8e", lat: 48.875, lng: 2.316, weight: 3.0, priority: "standard", status: "pending", createdAt: "2026-03-16T09:30", customerName: "David R." },
  { id: "o5", address: "55 Av. Montaigne, Paris 8e", lat: 48.866, lng: 2.306, weight: 1.8, priority: "urgent", status: "pending", createdAt: "2026-03-16T09:35", customerName: "Emma F." },
  { id: "o6", address: "22 Rue de Passy, Paris 16e", lat: 48.856, lng: 2.279, weight: 4.2, priority: "standard", status: "pending", createdAt: "2026-03-16T10:00", customerName: "François G." },
  { id: "o7", address: "15 Rue de la Pompe, Paris 16e", lat: 48.862, lng: 2.277, weight: 0.8, priority: "standard", status: "pending", createdAt: "2026-03-16T10:10", customerName: "Gaëlle H." },
  { id: "o8", address: "33 Av. Victor Hugo, Paris 16e", lat: 48.869, lng: 2.285, weight: 2.1, priority: "express", status: "pending", createdAt: "2026-03-16T10:20", customerName: "Hugo J." },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clusterOrders(orders: Order[], radiusKm: number = 1.5): Bundle[] {
  const used = new Set<string>();
  const bundles: Bundle[] = [];
  const sorted = [...orders].sort((a, b) => (a.priority === "urgent" ? -1 : b.priority === "urgent" ? 1 : 0));

  sorted.forEach(order => {
    if (used.has(order.id)) return;
    const cluster = [order];
    used.add(order.id);

    sorted.forEach(other => {
      if (used.has(other.id)) return;
      const dist = haversineKm(order.lat, order.lng, other.lat, other.lng);
      if (dist <= radiusKm) {
        cluster.push(other);
        used.add(other.id);
      }
    });

    const totalDist = cluster.length > 1
      ? cluster.reduce((s, o, i) => i === 0 ? 0 : s + haversineKm(cluster[i - 1].lat, cluster[i - 1].lng, o.lat, o.lng), 0)
      : 0;
    const individualDist = cluster.reduce((s, o) => s + 3.5, 0); // avg 3.5km per separate trip
    const savings = Math.max(0, Math.round((1 - totalDist / Math.max(individualDist, 1)) * 100));

    bundles.push({
      id: `b${bundles.length + 1}`,
      orders: cluster,
      zone: cluster[0].address.split(",").pop()?.trim() || "Zone",
      estimatedDistance: Math.round((totalDist || 2.5) * 10) / 10,
      estimatedTime: Math.round(cluster.length * 8 + (totalDist || 2.5) * 3),
      savings,
      status: "draft",
    });
  });

  return bundles;
}

export default function OrderBundlingEngine({ orgId }: { orgId: string }) {
  const [tab, setTab] = useState<"pending" | "bundles" | "stats">("pending");
  const [radius, setRadius] = useState(1.5);
  const [orders] = useState(MOCK_ORDERS);

  const bundles = useMemo(() => clusterOrders(orders, radius), [orders, radius]);

  const stats = useMemo(() => ({
    totalOrders: orders.length,
    totalBundles: bundles.length,
    avgPerBundle: Math.round(orders.length / Math.max(bundles.length, 1) * 10) / 10,
    totalSavings: bundles.reduce((s, b) => s + b.savings, 0),
    totalWeight: orders.reduce((s, o) => s + o.weight, 0),
    urgentCount: orders.filter(o => o.priority === "urgent").length,
  }), [orders, bundles]);

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
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
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
            <p className="text-[7px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Radius slider */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Rayon:</span>
        <input type="range" min="0.5" max="5" step="0.5" value={radius}
          onChange={e => setRadius(+e.target.value)}
          className="flex-1 h-1 accent-[hsl(var(--hud-cyan))]" />
        <span className="text-[9px] font-bold" style={{ color: "hsl(var(--hud-cyan))" }}>{radius} km</span>
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
            {orders.map(o => {
              const p = priorityCfg[o.priority];
              return (
                <div key={o.id} className="rounded-lg px-3 py-2 flex items-center gap-2"
                  style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}>
                  <span className="text-xs">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{o.customerName}</p>
                    <p className="text-[8px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{o.address}</p>
                  </div>
                  <span className="text-[9px] font-mono shrink-0" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{o.weight}kg</span>
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
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: "hsl(var(--success) / 0.1)", color: "hsl(var(--success))" }}>
                      -{b.savings}% trajet
                    </span>
                  )}
                </div>
                <div className="flex gap-3 text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                  <span>📏 {b.estimatedDistance} km</span>
                  <span>⏱️ ~{b.estimatedTime} min</span>
                  <span>📦 {b.orders.reduce((s, o) => s + o.weight, 0).toFixed(1)} kg</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {b.orders.map(o => (
                    <span key={o.id} className="text-[8px] px-1.5 py-0.5 rounded-md"
                      style={{ background: `${priorityCfg[o.priority].color}10`, color: priorityCfg[o.priority].color }}>
                      {o.customerName}
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
