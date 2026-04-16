/**
 * CustomerRewardsProgram — GGG. Customer loyalty & rewards.
 * Points per order, reward tiers, cashback, collectible badges.
 * PASS98-GGG
 */
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Star, Gift, Trophy, Zap, Crown, Heart,
  ShoppingBag, ArrowUp, Sparkles, CheckCircle2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useBuyerOrders, type MobilityJobRow } from "@/hooks/useDeliveryData";

interface RewardTier {
  name: string;
  minPoints: number;
  icon: string;
  color: string;
  perks: string[];
  cashbackPct: number;
}

interface RewardBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  earned: boolean;
  earnedAt?: Date;
}

const TIERS: RewardTier[] = [
  { name: "Découverte", minPoints: 0, icon: "🌱", color: "--success", perks: ["Suivi temps réel", "Support email"], cashbackPct: 1 },
  { name: "Fidèle", minPoints: 500, icon: "⭐", color: "--info", perks: ["Livraison prioritaire", "-5% frais", "Support chat"], cashbackPct: 2 },
  { name: "Premium", minPoints: 2000, icon: "💫", color: "--warning", perks: ["Express gratuit", "-10% frais", "Support prioritaire", "Accès exclusif"], cashbackPct: 3 },
  { name: "VIP", minPoints: 5000, icon: "👑", color: "--primary", perks: ["Tout gratuit", "-15% frais", "Conciergerie", "Accès anticipé", "Cashback max"], cashbackPct: 5 },
];

export default function CustomerRewardsProgram({ className }: { className?: string }) {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useBuyerOrders(user?.id || "");
  const [view, setView] = useState<"overview" | "badges" | "history">("overview");

  const completedOrders = useMemo(() =>
    orders.filter((o: MobilityJobRow) => o.status === "completed" || o.status === "delivered"),
    [orders]
  );

  const totalPoints = useMemo(() => {
    return completedOrders.reduce((s: number, o: MobilityJobRow) => s + Math.round((o.current_price || o.quoted_price || 0) * 2), 0);
  }, [completedOrders]);

  const cashbackBalance = useMemo(() => {
    const currentTier = [...TIERS].reverse().find(t => totalPoints >= t.minPoints) ?? TIERS[0];
    return Math.round(completedOrders.reduce((s: number, o: MobilityJobRow) => s + (o.current_price || o.quoted_price || 0), 0) * currentTier.cashbackPct / 100 * 100) / 100;
  }, [completedOrders, totalPoints]);

  const currentTier = [...TIERS].reverse().find(t => totalPoints >= t.minPoints) ?? TIERS[0];
  const nextTier = TIERS.find(t => t.minPoints > totalPoints);
  const progressToNext = nextTier
    ? ((totalPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
    : 100;

  const badges = useMemo<RewardBadge[]>(() => {
    const count = completedOrders.length;
    return [
      { id: "rb1", name: "Bienvenue", icon: "🎉", description: "Première commande", earned: count >= 1 },
      { id: "rb2", name: "Habitué", icon: "☕", description: "5 commandes", earned: count >= 5 },
      { id: "rb3", name: "Fan", icon: "❤️", description: "15 commandes", earned: count >= 15 },
      { id: "rb4", name: "Super client", icon: "🌟", description: "30 commandes", earned: count >= 30 },
      { id: "rb5", name: "Ambassadeur", icon: "🏅", description: "50 commandes", earned: count >= 50 },
      { id: "rb6", name: "Légende", icon: "👑", description: "100 commandes", earned: count >= 100 },
    ];
  }, [completedOrders.length]);

  const history = useMemo(() => {
    return completedOrders.slice(0, 15).map((o: MobilityJobRow) => ({
      id: o.id,
      action: `Commande #${String(o.id).slice(0, 6)}`,
      points: Math.round((o.current_price || o.quoted_price || 0) * 2),
      date: new Date(o.created_at),
    }));
  }, [completedOrders]);

  const earnedBadges = badges.filter(b => b.earned).length;

  const redeemCashback = () => {
    haptic("success");
    toast.success(`💰 ${cashbackBalance.toFixed(2)}€ crédités sur votre wallet !`);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className || ""}`}>
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(var(--primary))" }} />
        <span className="ml-2 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Chargement du programme fidélité…</span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "hsl(var(--foreground))" }}>
          <Trophy className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
          Programme de fidélité
        </h3>
        <span className="text-lg">{currentTier.icon}</span>
      </div>

      <div className="rounded-xl p-4 text-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.03))", border: "1px solid hsl(var(--primary) / 0.15)" }}>
        <p className="text-[10px] font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Vos points</p>
        <motion.p className="text-3xl font-extrabold tabular-nums" style={{ color: "hsl(var(--primary))" }}
          initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
          {totalPoints.toLocaleString()}
        </motion.p>
        <p className="text-[10px] font-semibold mt-1" style={{ color: `hsl(var(${currentTier.color}))` }}>
          {currentTier.icon} Niveau {currentTier.name} — {currentTier.cashbackPct}% cashback
        </p>

        {nextTier && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span style={{ color: "hsl(var(--muted-foreground))" }}>{currentTier.name}</span>
              <span style={{ color: "hsl(var(--muted-foreground))" }}>{nextTier.name} ({nextTier.minPoints} pts)</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.3)" }}>
              <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${progressToNext}%` }}
                style={{ background: "hsl(var(--primary))" }} />
            </div>
            <p className="text-[10px] mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              Encore {nextTier.minPoints - totalPoints} pts pour {nextTier.icon} {nextTier.name}
            </p>
          </div>
        )}
      </div>

      {cashbackBalance > 0 && (
        <div className="rounded-xl p-3 flex items-center justify-between"
          style={{ background: "hsl(var(--success) / 0.05)", border: "1px solid hsl(var(--success) / 0.15)" }}>
          <div>
            <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--success))" }}>Cashback disponible</p>
            <p className="text-lg font-extrabold tabular-nums" style={{ color: "hsl(var(--success))" }}>{cashbackBalance.toFixed(2)}€</p>
          </div>
          <Button size="sm" className="text-[10px] h-8" onClick={redeemCashback}
            style={{ background: "hsl(var(--success))", color: "#fff" }}>
            <Gift className="h-3 w-3 mr-1" /> Encaisser
          </Button>
        </div>
      )}

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "hsl(var(--muted) / 0.3)" }}>
        {(["overview", "badges", "history"] as const).map(v => (
          <button key={v} onClick={() => { setView(v); haptic("selection"); }}
            className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold"
            style={{
              background: view === v ? "hsl(var(--primary) / 0.1)" : "transparent",
              color: view === v ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {v === "overview" ? "🏆 Paliers" : v === "badges" ? `🎖️ Badges (${earnedBadges}/${badges.length})` : "📜 Historique"}
          </button>
        ))}
      </div>

      {view === "overview" && (
        <div className="space-y-2">
          {TIERS.map(tier => {
            const isActive = tier.name === currentTier.name;
            const isUnlocked = totalPoints >= tier.minPoints;
            return (
              <div key={tier.name} className="rounded-xl p-3"
                style={{
                  background: isActive ? `hsl(var(${tier.color}) / 0.06)` : "hsl(var(--muted) / 0.15)",
                  border: `1px solid ${isActive ? `hsl(var(${tier.color}) / 0.2)` : "hsl(var(--border) / 0.08)"}`,
                  opacity: isUnlocked ? 1 : 0.5,
                }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{tier.icon}</span>
                    <div>
                      <p className="text-[11px] font-bold" style={{ color: "hsl(var(--foreground))" }}>{tier.name}</p>
                      <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{tier.minPoints}+ pts</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: `hsl(var(${tier.color}))` }}>
                    {tier.cashbackPct}% cashback
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {tier.perks.map(p => (
                    <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: "hsl(var(--muted) / 0.3)", color: "hsl(var(--muted-foreground))" }}>
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "badges" && (
        <div className="grid grid-cols-3 gap-2">
          {badges.map(b => (
            <motion.div key={b.id} className="rounded-xl p-3 text-center"
              whileTap={{ scale: 0.97 }}
              style={{
                background: b.earned ? "hsl(var(--primary) / 0.05)" : "hsl(var(--muted) / 0.15)",
                border: `1px solid ${b.earned ? "hsl(var(--primary) / 0.15)" : "hsl(var(--border) / 0.08)"}`,
                opacity: b.earned ? 1 : 0.4,
              }}>
              <span className="text-2xl">{b.icon}</span>
              <p className="text-[10px] font-bold mt-1" style={{ color: b.earned ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                {b.name}
              </p>
              <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{b.description}</p>
              {b.earned && <CheckCircle2 className="h-3 w-3 mx-auto mt-1" style={{ color: "hsl(var(--success))" }} />}
            </motion.div>
          ))}
        </div>
      )}

      {view === "history" && (
        <div className="space-y-1.5">
          {history.length === 0 && (
            <p className="text-center py-6 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Aucun historique de points</p>
          )}
          {history.map(h => (
            <div key={h.id} className="rounded-lg px-3 py-2 flex items-center justify-between"
              style={{ background: "hsl(var(--muted) / 0.15)" }}>
              <div>
                <p className="text-[10px] font-semibold" style={{ color: "hsl(var(--foreground))" }}>{h.action}</p>
                <p className="text-[10px]" style={{ color: "hsl(var(--muted-foreground))" }}>{h.date.toLocaleDateString("fr-FR")}</p>
              </div>
              <span className="text-[11px] font-bold" style={{ color: "hsl(var(--success))" }}>+{h.points}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
