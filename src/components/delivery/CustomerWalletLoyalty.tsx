/**
 * CustomerWalletLoyalty — ZZ. Customer Wallet & Loyalty
 * Order history, favorite addresses, loyalty points, rewards.
 * PASS90-ZZ
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Heart, Gift, Star, MapPin, Clock, ArrowUpRight, ArrowDownLeft, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoyaltyTier {
  name: string;
  emoji: string;
  minPoints: number;
  perks: string[];
  color: string;
}

interface OrderHistoryItem {
  id: string;
  date: string;
  from: string;
  to: string;
  amount: number;
  status: "completed" | "cancelled" | "refunded";
  pointsEarned: number;
}

interface FavoriteAddress {
  id: string;
  label: string;
  address: string;
  emoji: string;
  usageCount: number;
}

const TIERS: LoyaltyTier[] = [
  { name: "Bronze", emoji: "🥉", minPoints: 0, perks: ["1 point par €", "Suivi temps réel"], color: "hsl(180 10% 55%)" },
  { name: "Silver", emoji: "🥈", minPoints: 500, perks: ["1.5 points par €", "Livraison prioritaire", "-5% frais"], color: "hsl(var(--muted-foreground))" },
  { name: "Gold", emoji: "🥇", minPoints: 2000, perks: ["2 points par €", "Express gratuit 1x/mois", "-10% frais", "Support prioritaire"], color: "hsl(var(--warning))" },
  { name: "Platinum", emoji: "💎", minPoints: 5000, perks: ["3 points par €", "Express gratuit illimité", "-15% frais", "Accès VIP", "Cashback 2%"], color: "hsl(var(--hud-cyan))" },
];

const MOCK_ORDERS: OrderHistoryItem[] = [
  { id: "o1", date: "2026-03-15", from: "12 Rue Rivoli", to: "45 Ave Foch", amount: 12.50, status: "completed", pointsEarned: 25 },
  { id: "o2", date: "2026-03-14", from: "8 Blvd Haussmann", to: "22 Rue de la Paix", amount: 8.00, status: "completed", pointsEarned: 16 },
  { id: "o3", date: "2026-03-12", from: "5 Place Vendôme", to: "100 Ave Champs-Élysées", amount: 15.00, status: "completed", pointsEarned: 30 },
  { id: "o4", date: "2026-03-10", from: "3 Rue du Louvre", to: "18 Blvd Saint-Germain", amount: 9.50, status: "cancelled", pointsEarned: 0 },
  { id: "o5", date: "2026-03-08", from: "77 Rue de Rennes", to: "14 Ave Montaigne", amount: 11.00, status: "refunded", pointsEarned: 0 },
];

const MOCK_FAVORITES: FavoriteAddress[] = [
  { id: "f1", label: "Maison", address: "12 Rue Rivoli, 75001 Paris", emoji: "🏠", usageCount: 23 },
  { id: "f2", label: "Bureau", address: "45 Ave Foch, 75116 Paris", emoji: "🏢", usageCount: 18 },
  { id: "f3", label: "Salle de sport", address: "8 Blvd Haussmann, 75009 Paris", emoji: "🏋️", usageCount: 7 },
];

const REWARDS = [
  { id: "r1", name: "Livraison gratuite", cost: 200, emoji: "🚚" },
  { id: "r2", name: "-3€ sur commande", cost: 150, emoji: "💰" },
  { id: "r3", name: "Express offert", cost: 300, emoji: "⚡" },
  { id: "r4", name: "Double points (7j)", cost: 500, emoji: "✨" },
];

export default function CustomerWalletLoyalty() {
  const [tab, setTab] = useState<"wallet" | "orders" | "favorites" | "rewards">("wallet");
  const myPoints = 1850;
  const currentTier = TIERS.reduce((best, t) => myPoints >= t.minPoints ? t : best, TIERS[0]);
  const nextTier = TIERS.find(t => t.minPoints > myPoints);
  const totalSpent = MOCK_ORDERS.filter(o => o.status === "completed").reduce((s, o) => s + o.amount, 0);

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
            className="flex-1 py-1.5 px-1 rounded-md text-[9px] font-semibold transition-all"
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
            {/* Loyalty card */}
            <div className="rounded-xl p-4 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${currentTier.color}20, hsl(var(--hud-surface)))`, border: `1px solid ${currentTier.color}30` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Statut fidélité</p>
                  <p className="text-lg font-black" style={{ color: currentTier.color }}>{currentTier.emoji} {currentTier.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black" style={{ color: "hsl(var(--warning))" }}>{myPoints.toLocaleString()}</p>
                  <p className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>points</p>
                </div>
              </div>

              {nextTier && (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>Prochain: {nextTier.emoji} {nextTier.name}</span>
                    <span className="text-[9px] font-semibold" style={{ color: currentTier.color }}>{nextTier.minPoints - myPoints} pts restants</span>
                  </div>
                  <div className="w-full rounded-full h-1.5 mt-1" style={{ background: "hsl(var(--hud-bg))" }}>
                    <motion.div className="h-1.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${((myPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100}%` }}
                      transition={{ duration: 1 }} style={{ background: currentTier.color }} />
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Dépensé", value: `${totalSpent.toFixed(0)}€`, emoji: "💳" },
                { label: "Commandes", value: MOCK_ORDERS.filter(o => o.status === "completed").length, emoji: "📦" },
                { label: "Économisé", value: "14€", emoji: "🎉" },
              ].map(s => (
                <div key={s.label} className="text-center py-2 rounded-xl" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                  <p className="text-sm">{s.emoji}</p>
                  <p className="text-xs font-bold" style={{ color: "hsl(var(--hud-text))" }}>{s.value}</p>
                  <p className="text-[8px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Current tier perks */}
            <div className="rounded-xl p-3 space-y-1.5" style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
              <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--hud-text-dim))" }}>✨ Vos avantages {currentTier.name}</p>
              {currentTier.perks.map((p, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ background: "hsl(var(--hud-bg))" }}>
                  <Star className="h-3 w-3" style={{ color: currentTier.color }} />
                  <span className="text-[10px]" style={{ color: "hsl(var(--hud-text))" }}>{p}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === "orders" && (
          <motion.div key="orders" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {MOCK_ORDERS.map(o => {
              const statusCfg: Record<string, { color: string; label: string }> = {
                completed: { color: "hsl(var(--success))", label: "✅ Livré" },
                cancelled: { color: "hsl(var(--destructive))", label: "❌ Annulé" },
                refunded: { color: "hsl(var(--warning))", label: "🔄 Remboursé" },
              };
              const cfg = statusCfg[o.status];
              return (
                <div key={o.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold truncate" style={{ color: "hsl(var(--hud-text))" }}>{o.from} → {o.to}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px]" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{o.date}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{o.amount.toFixed(2)}€</p>
                    {o.pointsEarned > 0 && <p className="text-[9px]" style={{ color: "hsl(var(--warning))" }}>+{o.pointsEarned} pts</p>}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === "favorites" && (
          <motion.div key="favorites" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            {MOCK_FAVORITES.map(f => (
              <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)" }}>
                <span className="text-lg">{f.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold" style={{ color: "hsl(var(--hud-text))" }}>{f.label}</p>
                  <p className="text-[9px] truncate" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>{f.address}</p>
                </div>
                <span className="text-[9px]" style={{ color: "hsl(var(--hud-text-dim) / 0.4)" }}>{f.usageCount}x</span>
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
              <p className="text-xl font-black" style={{ color: "hsl(var(--warning))" }}>{myPoints.toLocaleString()}</p>
            </div>
            {REWARDS.map(r => {
              const canAfford = myPoints >= r.cost;
              return (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.08)", opacity: canAfford ? 1 : 0.5 }}>
                  <span className="text-lg">{r.emoji}</span>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold" style={{ color: "hsl(var(--hud-text))" }}>{r.name}</p>
                    <p className="text-[9px]" style={{ color: "hsl(var(--warning))" }}>{r.cost} points</p>
                  </div>
                  <Button size="sm" className="text-[9px] h-7 px-3" disabled={!canAfford}
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
