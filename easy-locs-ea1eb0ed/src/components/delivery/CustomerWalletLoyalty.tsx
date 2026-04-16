/**
 * CustomerWalletLoyalty — ZZ. Customer Wallet & Loyalty
 * Order history, favorite addresses, loyalty points, rewards.
 * PASS90-ZZ
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Heart, Gift, Star, MapPin, Clock, ArrowUpRight, ArrowDownLeft, Crown, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeliveryOrders, useUserAddresses, type MobilityJobRow } from "@/hooks/useDeliveryData";

interface LoyaltyTier {
  name: string;
  emoji: string;
  minPoints: number;
  perks: string[];
  color: string;
}

const TIERS: LoyaltyTier[] = [
  { name: "Bronze", emoji: "🥉", minPoints: 0, perks: ["Suivi en temps réel", "Support standard"], color: "hsl(30, 60%, 50%)" },
  { name: "Argent", emoji: "🥈", minPoints: 500, perks: ["Livraison prioritaire", "-5% sur frais", "Support prioritaire"], color: "hsl(0, 0%, 70%)" },
  { name: "Or", emoji: "🥇", minPoints: 2000, perks: ["Livraison express gratuite", "-10% sur frais", "Support VIP", "Offres exclusives"], color: "hsl(45, 90%, 50%)" },
  { name: "Platine", emoji: "💎", minPoints: 5000, perks: ["Livraison gratuite illimitée", "-15% sur frais", "Conciergerie dédiée", "Accès avant-première", "Cashback 3%"], color: "hsl(280, 70%, 60%)" },
];

const REWARDS: { id: string; name: string; cost: number; emoji: string }[] = [
  { id: "r1", name: "Livraison gratuite", cost: 200, emoji: "🚚" },
  { id: "r2", name: "Réduction 10%", cost: 350, emoji: "🏷️" },
  { id: "r3", name: "Livraison express", cost: 500, emoji: "⚡" },
  { id: "r4", name: "Cadeau surprise", cost: 1000, emoji: "🎁" },
  { id: "r5", name: "Mois premium", cost: 2500, emoji: "👑" },
];

export default function CustomerWalletLoyalty({ orgId }: { orgId: string }) {
  const { data: orders = [], isLoading: loadingOrders } = useDeliveryOrders(orgId);
  const { data: addresses = [], isLoading: loadingAddresses } = useUserAddresses();
  const [tab, setTab] = useState<"wallet" | "orders" | "favorites" | "rewards">("wallet");

  if (loadingOrders || loadingAddresses) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--hud-cyan))" }} />
        <span className="ml-2 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Chargement du wallet…</span>
      </div>
    );
  }

  const completedOrders = orders.filter((o: Record<string, unknown>) => o.status === "completed" || o.status === "delivered");
  const totalSpent = completedOrders.reduce((s: number, o: Record<string, unknown>) => s + Number(o.current_price || o.quoted_price || o.total_amount || 0), 0);
  const myPoints = Math.round(totalSpent * 2);
  const currentTier = TIERS.reduce((best, t) => myPoints >= t.minPoints ? t : best, TIERS[0]);
  const nextTier = TIERS.find(t => t.minPoints > myPoints);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Wallet className="h-4 w-4" style={{ color: "hsl(var(--hud-cyan))" }} />
        <h3 className="text-sm font-bold" style={{ color: "hsl(var(--hud-text))" }}>Wallet & Fidélité</h3>
      </div>

      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "hsl(var(--hud-surface))" }}>
        {([
          { id: "wallet" as const, label: "💳 Wallet" },
          { id: "orders" as const, label: "📋 Commandes" },
          { id: "favorites" as const, label: "❤️ Favoris" },
          { id: "rewards" as const, label: "🎁 Rewards" },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-1.5 px-1 rounded-md text-[0.625rem] font-semibold transition-all"
            style={{
              background: tab === t.id ? "hsl(var(--hud-cyan) / 0.12)" : "transparent",
              color: tab === t.id ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.5)",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "wallet" && (
          <motion.div key="wallet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${currentTier.color}20, hsl(var(--hud-surface)))`, border: `1px solid ${currentTier.color}30` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Statut fidélité</p>
                  <p className="text-lg font-extrabold tabular-nums" style={{ color: currentTier.color }}>{currentTier.emoji} {currentTier.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold tabular-nums" style={{ color: "hsl(var(--warning))" }}>{myPoints.toLocaleString()}</p>
                  <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>points</p>
                </div>
              </div>

              {nextTier && (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Prochain: {nextTier.emoji} {nextTier.name}</span>
                    <span className="text-[0.625rem] font-semibold" style={{ color: currentTier.color }}>{nextTier.minPoints - myPoints} pts restants</span>
                  </div>
                  <div className="w-full rounded-full h-1.5 mt-1" style={{ background: "hsl(var(--hud-bg))" }}>
                    <motion.div className="h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${((myPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100}%` }}
                      transition={{ duration: 1 }} style={{ background: currentTier.color }} />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Dépensé", value: `${totalSpent.toFixed(0)}€`, emoji: "💳" },
                { label: "Commandes", value: completedOrders.length, emoji: "📦" },
                { label: "Points", value: myPoints, emoji: "⭐" },
              ].map(s => (
                <div key={s.label} className="text-center py-2 rounded-xl" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                  <p className="text-sm">{s.emoji}</p>
                  <p className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>{s.value}</p>
                  <p className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-3 space-y-1.5" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[0.625rem] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>✨ Vos avantages {currentTier.name}</p>
              {currentTier.perks.map((p, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                  <Star className="h-3 w-3" style={{ color: currentTier.color }} />
                  <span className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text))" }}>{p}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "orders" && (
          <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {orders.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucune commande</div>}
            {orders.map((o: Record<string, unknown>) => {
              const status = String(o.status || "completed");
              const statusCfg: Record<string, { color: string; label: string }> = {
                completed: { color: "hsl(var(--success))", label: "✅ Livré" },
                delivered: { color: "hsl(var(--success))", label: "✅ Livré" },
                cancelled: { color: "hsl(var(--destructive))", label: "❌ Annulé" },
                refunded: { color: "hsl(var(--warning))", label: "🔄 Remboursé" },
                pending: { color: "hsl(var(--info))", label: "⏳ En cours" },
              };
              const cfg = statusCfg[status] || statusCfg.pending;
              const amount = Number(o.current_price || o.quoted_price || o.total_amount || 0);
              const date = o.created_at ? new Date(o.created_at).toLocaleDateString("fr-FR") : "";
              return (
                <div key={o.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.625rem] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>Commande #{String(o.id).slice(0, 8)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[0.625rem]" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-[0.625rem]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{date}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[0.6875rem] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{Number(amount).toFixed(2)}€</p>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "favorites" && (
          <motion.div key="favorites" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {addresses.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "#888" }}>Aucune adresse favorite</div>}
            {addresses.map((f: Record<string, unknown>) => (
              <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                <span className="text-lg">{f.emoji || "📍"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.6875rem] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{f.label || f.name || "Adresse"}</p>
                  <p className="text-[0.625rem] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{f.address || f.formatted_address || ""}</p>
                </div>
                <Heart className="h-3.5 w-3.5" style={{ color: "hsl(var(--destructive))" }} fill="hsl(var(--destructive))" />
              </div>
            ))}
            <Button size="sm" className="w-full text-xs h-8" variant="outline"
              style={{ borderColor: "hsl(var(--hud-border) / 0.15)", color: "hsl(var(--hud-text-dim))" }}>
              <Plus className="h-3 w-3 mr-1" /> Ajouter une adresse
            </Button>
          </motion.div>
        )}

        {tab === "rewards" && (
          <motion.div key="rewards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <div className="text-center py-2 rounded-xl" style={{ background: "hsl(var(--warning) / 0.06)", border: "1px solid hsl(var(--warning) / 0.12)" }}>
              <p className="text-xs" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Points disponibles</p>
              <p className="text-xl font-extrabold tabular-nums" style={{ color: "hsl(var(--warning))" }}>{myPoints.toLocaleString()}</p>
            </div>
            {REWARDS.map(r => {
              const canAfford = myPoints >= r.cost;
              return (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)", opacity: canAfford ? 1 : 0.5 }}>
                  <span className="text-lg">{r.emoji}</span>
                  <div className="flex-1">
                    <p className="text-[0.6875rem] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{r.name}</p>
                    <p className="text-[0.625rem]" style={{ color: "hsl(var(--warning))" }}>{r.cost} points</p>
                  </div>
                  <Button size="sm" className="text-[0.625rem] h-7 px-3" disabled={!canAfford}
                    style={{ background: canAfford ? "hsl(var(--hud-cyan))" : "hsl(var(--muted))", color: canAfford ? "hsl(var(--hud-bg))" : "hsl(var(--muted-foreground))" }}>
                    Échanger
                  </Button>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
