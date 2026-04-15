/**
 * WarehouseManagement — III. Warehouse Management
 * Multi-warehouse stock levels, low-stock alerts, inter-depot transfers.
 * PASS92-III
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Warehouse, Package, AlertTriangle, ArrowRightLeft, Plus, Search, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWarehouses, useWarehouseTransfers } from "@/hooks/useDeliveryData";

export default function WarehouseManagement({ orgId }: { orgId: string }) {
  const { data: warehouses = [], isLoading: loadingW } = useWarehouses(orgId);
  const { data: transfers = [], isLoading: loadingT } = useWarehouseTransfers(orgId);
  const [tab, setTab] = useState<"overview" | "stock" | "transfers">("overview");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  if (loadingW || loadingT) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  const alerts = warehouses.flatMap((w: any) =>
    (w.products || []).filter((p: any) => p.quantity <= p.minThreshold)
      .map((p: any) => ({ warehouse: w.name, product: p.name, quantity: p.quantity, threshold: p.minThreshold }))
  );

  const totalStats = {
    warehouses: warehouses.length,
    totalCapacity: warehouses.reduce((s: number, w: any) => s + (w.capacity || 0), 0),
    totalUsed: warehouses.reduce((s: number, w: any) => s + (w.used || 0), 0),
    alerts: alerts.length,
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Warehouse className="h-4 w-4" style={{ color: "hsl(var(--info))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Gestion Entrepôts</h3>
        {alerts.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
            style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))" }}>
            ⚠️ {alerts.length} alerte{alerts.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {[
          { label: "Entrepôts", value: totalStats.warehouses, color: "--info" },
          { label: "Capacité", value: totalStats.totalCapacity > 0 ? `${Math.round(totalStats.totalUsed / totalStats.totalCapacity * 100)}%` : "0%", color: "--hud-cyan" },
          { label: "Produits", value: warehouses.reduce((s: number, w: any) => s + (w.products?.length || 0), 0), color: "--success" },
          { label: "Alertes", value: totalStats.alerts, color: "--destructive" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "overview" as const, label: "🏭 Entrepôts" },
          { id: "stock" as const, label: "📦 Stock" },
          { id: "transfers" as const, label: "🔄 Transferts" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--info) / 0.12)" : "transparent",
              color: tab === t.id ? "hsl(var(--info))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="rounded-xl p-2.5 space-y-1.5" style={{ background: "hsl(var(--destructive) / 0.04)", border: "1px solid hsl(var(--destructive) / 0.1)" }}>
                <p className="text-[10px] font-bold flex items-center gap-1" style={{ color: "hsl(var(--destructive))" }}>
                  <AlertTriangle className="h-3 w-3" /> Ruptures de stock imminentes
                </p>
                {alerts.map((a: any, i: number) => (
                  <p key={i} className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}>
                    📍 {a.warehouse}: <strong>{a.product}</strong> — {a.quantity}/{a.threshold} (seuil min)
                  </p>
                ))}
              </div>
            )}

            {warehouses.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucun entrepôt trouvé</div>
            )}

            {/* Warehouses */}
            {warehouses.map((w: any) => {
              const fillPercent = w.capacity ? Math.round(((w.used || 0) / w.capacity) * 100) : 0;
              const fillColor = fillPercent > 80 ? "hsl(var(--destructive))" : fillPercent > 60 ? "hsl(var(--warning))" : "hsl(var(--success))";
              return (
                <div key={w.id} className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                  <div className="flex items-center gap-3">
                    <Warehouse className="h-4 w-4" style={{ color: "hsl(var(--info))" }} />
                    <div className="flex-1">
                      <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{w.name}</p>
                      <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>📍 {w.location} • {(w.products || []).length} produits</p>
                    </div>
                    <span className="text-[10px] font-bold" style={{ color: fillColor }}>{fillPercent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${fillPercent}%`, background: fillColor }} />
                  </div>
                  <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{(w.used || 0).toLocaleString()} / {(w.capacity || 0).toLocaleString()} unités</p>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "stock" && (
          <motion.div key="stock" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <Input placeholder="Rechercher un produit…" value={search} onChange={e => setSearch(e.target.value)}
              className="h-8 text-xs" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
            {warehouses.map((w: any) => (
              <div key={w.id} className="space-y-1.5">
                <p className="text-[10px] font-bold px-1" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{w.name}</p>
                {(w.products || []).filter((p: any) => !search || p.name?.toLowerCase().includes(search.toLowerCase())).map((p: any) => {
                  const isLow = p.quantity <= (p.minThreshold || 0);
                  const fillPercent = p.maxCapacity ? Math.round((p.quantity / p.maxCapacity) * 100) : 0;
                  return (
                    <div key={p.id} className="rounded-lg px-3 py-2" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${isLow ? "hsl(var(--destructive) / 0.15)" : "hsl(var(--hud-border) / 0.06)"}` }}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{p.name}</p>
                          <p className="text-[10px] font-mono" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }}>{p.sku}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {p.trend === "down" && <TrendingDown className="h-3 w-3" style={{ color: "hsl(var(--destructive))" }} />}
                          {p.trend === "up" && <TrendingUp className="h-3 w-3" style={{ color: "hsl(var(--success))" }} />}
                          <span className="text-[10px] font-bold" style={{ color: isLow ? "hsl(var(--destructive))" : "hsl(var(--hud-text))" }}>{p.quantity}</span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden mt-1" style={{ background: "hsl(var(--hud-bg))" }}>
                        <div className="h-full rounded-full" style={{ width: `${fillPercent}%`, background: isLow ? "hsl(var(--destructive))" : "hsl(var(--success))" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </motion.div>
        )}

        {tab === "transfers" && (
          <motion.div key="transfers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <Button size="sm" className="w-full text-xs h-8" style={{ background: "hsl(var(--info) / 0.12)", color: "hsl(var(--info))" }}>
              <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Nouveau transfert
            </Button>
            {transfers.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucun transfert</div>
            )}
            {transfers.map((t: any) => {
              const statusCfg: Record<string, { color: string; label: string; emoji: string }> = {
                pending: { color: "hsl(var(--warning))", label: "En attente", emoji: "⏳" },
                in_transit: { color: "hsl(var(--hud-cyan))", label: "En transit", emoji: "🚚" },
                completed: { color: "hsl(var(--success))", label: "Terminé", emoji: "✅" },
              };
              const cfg = statusCfg[t.status] || statusCfg.pending;
              return (
                <div key={t.id} className="rounded-xl p-3" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${cfg.color}15` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{cfg.emoji}</span>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{t.product || t.product_name || "Transfer"} × {t.quantity}</p>
                      <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{t.from || t.from_warehouse} → {t.to || t.to_warehouse}</p>
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
