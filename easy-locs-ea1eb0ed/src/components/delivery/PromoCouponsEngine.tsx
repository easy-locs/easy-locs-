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
import { useCoupons, useUpdateMutation, useInsertMutation } from "@/hooks/useDeliveryData";

export default function PromoCouponsEngine({ orgId }: { orgId: string }) {
  const { data: coupons = [], isLoading } = useCoupons(orgId);
  const updateCoupon = useUpdateMutation("storefront_coupons");
  const insertCoupon = useInsertMutation("storefront_coupons");
  const [tab, setTab] = useState<"active" | "expired" | "create">("active");

  if (isLoading) return <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Loading...</div>;

  const stats = {
    totalRevenue: coupons.reduce((s: number, c: any) => s + (c.revenue || 0), 0),
    totalConversions: coupons.reduce((s: number, c: any) => s + (c.conversions || 0), 0),
    activeCount: coupons.filter((c: any) => c.active).length,
    avgROI: coupons.length > 0 ? +(coupons.reduce((s: number, c: any) => s + ((c.revenue || 0) / Math.max((c.conversions || 0) * (c.type === "fixed" ? (c.value || 5) : 5), 1)), 0) / coupons.length).toFixed(1) : 0,
  };

  const filtered = (() => {
    if (tab === "active") return coupons.filter((c: any) => c.active);
    if (tab === "expired") return coupons.filter((c: any) => !c.active || (c.usage_count || c.usageCount || 0) >= (c.usage_limit || c.usageLimit || Infinity));
    return coupons;
  })();

  const toggleCoupon = (id: string, currentActive: boolean) => {
    updateCoupon.mutate({ id, active: !currentActive });
  };

  const copyCode = async (code: string) => {
    const { copyToClipboard } = await import("@/lib/clipboard");
    const r = await copyToClipboard(code);
    if (r.ok) toast.success(`Code "${code}" copié`);
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {[
          { label: "Revenus", value: `${(stats.totalRevenue / 1000).toFixed(1)}k€`, color: "--success" },
          { label: "Conversions", value: stats.totalConversions, color: "--hud-cyan" },
          { label: "Actifs", value: stats.activeCount, color: "--info" },
          { label: "ROI moy.", value: `${stats.avgROI}x`, color: "--warning" },
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
                    <p className="text-[10px] font-semibold mt-0.5" style={{ color: cfg.color }}>{cfg.label}</p>
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
            {filtered.length === 0 && (
              <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucun coupon trouvé</div>
            )}
            {filtered.map((c: any) => {
              const cfg = typeCfg[c.type] || typeCfg.percentage;
              const usageCount = c.usage_count || c.usageCount || 0;
              const usageLimit = c.usage_limit || c.usageLimit || 1;
              const usagePercent = Math.round((usageCount / usageLimit) * 100);
              const minOrder = c.min_order || c.minOrder;
              const validFrom = c.valid_from || c.validFrom || "";
              const validTo = c.valid_to || c.validTo || "";
              return (
                <div key={c.id} className="rounded-xl p-3 space-y-2" style={{ background: "hsl(var(--hud-surface))", border: `1px solid ${c.active ? cfg.color + "20" : "hsl(var(--hud-border) / 0.08)"}` }}>
                  <div className="flex items-center gap-3">
                    <div className="px-2 py-1 rounded-md" style={{ background: `${cfg.color}12`, border: `1px dashed ${cfg.color}30` }}>
                      <p className="text-[11px] font-mono font-bold" style={{ color: cfg.color }}>{c.code}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
                      <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                        {c.type === "percentage" ? `-${c.value}%` : c.type === "fixed" ? `-${c.value}€` : "Livraison offerte"}
                        {minOrder ? ` • Min ${minOrder}€` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => copyCode(c.code)} className="p-1 rounded-md" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                        <Copy className="h-3 w-3" />
                      </button>
                      <button onClick={() => toggleCoupon(c.id, c.active)} className="p-1">
                        {c.active ? <ToggleRight className="h-4 w-4" style={{ color: "hsl(var(--success))" }} /> : <ToggleLeft className="h-4 w-4" style={{ color: "hsl(var(--hud-text-dim) / 0.3)" }} />}
                      </button>
                    </div>
                  </div>

                  {/* Usage bar */}
                  <div>
                    <div className="flex justify-between mb-0.5">
                      <span className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>Utilisations</span>
                      <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>{usageCount}/{usageLimit}</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--hud-bg))" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${usagePercent}%`, background: cfg.color }} />
                    </div>
                  </div>

                  {/* ROI */}
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>
                    <span>💰 {c.revenue || 0}€ revenus</span>
                    <span>📈 {c.conversions || 0} conversions</span>
                    <span>📅 {validFrom} → {validTo}</span>
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
