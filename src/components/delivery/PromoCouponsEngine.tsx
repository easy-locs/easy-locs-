/**
 * PromoCouponsEngine — GGG. Promo & Coupons Engine
 * Coupon creation, eligibility rules, usage limits, ROI tracking.
 * PASS92-GGG
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Plus, Percent, DollarSign, Clock, Users, TrendingUp, Copy, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Coupon {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_delivery";
  value: number;
  currency?: string;
  minOrder?: number;
  maxDiscount?: number;
  usageLimit: number;
  usageCount: number;
  perUserLimit: number;
  validFrom: string;
  validTo: string;
  active: boolean;
  categories?: string[];
  revenue: number;
  conversions: number;
}

const MOCK_COUPONS: Coupon[] = [
  { id: "cp1", code: "BIENVENUE20", type: "percentage", value: 20, minOrder: 30, maxDiscount: 15, usageLimit: 500, usageCount: 187, perUserLimit: 1, validFrom: "2026-03-01", validTo: "2026-03-31", active: true, categories: ["food", "fashion"], revenue: 4250, conversions: 187 },
  { id: "cp2", code: "LIVGRATUITE", type: "free_delivery", value: 0, minOrder: 25, usageLimit: 200, usageCount: 89, perUserLimit: 2, validFrom: "2026-03-10", validTo: "2026-03-20", active: true, revenue: 1780, conversions: 89 },
  { id: "cp3", code: "FLASH5EUR", type: "fixed", value: 5, currency: "EUR", minOrder: 20, usageLimit: 100, usageCount: 100, perUserLimit: 1, validFrom: "2026-03-05", validTo: "2026-03-12", active: false, revenue: 2100, conversions: 100 },
  { id: "cp4", code: "VIP30", type: "percentage", value: 30, minOrder: 50, maxDiscount: 25, usageLimit: 50, usageCount: 12, perUserLimit: 1, validFrom: "2026-03-15", validTo: "2026-04-15", active: true, categories: ["premium"], revenue: 960, conversions: 12 },
];

export default function PromoCouponsEngine({ orgId }: { orgId: string }) {
  const [coupons, setCoupons] = useState(MOCK_COUPONS);
  const [tab, setTab] = useState<"active" | "expired" | "create">("active");
  const [showCreate, setShowCreate] = useState(false);

  const stats = useMemo(() => ({
    totalRevenue: coupons.reduce((s, c) => s + c.revenue, 0),
    totalConversions: coupons.reduce((s, c) => s + c.conversions, 0),
    activeCount: coupons.filter(c => c.active).length,
    avgROI: coupons.length > 0 ? +(coupons.reduce((s, c) => s + (c.revenue / Math.max(c.conversions * (c.type === "fixed" ? c.value : 5), 1)), 0) / coupons.length).toFixed(1) : 0,
  }), [coupons]);

  const filtered = useMemo(() => {
    if (tab === "active") return coupons.filter(c => c.active);
    if (tab === "expired") return coupons.filter(c => !c.active || c.usageCount >= c.usageLimit);
    return coupons;
  }, [tab, coupons]);

  const toggleCoupon = (id: string) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Code "${code}" copié`);
  };

  const typeCfg: Record<string, { label: string; color: string; icon: string }> = {
    percentage: { label: "% Réduction", color: "hsl(var(--success))", icon: "%" },
    fixed: { label: "Montant fixe", color: "hsl(var(--info))", icon: "€" },
    free_delivery: { label: "Livraison gratuite", color: "hsl(var(--hud-cyan))", icon: "🚚" },
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4" style={{ color: "hsl(var(--warning))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Promos & Coupons</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: "Revenus", value: `${(stats.totalRevenue / 1000).toFixed(1)}k€`, color: "--success" },
          { label: "Conversions", value: stats.totalConversions, color: "--hud-cyan" },
          { label: "Actifs", value: stats.activeCount, color: "--info" },
          { label: "ROI moy.", value: `${stats.avgROI}x`, color: "--warning" },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
            <p className="text-xs font-bold" style={{ color: `hsl(var(${s.color}))` }}>{s.value}</p>
            <p className="text-[7px] mt-0.5" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "active" as const, label: "🟢 Actifs" },
          { id: "expired" as const, label: "⏹️ Expirés" },
          { id: "create" as const, label: "➕ Créer" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 px-2 rounded-md text-[10px] font-semibold transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--warning) / 0.12)" : "transparent",
              color: tab === t.id ? "hsl(var(--warning))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "create" ? (
          <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-xl p-3 space-y-2.5" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.1)" }}>
            <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>🎟️ Nouveau coupon</p>
            <Input placeholder="Code promo (ex: SUMMER25)" className="h-8 text-[10px] uppercase" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
            <div className="grid grid-cols-3 gap-1.5">
              {(["percentage", "fixed", "free_delivery"] as const).map(t => {
                const cfg = typeCfg[t];
                return (
                  <button key={t} className="py-2 rounded-lg text-center"
                    style={{ background: "hsl(var(--hud-bg))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                    <p className="text-sm">{cfg.icon}</p>
                    <p className="text-[8px] font-semibold mt-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Valeur (ex: 20)" type="number" className="h-8 text-[10px]" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
              <Input placeholder="Min. commande (€)" type="number" className="h-8 text-[10px]" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Limite totale" type="number" className="h-8 text-[10px]" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
              <Input placeholder="Limite / utilisateur" type="number" className="h-8 text-[10px]" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" className="h-8 text-[10px]" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
              <Input type="date" className="h-8 text-[10px]" style={{ background: "hsl(var(--hud-bg))", borderColor: "hsl(var(--hud-border) / 0.12)", color: "hsl(var(--hud-text))" }} />
            </div>
            <Button size="sm" className="w-full text-xs h-9" style={{ background: "hsl(var(--warning))", color: "#fff" }}>
              🎟️ Créer le coupon
            </Button>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {filtered.map(c => {
              const cfg = typeCfg[c.type];
              const usagePercent = Math.round((c.usageCount / c.usageLimit) * 100);
              return (
                <div key={c.id} className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${c.active ? cfg.color + "20" : "hsl(var(--hud-border) / 0.08)"}` }}>
                  <div className="flex items-center gap-3">
                    <div className="px-2 py-1 rounded-md" style={{ background: `${cfg.color}12`, border: `1px dashed ${cfg.color}30` }}>
                      <p className="text-[11px] font-mono font-bold" style={{ color: cfg.color }}>{c.code}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
                      <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                        {c.type === "percentage" ? `-${c.value}%` : c.type === "fixed" ? `-${c.value}€` : "Livraison offerte"}
                        {c.minOrder ? ` • Min ${c.minOrder}€` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => copyCode(c.code)} className="p-1 rounded-md" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                        <Copy className="h-3 w-3" />
                      </button>
                      <button onClick={() => toggleCoupon(c.id)} className="p-1">
                        {c.active ? <ToggleRight className="h-4 w-4" style={{ color: "hsl(var(--success))" }} /> : <ToggleLeft className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />}
                      </button>
                    </div>
                  </div>

                  {/* Usage bar */}
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Utilisations</span>
                      <span className="text-[8px] font-semibold" style={{ color: cfg.color }}>{c.usageCount}/{c.usageLimit}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${usagePercent}%`, background: cfg.color }} />
                    </div>
                  </div>

                  {/* ROI */}
                  <div className="flex items-center gap-3 text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                    <span>💰 {c.revenue}€ revenus</span>
                    <span>📈 {c.conversions} conversions</span>
                    <span>📅 {c.validFrom} → {c.validTo}</span>
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
